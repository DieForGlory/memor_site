"""Регрессии QA R3 (участок H): поля ввода и бизнес-логика — форма заявки, формы админки, доставка, выгрузка."""
import csv
import io
from datetime import datetime, timezone

import httpx
import pytest

from app import outbound, site_settings
from app.db import SessionLocal
from app.models import City, Lead, ProjectType
from app.routers import admin as admin_router
from app.routers import public
from app.site_settings import IntegrationSettings

LEAD = {"kind": "other", "name": "Иван", "phone": "+998 90 123 45 67", "lang": "ru"}


@pytest.fixture()
def no_delivery(monkeypatch):
    monkeypatch.setattr(public, "deliver_lead", lambda lead_id: None)
    public.lead_limiter._hits.clear()
    yield
    public.lead_limiter._hits.clear()


def make_lead(**fields) -> int:
    with SessionLocal() as db:
        lead = Lead(**{"kind": "other", "name": "Тест", "phone": "+998 90 000 00 00", **fields})
        db.add(lead)
        db.commit()
        return lead.id


def drop_leads(*ids: int) -> None:
    with SessionLocal() as db:
        for lead_id in ids:
            lead = db.get(Lead, lead_id)
            if lead:
                db.delete(lead)
        db.commit()


# ---------------------------------------------------------------- форма заявки


@pytest.mark.parametrize("phone", [
    "+998 (90) 123-45-67", "90 123 45 67", "8 90 123 45 67", "+44 7911 123456", "998901234567", "+1.202.555.0147",
])
def test_lead_phone_formats_accepted_like_crm(client, no_delivery, phone):
    """H-01: номера, которые принимает CRM, принимает и сайт."""
    res = client.post("/api/public/leads", json={**LEAD, "phone": phone})
    assert res.status_code == 201, res.text
    drop_leads(res.json()["id"])


@pytest.mark.parametrize("phone", [
    "1234567",  # 7 цифр — раньше сайт принимал, CRM отклоняла «нужно от 9 до 15 цифр»
    "12345678",
    "+998 90 123 45 67 89 01 23",  # 19 цифр
    "тел 90 123 45 67 доб",  # буквы
    "٩٠١٢٣٤٥٦٧",  # арабские цифры: в CRM ушёл бы пустой номер
    "+998 90 123 45 67; 91 000 00 00",
])
def test_lead_phone_rejected_when_crm_would_reject(client, no_delivery, phone):
    """H-01: сайт не отвечает «Заявка отправлена» на номер, который CRM не примет."""
    res = client.post("/api/public/leads", json={**LEAD, "phone": phone})
    assert res.status_code == 422, res.text
    [error] = res.json()["detail"]
    assert error["loc"] == ["body", "phone"] and "от 9 до 15 цифр" in error["msg"]


def test_lead_phone_fullwidth_digits_normalized(client, no_delivery):
    res = client.post("/api/public/leads", json={**LEAD, "phone": "＋９９８ ９０ １２３ ４５ ６７"})
    assert res.status_code == 201, res.text
    with SessionLocal() as db:
        lead = db.get(Lead, res.json()["id"])
        assert lead.phone == "+998 90 123 45 67"
    drop_leads(res.json()["id"])


def test_lead_name_checked_after_trim(client, no_delivery):
    """H-09: имя из пробелов или из одной буквы с пробелом — не имя."""
    for name in ("   ", " A", "\tБ\n"):
        res = client.post("/api/public/leads", json={**LEAD, "name": name})
        assert res.status_code == 422, name
        assert res.json()["detail"][0]["loc"] == ["body", "name"]
    res = client.post("/api/public/leads", json={**LEAD, "name": "  Иван  "})
    assert res.status_code == 201
    with SessionLocal() as db:
        assert db.get(Lead, res.json()["id"]).name == "Иван"
    drop_leads(res.json()["id"])


def test_validation_messages_in_russian(client, admin, no_delivery):
    """H-10: тексты ошибок полей — по-русски, формат ответа прежний (список type/loc/msg)."""
    res = client.post("/api/public/leads", json={**LEAD, "email": "a@b"})
    assert res.status_code == 422
    [error] = res.json()["detail"]  # одна ошибка на поле, хотя вариантов у поля два: email или пусто
    assert error["loc"] == ["body", "email"] and error["msg"] == "Неверный адрес электронной почты"

    cases = [
        ({"year": 1989}, "year", "Должно быть не меньше 1990"),
        ({"area_m2": 12.5}, "area_m2", "Введите целое число"),
        ({"area_m2": "1 200"}, "area_m2", "Введите целое число, без пробелов и запятых"),
        ({"lat": "41,31"}, "lat", "Введите число; дробную часть отделяйте точкой"),
        ({"sector": "private"}, "sector", "Недопустимое значение"),
    ]
    for body, field, msg in cases:
        res = admin.post("/api/admin/projects", json={"title": {"ru": "Проверка"}, **body})
        assert res.status_code == 422, body
        [error] = res.json()["detail"]
        assert (error["loc"][-1], error["msg"]) == (field, msg)
    res = admin.post("/api/admin/projects", json={"title": {"ru": "  "}})
    assert res.json()["detail"][0]["msg"] == "Заполните русскую версию"
    res = admin.post("/api/admin/users", json={"email": "new@example.com", "password": "123456789"})
    assert res.json()["detail"][0]["msg"] == "Слишком коротко: нужно не меньше 10 симв."
    res = admin.patch("/api/admin/leads/1", json={"note": "x" * 5001})
    assert res.json()["detail"][0]["msg"] == "Слишком длинно: не больше 5000 симв."


# ---------------------------------------------------------------- формы админки


def test_integer_fields_fit_int4(admin):
    """H-08: число больше int4 в PostgreSQL не сохраняется (500) — отвечаем 422 до записи."""
    for body in ({"order": 3_000_000_000}, {"area_m2": 3_000_000_000}):
        res = admin.post("/api/admin/projects", json={"title": {"ru": "Большое число"}, **body})
        assert res.status_code == 422, body
    for path in ("/api/admin/cities", "/api/admin/services", "/api/admin/advantages"):
        res = admin.post(path, json={"title": {"ru": "Порядок"}, "order": -3_000_000_000})
        assert res.status_code == 422, path
    res = admin.post("/api/admin/projects", json={"title": {"ru": "Нормальная площадь"}, "area_m2": 2_147_483_647})
    assert res.status_code == 201
    admin.delete(f"/api/admin/projects/{res.json()['id']}")


@pytest.mark.parametrize(("path", "model"), [("/api/admin/cities", City), ("/api/admin/types", ProjectType)])
def test_taxonomy_slug_fits_column(admin, path, model):
    """H-07: slug справочников не длиннее колонки String(80), в том числе с суффиксом -2."""
    limit = model.__table__.c.slug.type.length
    title = "Многоэтажный жилой комплекс с подземным паркингом и коммерческими помещениями"
    first = admin.post(path, json={"title": {"ru": title}}).json()
    second = admin.post(path, json={"title": {"ru": title}}).json()
    translit = admin.post(path, json={"title": {"ru": "Щ"}, "slug": "щ" * 80}).json()
    try:
        assert len(first["slug"]) <= limit and first["slug"].startswith("mnogoetazhnyy-zhiloy")
        assert len(second["slug"]) <= limit and second["slug"].endswith("-2") and second["slug"] != first["slug"]
        assert len(translit["slug"]) <= limit and not translit["slug"].endswith("-")
        # Короткий slug не меняется
        short = admin.post(path, json={"title": {"ru": "Нукус"}, "slug": "nukus"}).json()
        assert short["slug"] == "nukus"
        admin.delete(f"{path}/{short['id']}")
    finally:
        for item in (first, second, translit):
            admin.delete(f"{path}/{item['id']}")


def test_site_settings_numbers_and_email(admin):
    """H-12: год основания 0, отрицательные счётчики и кривой email не сохраняются."""
    current = admin.get("/api/admin/settings/site").json()
    try:
        for bad in ({"founded_year": 0}, {"founded_year": -5}, {"companies_count": -3}, {"employees_count": -1},
                    {"email": "not-an-email"}):
            res = admin.put("/api/admin/settings/site", json={**current, **bad})
            assert res.status_code == 422, bad
        res = admin.put("/api/admin/settings/site", json={**current, "founded_year": 1996, "email": "", "companies_count": 0})
        assert res.status_code == 200, res.text
        res = admin.put("/api/admin/settings/site", json={**current, "email": "info@example.com"})
        assert res.status_code == 200 and res.json()["email"] == "info@example.com"
    finally:
        admin.put("/api/admin/settings/site", json=current)


def test_integrations_analytics_and_recipients_checked(admin):
    """H-13: ID счётчиков и получатели почты проверяются при сохранении, а не молча игнорируются."""
    try:
        for bad in ({"yandex_metrika_id": "abc-123"}, {"google_analytics_id": "UA-12345-1"},
                    {"email_recipients": "sales@memor, директор"}):
            res = admin.put("/api/admin/settings/integrations", json=bad)
            assert res.status_code == 422, bad
        res = admin.put("/api/admin/settings/integrations", json={
            "yandex_metrika_id": " 98765432 ", "google_analytics_id": "g-abc1234xyz",
            "email_recipients": " sales@example.com ,, director@example.com ",
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["yandex_metrika_id"] == "98765432" and data["google_analytics_id"] == "G-ABC1234XYZ"
        assert data["email_recipients"] == "sales@example.com, director@example.com"
        analytics = admin.get("/api/public/site").json()["analytics"]
        assert analytics == {"yandex_metrika_id": "98765432", "google_analytics_id": "G-ABC1234XYZ"}
    finally:
        with SessionLocal() as db:
            site_settings.save(db, "integrations", IntegrationSettings())


# ---------------------------------------------------------------- доставка заявок


class FakeChannels:
    """Сетевой шаг outbound: CRM и вебхук отвечают заданными кодами, запросы запоминаются."""

    def __init__(self, crm=201, hook=200):
        self.crm, self.hook = crm, hook
        self.calls: list[str] = []
        self.inquiry = 500

    def __call__(self, method, url, json=None, headers=None, timeout=None):
        self.calls.append(url)
        request = httpx.Request(method, url)
        if url.startswith("https://crm.test"):
            self.inquiry += 1
            body = {"status": "success", "inquiry_id": self.inquiry, "deal_id": 77} if self.crm < 300 else {}
            return httpx.Response(self.crm, json=body, request=request)
        return httpx.Response(self.hook, json={}, request=request)


@pytest.fixture()
def two_channels(admin, monkeypatch):
    fake = FakeChannels()
    monkeypatch.setattr(outbound, "_send", fake)
    res = admin.put("/api/admin/settings/integrations", json={
        "crm_enabled": True, "crm_url": "https://crm.test", "crm_api_key": "partner-key-r3-1234567890",
        "webhook_enabled": True, "webhook_url": "https://hook.test/lead",
    })
    assert res.status_code == 200, res.text
    yield fake
    with SessionLocal() as db:
        site_settings.save(db, "integrations", IntegrationSettings())


def test_resend_retries_only_failed_channels(admin, two_channels):
    """H-02: повтор не шлёт заявку туда, где она уже принята (второе обращение в CRM), и не затирает
    результат удачной доставки."""
    fake = two_channels
    lead_id = make_lead(delivery={
        "crm": {"ok": True, "detail": "Обращение №3636, сделка №3628 в CRM"},
        "webhook": {"ok": False, "detail": "Вебхук ответил 500"},
    })
    try:
        res = admin.post(f"/api/admin/leads/{lead_id}/resend")
        assert res.status_code == 200, res.text
        assert fake.calls == ["https://hook.test/lead"]  # в CRM повторно не ходили
        delivery = res.json()["delivery"]
        assert delivery["crm"] == {"ok": True, "detail": "Обращение №3636, сделка №3628 в CRM"}
        assert delivery["webhook"]["ok"] is True

        # Всё доставлено — повторять нечего
        res = admin.post(f"/api/admin/leads/{lead_id}/resend")
        assert res.status_code == 409 and "уже доставлена" in res.json()["detail"]
        assert len(fake.calls) == 1

        # Недоставленная в CRM заявка уходит туда при повторе; ошибка повтора видна в статусе
        failed_id = make_lead(delivery={"crm": {"ok": False, "detail": "CRM временно недоступна (ошибка 500)"}})
        fake.crm = 503
        res = admin.post(f"/api/admin/leads/{failed_id}/resend").json()["delivery"]
        assert res["crm"]["ok"] is False and res["webhook"]["ok"] is True  # вебхук включили позже — тоже ушёл
        fake.crm = 201
        res = admin.post(f"/api/admin/leads/{failed_id}/resend").json()["delivery"]
        assert res["crm"] == {"ok": True, "detail": f"Обращение №{fake.inquiry}, сделка №77 в CRM"}
        drop_leads(failed_id)
    finally:
        drop_leads(lead_id)


def test_resend_without_channels(admin):
    with SessionLocal() as db:
        site_settings.save(db, "integrations", IntegrationSettings())
    lead_id = make_lead(delivery={"crm": {"ok": True, "detail": "Обращение №1 в CRM"}})
    try:
        res = admin.post(f"/api/admin/leads/{lead_id}/resend")
        assert res.status_code == 400 and "Нет включённых каналов" in res.json()["detail"]
        # Прошлый результат доставки не стёрт
        assert admin.get(f"/api/admin/leads/{lead_id}").json()["delivery"]["crm"]["ok"] is True
    finally:
        drop_leads(lead_id)


def test_dashboard_warns_about_undelivered_leads(admin):
    """H-03: заявка, не дошедшая до CRM, видна на дашборде, а не только красным значком в списке."""
    def warning():
        return next((w for w in admin.get("/api/admin/dashboard").json()["warnings"]
                     if w["text"].startswith("Не доставлены")), None)

    def count():
        w = warning()
        return int(w["text"].split(": ")[1].split(" ")[0]) if w else 0

    base = count()  # недоставленные заявки других тестов, если остались
    ok_id = make_lead(delivery={"crm": {"ok": True, "detail": "Обращение №5 в CRM"}})
    spam_id = make_lead(status="spam", delivery={"crm": {"ok": False, "detail": "ошибка"}})
    done_id = make_lead(status="done", delivery={"crm": {"ok": False, "detail": "ошибка"}})
    try:
        assert count() == base  # доставленные, спам и закрытые не считаются
        bad_id = make_lead(delivery={"crm": {"ok": False, "detail": "CRM временно недоступна (ошибка 500)"}})
        w = warning()
        assert w["level"] == "error" and count() == base + 1
        if base == 0:
            assert w["link"] == f"/admin/leads?open={bad_id}"
        bad2 = make_lead(delivery={"crm": {"ok": True, "detail": "ok"}, "webhook": {"ok": False, "detail": "x"}})
        assert count() == base + 2 and warning()["link"] == "/admin/leads"
        drop_leads(bad_id, bad2)
    finally:
        drop_leads(ok_id, spam_id, done_id)


# ---------------------------------------------------------------- список и выгрузка


def test_leads_csv_has_complex_status_and_local_time(admin):
    """H-06, H-14: в выгрузке есть жилой комплекс, статус по-русски, время — ташкентское."""
    lead_id = make_lead(kind="apartment", name="Покупатель", crm_project_id=7, crm_project_name="ЖК Ромашка",
                        status="in_progress", created_at=datetime(2026, 11, 17, 15, 26, tzinfo=timezone.utc))
    try:
        text = admin.get("/api/admin/leads/export.csv").text.lstrip("﻿")
        rows = {r[0]: r for r in csv.reader(io.StringIO(text), delimiter=";")}
        row = dict(zip(rows["№"], rows[str(lead_id)]))
        assert row["Жилой комплекс"] == "ЖК Ромашка"
        assert row["Статус"] == "В работе" and row["Тип"] == "Покупка квартиры"
        assert row["Дата (Ташкент)"] == "17.11.2026 20:26"
        # В админке время отдаётся с часовым поясом — браузер переведёт его в местное сам
        created = admin.get(f"/api/admin/leads/{lead_id}").json()["created_at"]
        assert datetime.fromisoformat(created) == datetime(2026, 11, 17, 15, 26, tzinfo=timezone.utc)
    finally:
        drop_leads(lead_id)


def test_leads_search_by_phone_digits_and_literal_wildcards(admin):
    """H-11: поиск по номеру в другом написании; % и _ ищутся буквально."""
    a = make_lead(name="Номер со скобками", phone="+998 (99) 929-18-80")
    b = make_lead(name="Скидка 50% и под_чёркивание", phone="+998 90 111 11 11")
    try:
        def found(q):
            return {x["id"] for x in admin.get("/api/admin/leads", params={"q": q, "per_page": 200}).json()["items"]}

        for q in ("998999291880", "+998999291880", "99 929 18 80", "929-18-80", "(99) 929"):
            assert a in found(q), q
        assert a not in found("998999291881")
        assert found("50%") == {b} and found("под_") == {b}
        assert a not in found("_") and a not in found("%")
        csv_text = admin.get("/api/admin/leads/export.csv", params={"q": "998999291880"}).text
        assert "Номер со скобками" in csv_text and "Скидка" not in csv_text
    finally:
        drop_leads(a, b)
