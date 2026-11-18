"""Сессия админки истекает по времени: после часа без действий и через 12 часов после входа.

Токен на сервере не хранится и не отзывается — его срок задают время простоя и предел от входа.
Время «сдвигаем» подменой security._now при выпуске токена; проверка срока — по настоящим часам.
"""
from datetime import datetime, timedelta, timezone

import jwt
from sqlalchemy import select

from app import security
from app.config import get_settings
from app.db import SessionLocal
from app.models import User
from app.routers.auth import login_limiter
from tests.conftest import ADMIN, HEADERS

REAL_NOW = security._now


def admin_id() -> int:
    with SessionLocal() as db:
        return db.scalar(select(User.id).where(User.email == ADMIN["email"]))


def token_at(monkeypatch, moment: datetime, started: datetime | None = None) -> str:
    monkeypatch.setattr(security, "_now", lambda: moment)
    token, _ = security.create_token(admin_id(), started)
    monkeypatch.setattr(security, "_now", REAL_NOW)
    return token


def claims(token: str) -> dict:
    return jwt.decode(token, get_settings().secret_key, algorithms=["HS256"])


def test_login_cookie_lives_for_idle_window(client):
    login_limiter._hits.clear()
    res = client.post("/api/auth/login", json=ADMIN, headers=HEADERS)
    assert res.status_code == 200
    cookie = res.headers["set-cookie"]
    max_age = int(cookie.split("Max-Age=")[1].split(";")[0])
    assert 3590 <= max_age <= 3600  # SESSION_IDLE_MINUTES=60
    data = claims(res.cookies[security.COOKIE_NAME])
    assert data["auth"] == data["iat"]
    assert data["exp"] - data["iat"] == 3600


def test_idle_session_expires(client, monkeypatch):
    now = REAL_NOW()
    client.cookies.set(security.COOKIE_NAME, token_at(monkeypatch, now - timedelta(minutes=61)))
    assert client.get("/api/auth/me").status_code == 401


def test_activity_extends_session_but_not_past_the_limit(client, monkeypatch):
    now = REAL_NOW()
    started = now - timedelta(minutes=30)
    client.cookies.set(security.COOKIE_NAME, token_at(monkeypatch, started))
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    renewed = claims(res.cookies[security.COOKIE_NAME])
    assert renewed["auth"] == int(started.timestamp())  # время входа не меняется
    assert renewed["exp"] >= int((now + timedelta(minutes=59)).timestamp())

    # Почти 12 часов от входа: продление упирается в предел, а не в час простоя
    started = now - timedelta(hours=11, minutes=30)
    client.cookies.clear()  # продлённый токен из ответа выше уже лежит в клиенте
    client.cookies.set(security.COOKIE_NAME, token_at(monkeypatch, now - timedelta(minutes=2), started))
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert claims(res.cookies[security.COOKIE_NAME])["exp"] == int((started + timedelta(hours=12)).timestamp())


def test_fresh_token_is_not_reissued_on_every_request(client, monkeypatch):
    client.cookies.set(security.COOKIE_NAME, token_at(monkeypatch, REAL_NOW() - timedelta(seconds=10)))
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert "set-cookie" not in res.headers


def test_session_ends_after_absolute_limit(client, monkeypatch):
    now = REAL_NOW()
    started = now - timedelta(hours=12, minutes=1)
    client.cookies.set(security.COOKIE_NAME, token_at(monkeypatch, now - timedelta(minutes=5), started))
    assert client.get("/api/auth/me").status_code == 401


def test_token_without_issue_and_login_time_is_rejected(client):
    old = jwt.encode({"sub": str(admin_id()), "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                     get_settings().secret_key, algorithm="HS256")
    client.cookies.set(security.COOKIE_NAME, old)
    assert client.get("/api/auth/me").status_code == 401
