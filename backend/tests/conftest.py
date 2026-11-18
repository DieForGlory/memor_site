"""Тесты работают на временной базе и временной папке media — рабочие данные не трогаются.
В сеть и DNS тесты не ходят: резолвер и сетевой слой исходящих запросов (app/outbound.py) подменены."""
import io
import os
import socket
import sys
import tempfile
from pathlib import Path

import httpcore
import pytest

TMP = Path(tempfile.mkdtemp(prefix="memor-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(TMP / 'test.db').as_posix()}"
os.environ["MEDIA_DIR"] = str(TMP / "media")
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"
os.environ["ADMIN_PASSWORD"] = ""
# Сетевые настройки — значения по умолчанию, что бы ни стояло в backend/.env
os.environ["TRUSTED_PROXIES"] = "127.0.0.1,::1"
os.environ["INTEGRATIONS_ALLOW_HTTP"] = "false"
os.environ["INTEGRATIONS_ALLOWED_HOSTS"] = ""
os.environ["COOKIE_SECURE"] = "false"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from app import models, outbound  # noqa: E402,F401
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
from app.routers.auth import login_limiter  # noqa: E402
from app.security import hash_password  # noqa: E402

ADMIN = {"email": "admin@test.uz", "password": "correct-horse-battery"}
HEADERS = {"X-Memor-Admin": "1"}

PUBLIC_TEST_IP = "93.184.216.34"  # публичный адрес, под которым в тестах «живут» хосты *.test


def fake_resolve(host: str, port: int) -> list[str]:
    """DNS для тестов: *.test — публичный адрес, localhost — loopback, остальное «не найдено»."""
    if host == "localhost":
        return ["127.0.0.1", "::1"]
    if host.endswith(".test"):
        return [PUBLIC_TEST_IP]
    raise socket.gaierror(socket.EAI_NONAME, "not found")


class NoNetwork(httpcore.NetworkBackend):
    """Сетевой слой outbound в тестах: настоящих соединений нет."""

    def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        raise AssertionError(f"Тест пытался соединиться с {host}:{port}")

    def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise AssertionError("Тест пытался открыть unix-сокет")


@pytest.fixture(autouse=True)
def no_real_network(monkeypatch):
    monkeypatch.setattr(outbound, "_resolve", fake_resolve)
    monkeypatch.setattr(outbound, "_inner_backend", NoNetwork)


@pytest.fixture(scope="session", autouse=True)
def database():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(User(email=ADMIN["email"], name="Test", password_hash=hash_password(ADMIN["password"])))
        db.commit()
    yield
    engine.dispose()


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def admin(client):
    # Все тесты входят с одного адреса — сбрасываем лимит попыток входа, иначе он кончится посреди прогона.
    login_limiter._hits.clear()
    res = client.post("/api/auth/login", json=ADMIN, headers=HEADERS)
    assert res.status_code == 200, res.text
    client.headers.update(HEADERS)
    return client


def png_bytes(color=(200, 80, 40), size=(640, 480)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture()
def media_dir() -> Path:
    return TMP / "media"
