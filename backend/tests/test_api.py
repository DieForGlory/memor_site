import csv
import io

from app.routers import admin as admin_router
from app.routers import public
from tests.conftest import ADMIN, HEADERS, png_bytes


def test_admin_requires_login(client):
    assert client.get("/api/admin/projects").status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_login_rejects_wrong_password(client):
    res = client.post("/api/auth/login", json={**ADMIN, "password": "nope-nope-nope"}, headers=HEADERS)
    assert res.status_code == 401


def test_mutations_need_admin_header(client):
    client.post("/api/auth/login", json=ADMIN, headers=HEADERS)
    # Без X-Memor-Admin изменяющие запросы отклоняются (защита от CSRF), чтение работает.
    assert client.get("/api/admin/projects").status_code == 200
    assert client.post("/api/admin/cities", json={"title": {"ru": "X"}}).status_code == 403


def test_project_with_photos_lifecycle(admin, media_dir):
    city = admin.post("/api/admin/cities", json={"title": {"ru": "Ташкент", "en": "Tashkent"}}).json()
    typ = admin.post("/api/admin/types", json={"title": {"ru": "Жильё"}}).json()
    service = admin.post("/api/admin/services", json={"title": {"ru": "Фасады"}, "icon": "facade"}).json()
    assert city["slug"] == "tashkent"  # slug из английского названия

    res = admin.post("/api/admin/projects", json={
        "title": {"ru": "ЖК Тест", "uz": "Test TJM", "en": "Test Residence"},
        "sector": "commercial", "type_id": typ["id"], "city_id": city["id"],
        "address": {"ru": "ул. Тестовая, 1"}, "lat": 41.3, "lng": 69.28, "service_ids": [service["id"]],
    })
    assert res.status_code == 201, res.text
    project = res.json()
    pid = project["id"]
    assert project["slug"] == "test-residence"

    files = [("files", ("a.png", png_bytes((10, 10, 10)), "image/png")),
             ("files", ("b.png", png_bytes((250, 250, 250)), "image/png")),
             ("files", ("bad.txt", b"not an image", "text/plain"))]
    res = admin.post(f"/api/admin/projects/{pid}/photos", files=files, data={"stage": "construction"})
    assert res.status_code == 201, res.text
    body = res.json()
    photos = body["project"]["photos"]
    assert len(photos) == 2 and len(body["errors"]) == 1
    assert body["project"]["cover"] == photos[0]["image"]  # первое фото стало обложкой
    assert all((media_dir / ph["image"]).is_file() and (media_dir / ph["thumb"]).is_file() for ph in photos)

    first, second = photos
    res = admin.post(f"/api/admin/projects/{pid}/photos/reorder", json={"ids": [second["id"], first["id"]]})
    assert [ph["id"] for ph in res.json()["photos"]] == [second["id"], first["id"]]

    res = admin.post(f"/api/admin/projects/{pid}/cover", json={"photo_id": second["id"]})
    assert res.json()["cover"] == second["image"]

    res = admin.patch(f"/api/admin/photos/{second['id']}", json={"stage": "finished", "caption": {"ru": "Фасад"}})
    assert res.json()["stage"] == "finished"

    # Публичная карточка и страница объекта
    card = next(p for p in admin.get("/api/public/projects?lang=en").json()["items"] if p["id"] == pid)
    assert card["title"] == "Test Residence" and card["city"]["title"] == "Tashkent"
    detail = admin.get("/api/public/projects/test-residence?lang=uz").json()
    assert detail["title"] == "Test TJM"
    # нет перевода — откат на русский; типограф ставит неразрывный пробел после «ул.»
    assert detail["address"] == "ул. Тестовая, 1"
    assert {s["key"] for s in detail["stages"]} == {"construction", "finished"}
    svc = admin.get(f"/api/public/services/{service['slug']}?lang=ru").json()
    assert [p["id"] for p in svc["projects"]] == [pid]

    # Удаление обложки переключает обложку на оставшееся фото и стирает файлы
    res = admin.delete(f"/api/admin/photos/{second['id']}")
    assert res.json()["cover"] == first["image"]
    assert not (media_dir / second["image"]).exists()

    assert admin.delete(f"/api/admin/projects/{pid}").status_code == 200
    assert not (media_dir / first["image"]).exists()
    assert admin.get("/api/public/projects/test-residence").status_code == 404


def test_unpublished_project_hidden(admin):
    admin.post("/api/admin/projects", json={"title": {"ru": "Скрытый"}, "slug": "hidden-one", "is_published": False})
    assert admin.get("/api/public/projects/hidden-one").status_code == 404
    assert all(p["slug"] != "hidden-one" for p in admin.get("/api/public/projects").json()["items"])


def test_project_requires_russian_title(admin):
    res = admin.post("/api/admin/projects", json={"title": {"en": "Only English"}})
    assert res.status_code == 422


def test_leads_flow(client, admin):
    public.lead_limiter._hits.clear()
    lead = {"kind": "tender", "name": "Иван", "phone": "+998 90 123 45 67", "message": "Тендер на школу"}
    res = client.post("/api/public/leads", json=lead)
    assert res.status_code == 201
    lead_id = res.json()["id"]

    # Бот заполнил скрытое поле: ответ «ок», но заявка не сохраняется
    assert client.post("/api/public/leads", json={**lead, "website": "spam"}).status_code == 201
    assert client.post("/api/public/leads", json={**lead, "phone": "abc"}).status_code == 422

    items = admin.get("/api/admin/leads").json()
    assert items["total"] == 1 and items["status_counts"] == {"new": 1}

    res = admin.patch(f"/api/admin/leads/{lead_id}", json={"status": "in_progress", "note": "Перезвонить"})
    assert res.json()["status"] == "in_progress"

    csv_text = admin.get("/api/admin/leads/export.csv").text
    assert "Иван" in csv_text and "Тендер" in csv_text

    for _ in range(4):
        client.post("/api/public/leads", json=lead)
    assert client.post("/api/public/leads", json=lead).status_code == 429


def test_integrations_token_is_masked(admin):
    base = {"telegram_enabled": True, "telegram_chat_id": "-1001", "email_enabled": False,
            "email_recipients": "", "webhook_enabled": False, "webhook_url": "",
            "yandex_metrika_id": "", "google_analytics_id": ""}
    token = "123456789:AAEexampleexampleexample"
    res = admin.put("/api/admin/settings/integrations", json={**base, "telegram_bot_token": token}).json()
    assert res["telegram_bot_token"] == "" and res["telegram_bot_token_masked"].startswith("1234")
    assert token not in admin.get("/api/admin/settings/integrations").text

    # Пустой токен при сохранении — старый остаётся
    res = admin.put("/api/admin/settings/integrations", json={**base, "telegram_bot_token": ""}).json()
    assert res["telegram_bot_token_masked"]
    res = admin.put("/api/admin/settings/integrations", json={**base, "clear_telegram_token": True}).json()
    assert res["telegram_bot_token_masked"] == ""


def test_users_cannot_delete_self(admin):
    me = admin.get("/api/auth/me").json()
    assert admin.delete(f"/api/admin/users/{me['id']}").status_code == 400
    res = admin.post("/api/admin/users", json={"email": "manager@test.uz", "password": "short"})
    assert res.status_code == 422
    res = admin.post("/api/admin/users", json={"email": "manager@test.uz", "name": "M", "password": "long-enough-pass"})
    assert res.status_code == 201


# ---------------------------------------------------------------- регрессии QA (участок E_site)


def test_csv_export_neutralises_formulas(client, admin, monkeypatch):
    """E_site-02: ячейки, начинающиеся с = + - @ (и таба/CR), не исполняются в Excel."""
    monkeypatch.setattr(public, "deliver_lead", lambda lead_id: None)
    public.lead_limiter._hits.clear()
    evil = {"name": '=HYPERLINK("http://evil","click")', "phone": "+998901113311", "company": "+SUM(1+1)",
            "message": "@cmd|' /C calc'!A0", "page_url": " -2+3"}
    res = client.post("/api/public/leads", json=evil)
    assert res.status_code == 201, res.text
    lead_id = res.json()["id"]
    plain = client.post("/api/public/leads", json={"name": "Пётр Обычный", "phone": "90 111 22 33",
                                                   "message": "Нужна смета, срок 2-3 недели"}).json()["id"]
    admin.patch(f"/api/admin/leads/{lead_id}", json={"note": "\t=1+1"})
    try:
        text = admin.get("/api/admin/leads/export.csv").text.lstrip("﻿")
        rows = {r[0]: r for r in csv.reader(io.StringIO(text), delimiter=";")}
        row = dict(zip(rows["№"], rows[str(lead_id)]))
        assert row["Имя"] == "'" + evil["name"]
        assert row["Телефон"] == "'+998901113311"
        assert row["Компания"] == "'+SUM(1+1)"
        assert row["Сообщение"] == "'" + evil["message"]
        assert row["Страница"] == "' -2+3"
        assert row["Комментарий"] == "'\t=1+1"
        # Обычный текст не меняется
        ok = dict(zip(rows["№"], rows[str(plain)]))
        assert (ok["Имя"], ok["Телефон"], ok["Сообщение"]) == ("Пётр Обычный", "90 111 22 33",
                                                               "Нужна смета, срок 2-3 недели")
    finally:
        admin.delete(f"/api/admin/leads/{lead_id}")
        admin.delete(f"/api/admin/leads/{plain}")
        public.lead_limiter._hits.clear()


def test_missing_references_give_422_not_500(admin):
    """E_site-03: несуществующие type_id / city_id / project_id — понятная ошибка вместо 500."""
    res = admin.post("/api/admin/projects", json={"title": {"ru": "x"}, "type_id": 987654})
    assert res.status_code == 422 and "Тип объекта не найден" in res.json()["detail"]
    res = admin.post("/api/admin/projects", json={"title": {"ru": "x"}, "city_id": 987654})
    assert res.status_code == 422 and "Город не найден" in res.json()["detail"]
    res = admin.post("/api/admin/hero", json={"project_id": 987654})
    assert res.status_code == 422 and "Объект для слайда не найден" in res.json()["detail"]
    # Число, которое не влезает в колонку базы, — тоже 422, а не переполнение
    assert admin.post("/api/admin/projects", json={"title": {"ru": "x"}, "type_id": 10**30}).status_code == 422
    assert admin.get(f"/api/admin/projects/{10**30}").status_code == 422

    # Существующие ссылки сохраняются как раньше
    typ = admin.post("/api/admin/types", json={"title": {"ru": "Склад"}}).json()
    city = admin.post("/api/admin/cities", json={"title": {"ru": "Самарканд"}}).json()
    res = admin.post("/api/admin/projects", json={"title": {"ru": "Склад-1"}, "type_id": typ["id"], "city_id": city["id"]})
    assert res.status_code == 201, res.text
    pid = res.json()["id"]
    res = admin.put(f"/api/admin/projects/{pid}", json={"title": {"ru": "Склад-1"}, "type_id": 987654})
    assert res.status_code == 422
    assert admin.get(f"/api/admin/projects/{pid}").json()["type_id"] == typ["id"]  # правка не применилась

    slide = admin.post("/api/admin/hero", json={"project_id": pid})
    assert slide.status_code == 201 and slide.json()["project_id"] == pid
    res = admin.put(f"/api/admin/hero/{slide.json()['id']}", json={"project_id": 987654})
    assert res.status_code == 422
    assert admin.put(f"/api/admin/hero/{slide.json()['id']}", json={"project_id": None}).status_code == 200

    admin.delete(f"/api/admin/hero/{slide.json()['id']}")
    admin.delete(f"/api/admin/projects/{pid}")


def test_integrity_error_safety_net(admin, monkeypatch):
    """Если проверку ссылки обойти, ошибка базы всё равно превращается в 400, а не в 500."""
    monkeypatch.setattr(admin_router, "require_ref", lambda *args, **kwargs: None)
    res = admin.post("/api/admin/projects", json={"title": {"ru": "x"}, "type_id": 987654})
    assert res.status_code == 400 and "связанная запись" in res.json()["detail"]


def test_photo_reorder_scoped_to_project(admin):
    """Замечание QA: reorder фото принимал id фото другого объекта."""
    a = admin.post("/api/admin/projects", json={"title": {"ru": "Объект A"}}).json()
    b = admin.post("/api/admin/projects", json={"title": {"ru": "Объект B"}}).json()
    def upload(pid, color):
        files = [("files", ("photo.png", png_bytes(color), "image/png"))]
        return admin.post(f"/api/admin/projects/{pid}/photos", files=files).json()["project"]["photos"]

    [pa] = upload(a["id"], (1, 2, 3))
    upload(b["id"], (4, 5, 6))
    before = {ph["id"]: ph["order"] for ph in upload(b["id"], (7, 8, 9))}
    assert len(before) == 2

    res = admin.post(f"/api/admin/projects/{a['id']}/photos/reorder", json={"ids": [*reversed(before), pa["id"]]})
    assert res.status_code == 200
    after = {ph["id"]: ph["order"] for ph in admin.get(f"/api/admin/projects/{b['id']}").json()["photos"]}
    assert after == before  # фото чужого объекта не тронуты
    assert res.json()["photos"][0]["order"] == 2  # своё фото получило позицию из списка

    admin.delete(f"/api/admin/projects/{a['id']}")
    admin.delete(f"/api/admin/projects/{b['id']}")


def test_site_settings_validation(admin):
    """Замечания QA: lat/lng без границ и ссылки соцсетей с любой схемой (javascript: в href)."""
    current = admin.get("/api/admin/settings/site").json()
    for bad in ({"lat": 9999}, {"lng": -500}, {"telegram_url": "javascript:alert(document.cookie)"},
                {"instagram_url": "data:text/html,<script>alert(1)</script>"}, {"youtube_url": "//evil.example"}):
        res = admin.put("/api/admin/settings/site", json={**current, **bad})
        assert res.status_code == 422, bad
    good = {"lat": 41.31, "lng": 69.28, "telegram_url": " https://t.me/memorgroup ", "facebook_url": "",
            "presentation_url": "/media/presentation.pdf"}
    res = admin.put("/api/admin/settings/site", json={**current, **good})
    assert res.status_code == 200, res.text
    assert res.json()["telegram_url"] == "https://t.me/memorgroup"
    assert admin.put("/api/admin/settings/site", json=current).status_code == 200
