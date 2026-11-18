"""Регрессии по QA-находкам безопасности (участок E_site): SSRF интеграций, IP клиента за прокси,
защитные заголовки. В сеть и DNS тесты не ходят — см. conftest.no_real_network."""
import httpcore
import httpx
import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from app import crm_catalog, integrations, outbound, site_settings
from app.config import get_settings
from app.db import SessionLocal
from app.main import app
from app.models import Lead
from app.routers import auth, public
from app.security import client_ip
from app.site_settings import IntegrationSettings
from tests.conftest import ADMIN, HEADERS, PUBLIC_TEST_IP, fake_resolve


@pytest.fixture()
def resolver(monkeypatch):
    """Свой DNS для теста: {"host": ["ip", ...]}; остальное — как в conftest."""
    table: dict[str, list] = {}

    def resolve(host, port):
        if host in table:
            value = table[host]
            return value() if callable(value) else value
        return fake_resolve(host, port)

    monkeypatch.setattr(outbound, "_resolve", resolve)
    return table


class RecordingBackend(httpcore.MockBackend):
    """Вместо сети — готовый HTTP-ответ; запоминает, куда соединялись."""

    def __init__(self, buffer: list[bytes]):
        super().__init__(buffer)
        self.connects: list[tuple[str, int]] = []

    def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        self.connects.append((host, port))
        return super().connect_tcp(host, port, timeout, local_address, socket_options)


@pytest.fixture()
def wire(monkeypatch):
    def install(*lines: bytes) -> RecordingBackend:
        backend = RecordingBackend(list(lines))
        monkeypatch.setattr(outbound, "_inner_backend", lambda: backend)
        return backend
    return install


OK_RESPONSE = (b"HTTP/1.1 200 OK\r\n", b"Content-Type: application/json\r\n", b"Content-Length: 11\r\n", b"\r\n",
               b'{"ok":true}')


@pytest.fixture()
def integrations_reset():
    yield
    with SessionLocal() as db:
        site_settings.save(db, "integrations", IntegrationSettings())
    crm_catalog.reset_cache()


# ---------------------------------------------------------------- E_site-01: SSRF


@pytest.mark.parametrize("url", [
    "https://127.0.0.1:8001/api/health",
    "https://localhost/",
    "https://10.1.2.3/",
    "https://172.16.0.1/",
    "https://192.168.1.10/",
    "https://169.254.169.254/latest/meta-data/",  # метаданные облака
    "https://100.64.0.1/",  # CGNAT
    "https://0.0.0.0/",
    "https://224.0.0.1/",  # multicast
    "https://240.0.0.1/",  # зарезервированный
    "https://[::1]/",
    "https://[::ffff:127.0.0.1]/",
    "https://[fe80::1]/",
    "https://[fc00::1]/",
])
def test_internal_addresses_rejected(url):
    with pytest.raises(outbound.BlockedURL, match="внутренний или служебный"):
        outbound.check_url(url)


@pytest.mark.parametrize(("url", "message"), [
    ("http://hooks.test/in", "https://"),  # http — только при INTEGRATIONS_ALLOW_HTTP
    ("ftp://hooks.test/in", "https://"),
    ("hooks.test/in", "https://"),
    ("javascript:alert(1)", "https://"),
    ("https://nowhere.example/", "Не удалось найти сервер"),
])
def test_bad_scheme_and_unknown_host_rejected(url, message):
    with pytest.raises(outbound.BlockedURL, match=message):
        outbound.check_url(url)


def test_hostname_resolving_to_internal_rejected(resolver):
    resolver["intranet.test"] = ["10.0.0.5"]
    resolver["mixed.test"] = [PUBLIC_TEST_IP, "127.0.0.1"]  # хоть один адрес внутренний — нельзя
    for url in ("https://intranet.test/", "https://mixed.test/"):
        with pytest.raises(outbound.BlockedURL, match="внутренний"):
            outbound.check_url(url)


def test_public_https_allowed():
    assert outbound.check_url("https://hooks.test/in").host == "hooks.test"
    assert outbound.check_url(f"https://{PUBLIC_TEST_IP}:8443/x").port == 8443


def test_dev_settings_allow_http_and_listed_internal_hosts(monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "integrations_allow_http", True)
    outbound.check_url("http://hooks.test/in")
    with pytest.raises(outbound.BlockedURL, match="внутренний"):
        outbound.check_url("http://127.0.0.1:8100")
    # CRM на том же сервере — явное исключение в backend/.env
    monkeypatch.setattr(settings, "integrations_allowed_hosts", "127.0.0.1, localhost")
    outbound.check_url("http://127.0.0.1:8100")
    outbound.check_url("http://localhost:8100")
    with pytest.raises(outbound.BlockedURL):
        outbound.check_url("http://10.0.0.1:8100")  # остальные внутренние — по-прежнему нет


def test_request_connects_to_checked_ip(wire):
    backend = wire(*OK_RESPONSE)
    resp = outbound.post("https://hooks.test/in", json={"a": 1}, timeout=1)
    assert resp.status_code == 200 and resp.json() == {"ok": True}
    # Соединение — с проверенным IP, а не с именем (TLS при этом проверяет имя хоста)
    assert backend.connects == [(PUBLIC_TEST_IP, 443)]


def test_dns_rebinding_blocked_at_connect(resolver, wire):
    answers = iter([[PUBLIC_TEST_IP], ["127.0.0.1"]])
    resolver["rebind.test"] = lambda: next(answers)  # проверка видит публичный IP, соединение — уже loopback
    backend = wire(*OK_RESPONSE)
    with pytest.raises(outbound.BlockedURL, match="внутренний"):
        outbound.post("https://rebind.test/in", json={}, timeout=1)
    assert backend.connects == []


def test_redirects_not_followed(wire):
    backend = wire(b"HTTP/1.1 302 Found\r\n", b"Location: http://127.0.0.1:8001/api/health\r\n",
                   b"Content-Length: 0\r\n", b"\r\n")
    resp = outbound.get("https://hooks.test/in", timeout=1)
    assert resp.status_code == 302
    assert backend.connects == [(PUBLIC_TEST_IP, 443)]  # по Location никуда не ходили


def test_admin_cannot_save_internal_integration_urls(admin, integrations_reset):
    res = admin.put("/api/admin/settings/integrations",
                    json={"webhook_enabled": True, "webhook_url": "http://127.0.0.1:8001/api/health"})
    assert res.status_code == 422 and res.json()["detail"].startswith("URL вебхука:")
    res = admin.put("/api/admin/settings/integrations", json={"webhook_url": "https://169.254.169.254/latest/"})
    assert res.status_code == 422 and "внутренний" in res.json()["detail"]
    res = admin.put("/api/admin/settings/integrations",
                    json={"crm_enabled": True, "crm_url": "https://10.0.0.8", "crm_api_key": "k" * 20})
    assert res.status_code == 422 and res.json()["detail"].startswith("Адрес CRM:")
    with SessionLocal() as db:
        assert site_settings.load(db, "integrations").webhook_url == ""  # ничего не сохранилось

    res = admin.put("/api/admin/settings/integrations",
                    json={"webhook_enabled": True, "webhook_url": "https://hooks.test/in",
                          "crm_url": "https://crm.test", "crm_api_key": "k" * 20})
    assert res.status_code == 200, res.text
    assert res.json()["webhook_url"] == "https://hooks.test/in"


def test_saved_internal_urls_blocked_at_request_time(admin, client, integrations_reset, monkeypatch):
    # Адреса, сохранённые до исправления (или прямо в базе), — запрос всё равно не уходит
    with SessionLocal() as db:
        site_settings.save(db, "integrations", IntegrationSettings(
            webhook_enabled=True, webhook_url="https://127.0.0.1:8001/api/health",
            crm_enabled=True, crm_catalog_enabled=True, crm_url="https://192.168.0.10", crm_api_key="k" * 20))
    crm_catalog.reset_cache()

    res = admin.post("/api/admin/settings/integrations/test", json={"channel": "webhook"}).json()
    assert res["ok"] is False and "внутренний" in res["detail"] and "405" not in res["detail"]
    res = admin.post("/api/admin/settings/integrations/test", json={"channel": "crm"}).json()
    assert res["ok"] is False and res["detail"].startswith("Адрес CRM не принят")
    res = admin.post("/api/admin/settings/integrations/catalog").json()
    assert res["ok"] is False and res["detail"].startswith("Адрес CRM не принят")
    assert client.get("/api/public/realty").json()["available"] is False

    # Доставка заявки: каналы отмечены ошибкой, сеть не тронута (NoNetwork в conftest упал бы)
    public.lead_limiter._hits.clear()
    res = client.post("/api/public/leads", json={"name": "Иван", "phone": "+998 90 123 45 67"})
    assert res.status_code == 201
    delivery = admin.get(f"/api/admin/leads/{res.json()['id']}").json()["delivery"]
    assert delivery["webhook"]["ok"] is False and delivery["crm"]["ok"] is False
    admin.delete(f"/api/admin/leads/{res.json()['id']}")


def test_webhook_errors_do_not_leak_os_text(monkeypatch):
    cfg = IntegrationSettings(webhook_enabled=True, webhook_url="https://hooks.test/in")

    def refused(method, url, **kwargs):
        raise httpx.ConnectError("[WinError 10061] Подключение не установлено, т.к. конечный компьютер отверг запрос")

    monkeypatch.setattr(outbound, "_send", refused)
    res = integrations.run_channel("webhook", cfg, integrations.TEST_PAYLOAD)
    assert res == {"ok": False, "detail": "Не удалось связаться с вебхуком — проверьте адрес и доступность сервера"}

    # Telegram (адрес фиксированный, но текст ошибки ОС тоже не показываем)
    def telegram_down(*args, **kwargs):
        raise httpx.ConnectError("[Errno 11001] getaddrinfo failed")

    monkeypatch.setattr(integrations.httpx, "post", telegram_down)
    tg = IntegrationSettings(telegram_bot_token="123:abc", telegram_chat_id="-1")
    detail = integrations.run_channel("telegram", tg, integrations.TEST_PAYLOAD)["detail"]
    assert "Errno" not in detail and detail.startswith("Не удалось связаться")


def test_webhook_redirect_is_not_success(monkeypatch):
    def redirect(method, url, **kwargs):
        return httpx.Response(302, headers={"Location": "https://example.org/"}, request=httpx.Request(method, url))

    monkeypatch.setattr(outbound, "_send", redirect)
    cfg = IntegrationSettings(webhook_url="https://hooks.test/in")
    res = integrations.run_channel("webhook", cfg, integrations.TEST_PAYLOAD)
    assert res["ok"] is False and "перенаправляет" in res["detail"]


# ---------------------------------------------------------------- E_site-04: IP клиента и лимиты


def make_request(peer: str | None, xff: str | None = None) -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
    return Request({"type": "http", "method": "GET", "path": "/", "query_string": b"", "headers": headers,
                    "client": (peer, 1234) if peer else None})


@pytest.mark.parametrize(("trusted", "peer", "xff", "expected"), [
    # Соединение не от доверенного прокси — заголовок игнорируется
    ("127.0.0.1,::1", "198.51.100.9", "1.1.1.1", "198.51.100.9"),
    ("127.0.0.1,::1", "testclient", "1.1.1.1", "testclient"),
    # От доверенного прокси — последний недоверенный адрес справа; приписанное клиентом левее не в счёт
    ("127.0.0.1,::1", "127.0.0.1", "203.0.113.7", "203.0.113.7"),
    ("127.0.0.1,::1", "127.0.0.1", "6.6.6.6, 203.0.113.7", "203.0.113.7"),
    ("127.0.0.1,::1", "127.0.0.1", "6.6.6.6, 203.0.113.7, 127.0.0.1", "203.0.113.7"),
    ("127.0.0.1,::1", "::1", "203.0.113.7:5555", "203.0.113.7"),
    ("127.0.0.1,::1", "127.0.0.1", None, "127.0.0.1"),
    ("10.0.0.0/8", "10.1.1.1", "6.6.6.6, 203.0.113.7, 10.2.2.2", "203.0.113.7"),
    # Пустой список — X-Forwarded-For не читается совсем
    ("", "127.0.0.1", "203.0.113.7", "127.0.0.1"),
])
def test_client_ip_trusts_only_configured_proxies(monkeypatch, trusted, peer, xff, expected):
    monkeypatch.setattr(get_settings(), "trusted_proxies", trusted)
    assert client_ip(make_request(peer, xff)) == expected


@pytest.fixture()
def no_delivery(monkeypatch):
    monkeypatch.setattr(public, "deliver_lead", lambda lead_id: None)
    public.lead_limiter._hits.clear()
    yield
    public.lead_limiter._hits.clear()
    with SessionLocal() as db:
        db.query(Lead).filter(Lead.name == "XFF").delete()
        db.commit()


def test_lead_limit_not_bypassed_by_spoofed_xff(client, no_delivery):
    lead = {"name": "XFF", "phone": "+998 90 111 33 11"}
    codes = [client.post("/api/public/leads", json=lead, headers={"X-Forwarded-For": f"10.202.0.{i}"}).status_code
             for i in range(7)]
    assert codes == [201] * 5 + [429] * 2


def test_lead_limit_per_visitor_behind_trusted_proxy(no_delivery):
    proxy = TestClient(app, client=("127.0.0.1", 50000))  # запросы приходят от Next.js/nginx на этом сервере
    lead = {"name": "XFF", "phone": "+998 90 111 33 11"}
    res = proxy.post("/api/public/leads", json=lead, headers={"X-Forwarded-For": "203.0.113.7"})
    assert res.status_code == 201
    with SessionLocal() as db:
        assert db.get(Lead, res.json()["id"]).ip == "203.0.113.7"
    for _ in range(4):
        proxy.post("/api/public/leads", json=lead, headers={"X-Forwarded-For": "203.0.113.7"})
    # Подделка слева от адреса, который дописал прокси, не помогает
    spoofed = proxy.post("/api/public/leads", json=lead, headers={"X-Forwarded-For": "1.2.3.4, 203.0.113.7"})
    assert spoofed.status_code == 429
    # Другой посетитель за тем же прокси — свой лимит
    assert proxy.post("/api/public/leads", json=lead, headers={"X-Forwarded-For": "203.0.113.8"}).status_code == 201


def test_login_limit_not_bypassed_by_spoofed_xff(client):
    auth.login_limiter._hits.clear()
    try:
        for i in range(10):
            res = client.post("/api/auth/login", json={**ADMIN, "password": "wrong-password-1"},
                              headers={**HEADERS, "X-Forwarded-For": f"10.200.0.{i}"})
            assert res.status_code == 401
        res = client.post("/api/auth/login", json=ADMIN, headers={**HEADERS, "X-Forwarded-For": "10.201.0.1"})
        assert res.status_code == 429
    finally:
        auth.login_limiter._hits.clear()


# ---------------------------------------------------------------- E_site-05: защитные заголовки


def assert_security_headers(res):
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "frame-ancestors 'none'" in res.headers["content-security-policy"]


def test_security_headers_on_api_and_media(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "cookie_secure", False)
    for res in (client.get("/api/health"), client.get("/api/admin/projects"), client.get("/media/none.webp")):
        assert_security_headers(res)
        assert "strict-transport-security" not in res.headers  # по http HSTS не шлём


def test_media_webp_served_as_image(client, media_dir):
    # nosniff требует верный Content-Type: картинки из /media — image/webp, а не octet-stream
    (media_dir / "check").mkdir(parents=True, exist_ok=True)
    (media_dir / "check" / "pic.webp").write_bytes(b"RIFF\x00\x00\x00\x00WEBPVP8 ")
    res = client.get("/media/check/pic.webp")
    assert res.status_code == 200 and res.headers["content-type"] == "image/webp"
    assert_security_headers(res)


def test_hsts_only_over_https(monkeypatch):
    monkeypatch.setattr(get_settings(), "cookie_secure", False)
    res = TestClient(app, base_url="https://testserver").get("/api/health")
    assert_security_headers(res)
    assert res.headers["strict-transport-security"].startswith("max-age=")
