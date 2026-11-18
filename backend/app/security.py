import ipaddress
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import Argon2Error, InvalidHashError
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import User

log = logging.getLogger(__name__)

COOKIE_NAME = "memor_admin"
_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (Argon2Error, InvalidHashError):
        return False


# Сессия истекает по времени, а не по списку отозванных токенов:
# - простой: токен живёт session_idle_minutes и продлевается запросами админки;
# - предел: не дольше access_token_hours от входа, сколько бы ни работали.
# Выход удаляет cookie в браузере; скопированный токен умрёт сам по этим срокам.
SESSION_REFRESH_SECONDS = 60  # продлеваем не чаще раза в минуту, чтобы не менять cookie на каждый запрос


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_token(user_id: int, started: datetime | None = None) -> tuple[str, datetime]:
    """Токен сессии и момент, когда он истечёт. started — время входа (при продлении — исходное)."""
    settings = get_settings()
    now = _now()
    started = started or now
    expires = min(now + timedelta(minutes=settings.session_idle_minutes),
                  started + timedelta(hours=settings.access_token_hours))
    payload = {"sub": str(user_id), "iat": int(now.timestamp()), "auth": int(started.timestamp()), "exp": expires}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256"), expires


def set_session_cookie(response: Response, user_id: int, started: datetime | None = None) -> None:
    token, expires = create_token(user_id, started)
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=max(1, int((expires - _now()).total_seconds())),
        httponly=True,
        samesite="lax",
        secure=get_settings().cookie_secure,
        path="/",
    )


ADMIN_HEADER = "x-memor-admin"


def require_admin_header(request: Request) -> None:
    """Защита от CSRF: изменяющие запросы админки обязаны нести собственный заголовок.

    Чужой сайт не может отправить такой заголовок без CORS-разрешения, а CORS мы не открываем.
    """
    if request.method not in ("GET", "HEAD", "OPTIONS") and request.headers.get(ADMIN_HEADER) != "1":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Запрос отклонён")


def current_user(request: Request, response: Response, db: Session = Depends(get_db)) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется вход")
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise unauthorized
    try:
        # Срок (exp) проверяет PyJWT; токен без времени выдачи и входа — старого образца, не принимаем
        payload = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"],
                             options={"require": ["exp", "iat", "auth"]})
        user = db.get(User, int(payload["sub"]))
        started = datetime.fromtimestamp(int(payload["auth"]), timezone.utc)
        issued = int(payload["iat"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError, OverflowError, OSError):
        raise unauthorized
    if not user or not user.is_active:
        raise unauthorized
    # Работа продлевает сессию: новый срок простоя, но не дальше предела от входа
    if _now().timestamp() - issued >= SESSION_REFRESH_SECONDS:
        set_session_cookie(response, user.id, started)
    return user


class RateLimiter:
    """Простой лимит в памяти процесса: не больше `limit` событий за `window` секунд на ключ."""

    def __init__(self, limit: int, window: int):
        self.limit = limit
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        hits = self._hits[key]
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True


IPAddress = ipaddress.IPv4Address | ipaddress.IPv6Address


@lru_cache(maxsize=8)
def _trusted_networks(raw: str) -> tuple[ipaddress.IPv4Network | ipaddress.IPv6Network, ...]:
    networks = []
    for part in raw.split(","):
        if part.strip():
            try:
                networks.append(ipaddress.ip_network(part.strip(), strict=False))
            except ValueError:
                log.warning("TRUSTED_PROXIES: «%s» — не IP и не подсеть, пропускаю", part.strip())
    return tuple(networks)


def _parse_ip(value: str) -> IPAddress | None:
    """IP из X-Forwarded-For или адреса соединения: «1.2.3.4», «1.2.3.4:5678», «[::1]:80», «fe80::1%eth0»."""
    value = value.strip()
    if value.startswith("[") and "]" in value:
        value = value[1:value.index("]")]
    elif value.count(":") == 1:  # IPv4 с портом
        value = value.split(":")[0]
    try:
        return ipaddress.ip_address(value.split("%")[0])
    except ValueError:
        return None


def _is_trusted(ip: IPAddress) -> bool:
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return any(ip in net for net in _trusted_networks(get_settings().trusted_proxies))


def client_ip(request: Request) -> str:
    """Адрес посетителя — ключ лимитов входа и заявок.

    X-Forwarded-For задаёт сам клиент, поэтому читаем его, только если соединение пришло от доверенного
    прокси (TRUSTED_PROXIES), и идём справа налево: последний недоверенный адрес — это тот, кого увидел
    наш прокси. Всё левее мог дописать сам клиент. Иначе — адрес соединения.
    """
    peer = request.client.host if request.client else ""
    peer_ip = _parse_ip(peer)
    if peer_ip is None or not _is_trusted(peer_ip):
        return peer[:64]
    hops = [hop.strip() for hop in request.headers.get("x-forwarded-for", "").split(",") if hop.strip()]
    for hop in reversed(hops):
        ip = _parse_ip(hop)
        if ip is None or not _is_trusted(ip):
            return (str(ip) if ip else hop)[:64]
    # Все звенья — наши прокси (или заголовка нет): посетитель на том же сервере
    return (hops[0] if hops else peer)[:64]
