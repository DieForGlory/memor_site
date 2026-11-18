"""Канал «CRM MEMOR»: запросы к CRM подменяются, в сеть тесты не ходят."""
import httpx
import pytest

from app import outbound, site_settings
from app.db import SessionLocal
from app.integrations import check_crm, crm_body, normalize_phone, run_channel
from app.routers import public
from app.site_settings import IntegrationSettings

API_KEY = "partner-key-1234567890abcdef"
CFG = IntegrationSettings(crm_enabled=True, crm_url="https://crm.test/", crm_api_key=API_KEY)

SAMPLE = {
    "id": 42,
    "kind": "tender",
    "kind_label": "Тендер",
    "name": "Иван Петров",
    "phone": "+998 97 425-77-77",
    "email": "ivan@example.uz",
    "company": "ООО «Строй»",
    "message": "Нужен расчёт фасада",
    "project": "ЖК Тест",
    "service": "",
    "page_url": "https://memor.uz/ru/projects/test",
    "lang": "ru",
    "created_at": "2026-11-17T10:00:00+00:00",
}


class FakeCRM:
    """Подмена сетевого шага outbound (после проверки адреса): запоминает запросы и отвечает заданным кодом."""

    def __init__(self, status: int = 201, body=None, error: Exception | None = None):
        self.status, self.body, self.error = status, body, error
        self.calls: list[dict] = []

    def __call__(self, method, url, json=None, headers=None, timeout=None):
        self.calls.append({"method": method, "url": url, "json": json, "headers": headers})
        if self.error:
            raise self.error
        request = httpx.Request(method, url)
        if isinstance(self.body, str):
            return httpx.Response(self.status, text=self.body, request=request)
        return httpx.Response(self.status, json=self.body, request=request)


@pytest.fixture()
def fake_crm(monkeypatch):
    def install(*args, **kwargs) -> FakeCRM:
        fake = FakeCRM(*args, **kwargs)
        monkeypatch.setattr(outbound, "_send", fake)
        return fake
    return install


@pytest.fixture()
def crm_enabled(admin):
    res = admin.put("/api/admin/settings/integrations",
                    json={"crm_enabled": True, "crm_url": "https://crm.test/", "crm_api_key": API_KEY})
    assert res.status_code == 200, res.text
    yield res.json()
    # Возвращаем настройки по умолчанию, чтобы не влиять на другие тесты
    admin.put("/api/admin/settings/integrations", json={"clear_crm_api_key": True, "clear_telegram_token": True})


def test_phone_normalization():
    assert normalize_phone("+998 97 425-77-77") == "+998974257777"
    assert normalize_phone(" +998 (90) 123 45 67 ") == "+998901234567"
    assert normalize_phone("998 97 425 77 77") == "998974257777"
    assert normalize_phone("+998 97 425-77-77 доб. ١٢") == "+998974257777"  # не-ASCII цифры отбрасываются


def test_crm_url_trailing_slash_stripped():
    assert CFG.crm_url == "https://crm.test"
    assert IntegrationSettings(crm_url="  https://crm.test///  ").crm_url == "https://crm.test"


def test_crm_body_mapping():
    assert crm_body(SAMPLE) == {
        "phone_number": "+998974257777",
        "full_name": "Иван Петров",
        "notes": "Заявка с сайта: №42\nТип: Тендер\nКомпания: ООО «Строй»\nEmail: ivan@example.uz\n"
                 "Объект на сайте: ЖК Тест\nСообщение: Нужен расчёт фасада\n"
                 "Страница: https://memor.uz/ru/projects/test",
        "utm_source": "site",
        "utm_medium": "form",
        "utm_campaign": "tender",
        "language": "ru",
    }
    # Английского в CRM нет — язык не передаём; пустые строки в комментарий не попадают
    body = crm_body({**SAMPLE, "lang": "en", "company": "", "email": "", "project": "", "message": ""})
    assert "language" not in body
    assert body["notes"] == "Заявка с сайта: №42\nТип: Тендер\nСтраница: https://memor.uz/ru/projects/test"
    assert crm_body({**SAMPLE, "lang": "uz"})["language"] == "uz"
    # Объект CRM передаётся, только если он известен
    assert "project_id" not in crm_body(SAMPLE)
    assert crm_body({**SAMPLE, "crm_project_id": 7})["project_id"] == 7


def test_crm_success(fake_crm):
    fake = fake_crm(201, {"status": "success", "inquiry_id": 15, "deal_id": 9})
    res = run_channel("crm", CFG, SAMPLE)
    assert res == {"ok": True, "detail": "Обращение №15, сделка №9 в CRM"}
    (call,) = fake.calls
    assert call["url"] == "https://crm.test/api/public/applications/"
    assert call["headers"] == {"X-API-Key": API_KEY}
    assert call["json"] == crm_body(SAMPLE)


@pytest.mark.parametrize(("status", "body", "expected"), [
    (401, {"detail": "Недействительный API-ключ"}, "CRM не приняла API-ключ: Недействительный API-ключ"),
    (403, {"detail": "API-ключ не имеет разрешения на действие: CREATE_APPLICATION"},
     "CRM отказала в доступе: API-ключ не имеет разрешения на действие: CREATE_APPLICATION"),
    (403, {"error": "API-ключ не привязан ни к одной компании — заявку принять некуда."},
     "CRM отказала в доступе: API-ключ не привязан ни к одной компании"),
    (400, {"phone_number": ["Номер телефона должен содержать только цифры и знак '+'"]},
     "CRM отклонила данные заявки: телефон: Номер телефона должен содержать только цифры"),
    (400, {"error": "Укажите номер телефона клиента."}, "CRM отклонила данные заявки: Укажите номер телефона"),
    (502, "<html>Bad Gateway</html>", "CRM временно недоступна (ошибка 502)"),
    (404, "<html>Not Found</html>", "По адресу CRM не найден приём заявок (404)"),
])
def test_crm_error_mapping(fake_crm, status, body, expected):
    fake_crm(status, body)
    res = run_channel("crm", CFG, SAMPLE)
    assert res["ok"] is False
    assert res["detail"].startswith(expected), res["detail"]
    assert API_KEY not in res["detail"]


def test_crm_network_errors(fake_crm):
    fake_crm(error=httpx.ConnectError("connection refused"))
    assert run_channel("crm", CFG, SAMPLE)["detail"].startswith("Не удалось связаться с CRM")
    fake_crm(error=httpx.ReadTimeout("timed out"))
    assert run_channel("crm", CFG, SAMPLE)["detail"].startswith("CRM не ответила вовремя")


def test_crm_not_configured(fake_crm):
    fake = fake_crm(201, {})
    res = run_channel("crm", IntegrationSettings(crm_url="crm.test", crm_api_key=API_KEY), SAMPLE)
    assert res["ok"] is False and "адрес CRM" in res["detail"]
    res = run_channel("crm", IntegrationSettings(crm_url="https://crm.test"), SAMPLE)
    assert res == {"ok": False, "detail": "Не задан API-ключ CRM"}
    assert fake.calls == []


def test_check_crm_uses_empty_body(fake_crm):
    fake = fake_crm(400, {"phone_number": ["Обязательное поле."]})
    assert check_crm(CFG) == {"ok": True, "detail": "Ключ принят, CRM на связи"}
    assert fake.calls[0]["json"] == {}  # тестовая проверка не создаёт клиента в CRM

    fake_crm(401, {"detail": "Недействительный API-ключ"})
    assert check_crm(CFG) == {"ok": False, "detail": "CRM не приняла API-ключ: Недействительный API-ключ"}
    fake_crm(403, {"detail": "Доступ с IP-адреса 10.0.0.1 запрещён для данного ключа"})
    res = check_crm(CFG)
    assert res["ok"] is False and "10.0.0.1" in res["detail"]


def test_test_endpoint_checks_crm_key(admin, crm_enabled, fake_crm):
    fake = fake_crm(400, {"phone_number": ["Обязательное поле."]})
    res = admin.post("/api/admin/settings/integrations/test", json={"channel": "crm"}).json()
    assert res == {"ok": True, "detail": "Ключ принят, CRM на связи"}
    (call,) = fake.calls
    assert call["json"] == {} and call["headers"] == {"X-API-Key": API_KEY}

    fake_crm(403, {"detail": "API-ключ не имеет разрешения на действие: CREATE_APPLICATION"})
    res = admin.post("/api/admin/settings/integrations/test", json={"channel": "crm"}).json()
    assert res["ok"] is False and "CREATE_APPLICATION" in res["detail"]


def test_crm_key_is_masked(admin, crm_enabled):
    assert crm_enabled["crm_api_key"] == "" and crm_enabled["crm_api_key_masked"].startswith("part")
    assert crm_enabled["crm_url"] == "https://crm.test"
    assert API_KEY not in admin.get("/api/admin/settings/integrations").text

    base = {"crm_enabled": True, "crm_url": "https://crm.test"}
    # Пустое поле или возвращённая маска — сохранённый ключ не меняется
    for sent in ("", crm_enabled["crm_api_key_masked"]):
        res = admin.put("/api/admin/settings/integrations", json={**base, "crm_api_key": sent}).json()
        assert res["crm_api_key_masked"] == crm_enabled["crm_api_key_masked"]
    with SessionLocal() as db:
        assert site_settings.load(db, "integrations").crm_api_key == API_KEY

    res = admin.put("/api/admin/settings/integrations", json={**base, "crm_api_key": " new-key-0987654321zz "}).json()
    assert res["crm_api_key_masked"] == "new-…21zz"
    res = admin.put("/api/admin/settings/integrations", json={**base, "clear_crm_api_key": True}).json()
    assert res["crm_api_key_masked"] == ""


def test_lead_delivered_to_crm(client, admin, crm_enabled, fake_crm):
    fake = fake_crm(201, {"status": "success", "inquiry_id": 101, "deal_id": 202})
    public.lead_limiter._hits.clear()
    lead = {"kind": "subcontract", "name": "John", "phone": "+998 97 425-77-77", "lang": "en",
            "message": "Supply of glass"}
    res = client.post("/api/public/leads", json=lead)
    assert res.status_code == 201, res.text
    lead_id = res.json()["id"]
    try:
        (call,) = fake.calls
        body = call["json"]
        assert body["phone_number"] == "+998974257777" and body["full_name"] == "John"
        assert (body["utm_source"], body["utm_medium"], body["utm_campaign"]) == ("site", "form", "subcontract")
        assert "language" not in body
        assert "Сообщение: Supply of glass" in body["notes"]

        delivery = admin.get(f"/api/admin/leads/{lead_id}").json()["delivery"]
        assert delivery == {"crm": {"ok": True, "detail": "Обращение №101, сделка №202 в CRM"}}

        # Доставленную заявку повтор из админки в CRM не шлёт: иначе там второе обращение (R3, H-02).
        # Повтор недоставленной — tests/test_r3_inputs.py::test_resend_retries_only_failed_channels
        fake = fake_crm(401, {"detail": "Недействительный API-ключ"})
        res = admin.post(f"/api/admin/leads/{lead_id}/resend")
        assert res.status_code == 409 and fake.calls == []
        assert admin.get(f"/api/admin/leads/{lead_id}").json()["delivery"]["crm"]["ok"] is True
    finally:
        admin.delete(f"/api/admin/leads/{lead_id}")
