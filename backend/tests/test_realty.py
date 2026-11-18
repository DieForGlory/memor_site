"""Раздел «Квартиры»: каталог из CRM. Запросы к CRM подменяются, в сеть тесты не ходят."""
import httpx
import pytest

from app import crm_catalog, integrations, outbound, site_settings
from app.db import SessionLocal
from app.models import Lead
from app.routers import public
from app.site_settings import IntegrationSettings

API_KEY = "partner-key-catalog-1234567890"
CFG = IntegrationSettings(crm_catalog_enabled=True, crm_url="https://crm.test", crm_api_key=API_KEY)

PROJECTS = {"count": 1, "next": None, "results": [{"id": 7, "name": "ЖК Ромашка", "address": "Ташкент, Чиланзар", "logo": None}]}
DETAIL = {
    "id": 7, "name": "ЖК Ромашка", "address": "Ташкент, Чиланзар", "description": "Дом у парка.",
    "usp_1": "Парк рядом", "usp_2": "", "usp_3": None, "logo": None,
    "gallery_images": [{"id": 1, "image": "https://crm.test/media/a.jpg", "caption": ""}],
    "buildings": [{"id": 3, "name": "Блок А", "floors_count": 9, "status": "FOR_SALE",
                   "gallery_images": [{"id": 2, "image": "https://crm.test/media/b.jpg", "caption": ""}]}],
}


def unit(uid, status, rooms, area, price=None, floor=2, layout=None, ptype="APARTMENT"):
    return {
        "id": uid, "project": 7, "project_name": "ЖК Ромашка", "building": 3, "building_name": "Блок А",
        "unit_number": str(uid), "property_type": ptype, "status": status, "rooms": rooms, "area": str(area),
        "floor": floor, "floors_total": 9, "finishing_type": "ROUGH", "price": price, "price_per_sqm": None,
        "price_currency": "UZS", "layout": {"name": layout, "image": f"https://crm.test/media/{layout}.png"} if layout else None,
    }


UNITS = {"count": 5, "page": 1, "pages": 1, "results": [
    unit(1, "free", 1, "36.50", "430000000.00", layout="L1"),
    unit(2, "free", 1, "34.00", "401000000.00"),
    unit(3, "free", 2, "58.20", "690000000.00", floor=7),
    unit(4, "booked", 2, "58.20"),
    unit(5, "sold", 3, "80.00"),
]}


class FakeCatalog:
    """Подмена сетевого шага outbound (после проверки адреса): отвечает по пути, считает запросы;
    fail=True — CRM лежит."""

    def __init__(self):
        self.calls: list[str] = []
        self.fail = False
        self.status = 200

    def __call__(self, method, url, params=None, headers=None, timeout=None):
        assert method == "GET"
        self.calls.append(url)
        assert headers["X-API-Key"] == API_KEY
        if self.fail:
            raise httpx.ConnectError("down")
        request = httpx.Request("GET", url)
        if self.status != 200:
            return httpx.Response(self.status, json={"detail": "nope"}, request=request)
        if url.endswith("/api/public/projects/"):
            body = PROJECTS
        elif url.endswith("/api/public/projects/7/"):
            body = DETAIL
        elif url.endswith("/api/public/v1/properties/"):
            body = UNITS
        else:
            return httpx.Response(404, json={}, request=request)
        return httpx.Response(200, json=body, request=request)


@pytest.fixture()
def fake(monkeypatch):
    crm_catalog.reset_cache()
    f = FakeCatalog()
    monkeypatch.setattr(outbound, "_send", f)
    yield f
    crm_catalog.reset_cache()


@pytest.fixture()
def catalog_on(admin):
    res = admin.put("/api/admin/settings/integrations",
                    json={"crm_catalog_enabled": True, "crm_url": "https://crm.test/", "crm_api_key": API_KEY})
    assert res.status_code == 200, res.text
    yield
    with SessionLocal() as db:
        site_settings.save(db, "integrations", IntegrationSettings())
    crm_catalog.reset_cache()


def test_catalog_built_from_crm(fake):
    data = crm_catalog.get_catalog(CFG)
    [p] = data["projects"]
    assert p["name"] == "ЖК Ромашка" and p["usp"] == ["Парк рядом"]
    # Фото проекта, затем фото домов
    assert p["images"] == ["https://crm.test/media/a.jpg", "https://crm.test/media/b.jpg"]
    assert p["stats"] == {"free": 3, "booked": 1, "sold": 1, "total": 5, "price_from": 401000000.0,
                          "area_min": 34.0, "area_max": 58.2, "floors_max": 9, "rooms": [1, 2]}
    # В списке — только свободные, проданные и забронированные не показываются
    assert [u["id"] for u in p["units"]] == [2, 1, 3]
    # Типы квартир по комнатности; картинка — первая найденная планировка
    assert [(l["rooms"], l["count"], l["price_from"]) for l in p["layouts"]] == [(1, 2, 401000000.0), (2, 1, 690000000.0)]
    assert p["layouts"][0]["image"] == "https://crm.test/media/L1.png"


def test_catalog_cached_and_stale_on_failure(fake):
    crm_catalog.get_catalog(CFG)
    calls = len(fake.calls)
    crm_catalog.get_catalog(CFG)
    assert len(fake.calls) == calls  # из кэша, без запросов к CRM
    # CRM упала после истечения срока — отдаём последний удачный снимок
    crm_catalog._cache["at"] = 0
    fake.fail = True
    assert crm_catalog.get_catalog(CFG)["projects"][0]["id"] == 7
    with pytest.raises(crm_catalog.CatalogError):
        crm_catalog.get_catalog(CFG, force=True)


def test_catalog_key_errors_are_readable(fake):
    fake.status = 403
    with pytest.raises(crm_catalog.CatalogError, match="VIEW_PROJECTS"):
        crm_catalog.get_catalog(CFG)


def test_public_realty_disabled_by_default(client, fake):
    assert client.get("/api/public/realty").json() == {"enabled": False, "available": False, "projects": []}
    assert client.get("/api/public/realty/7").status_code == 404
    assert client.get("/api/public/site").json()["realty_enabled"] is False
    assert fake.calls == []


def test_public_realty_list_and_detail(client, fake, catalog_on):
    data = client.get("/api/public/realty").json()
    assert data["enabled"] and data["available"]
    [card] = data["projects"]
    # В карточке списка нет квартир и описания — только сводка
    assert "units" not in card and card["layouts_count"] == 2 and card["cover"] == "https://crm.test/media/a.jpg"
    detail = client.get("/api/public/realty/7").json()
    assert len(detail["units"]) == 3 and detail["description"] == "Дом у парка."
    assert client.get("/api/public/realty/999").status_code == 404
    assert client.get("/api/public/site").json()["realty_enabled"] is True
    assert client.get("/api/public/sitemap").json()["realty"] == [7]


def test_public_realty_unavailable(client, fake, catalog_on):
    fake.fail = True
    assert client.get("/api/public/realty").json() == {"enabled": True, "available": False, "projects": []}


def test_lead_linked_to_complex(client, fake, catalog_on, monkeypatch):
    monkeypatch.setattr(public, "deliver_lead", lambda lead_id: None)
    public.lead_limiter._hits.clear()
    base = {"kind": "apartment", "name": "Покупатель", "phone": "+998 90 111 22 33", "lang": "ru"}
    res = client.post("/api/public/leads", json={**base, "crm_project_id": 7})
    assert res.status_code == 201, res.text
    # Комплекса нет в каталоге — id в CRM не уйдёт
    res2 = client.post("/api/public/leads", json={**base, "crm_project_id": 999})
    with SessionLocal() as db:
        lead = db.get(Lead, res.json()["id"])
        assert (lead.kind, lead.crm_project_id, lead.crm_project_name) == ("apartment", 7, "ЖК Ромашка")
        payload = integrations.lead_payload(lead)
        assert payload["kind_label"] == "Покупка квартиры"
        assert integrations.crm_body(payload)["project_id"] == 7
        assert "Жилой комплекс: ЖК Ромашка" in integrations.crm_body(payload)["notes"]
        other = db.get(Lead, res2.json()["id"])
        assert other.crm_project_id is None and other.crm_project_name == ""


def test_admin_catalog_check(admin, fake, catalog_on):
    res = admin.post("/api/admin/settings/integrations/catalog").json()
    assert res["ok"] and "комплексов — 1" in res["detail"] and "свободных квартир — 3" in res["detail"]
    fake.status = 401
    res = admin.post("/api/admin/settings/integrations/catalog").json()
    assert not res["ok"] and "ключ" in res["detail"]
