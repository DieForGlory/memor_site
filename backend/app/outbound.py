"""Исходящие запросы интеграций (CRM MEMOR, вебхук) с защитой от SSRF.

Адреса CRM и вебхука вводит администратор, а запрашивает их сервер сайта. Без проверки так можно
достучаться до внутренних сервисов (127.0.0.1, 10.x.x.x, 169.254.169.254 — метаданные облака)
и по ответам сканировать внутреннюю сеть. Поэтому:

- схема только https; http — лишь при INTEGRATIONS_ALLOW_HTTP=true (разработка);
- имя сервера резолвится, и все его адреса должны быть публичными: loopback, частные, link-local,
  CGNAT, зарезервированные, multicast и 0.0.0.0 запрещены. Исключение — хосты из
  INTEGRATIONS_ALLOWED_HOSTS (CRM на том же сервере или в локальной сети);
- проверка повторяется в момент соединения, и соединение открывается ровно на проверенный IP:
  подмена DNS между проверкой и запросом (DNS rebinding) ничего не даёт;
- редиректы не выполняются (ответ 3xx возвращается как есть), прокси из окружения не используются.
"""
import ipaddress
import socket
import ssl
from functools import lru_cache

import httpcore
import httpx

from .config import get_settings

IPAddress = ipaddress.IPv4Address | ipaddress.IPv6Address


class BlockedURL(ValueError):
    """Адрес не прошёл проверку. Текст показывается в админке."""


# ------------------------------------------------------------------ проверка адресов

def _resolve(host: str, port: int) -> list[str]:
    """Все IP хоста. В тестах подменяется: тесты в DNS не ходят."""
    infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    return list(dict.fromkeys(str(info[4][0]) for info in infos))


@lru_cache(maxsize=8)
def _parse_hosts(raw: str) -> frozenset[str]:
    return frozenset(h.strip().lower().strip("[]").rstrip(".") for h in raw.split(",") if h.strip())


def _allowed_hosts() -> frozenset[str]:
    return _parse_hosts(get_settings().integrations_allowed_hosts)


def _ip_literal(value: str) -> IPAddress | None:
    try:
        return ipaddress.ip_address(value.strip().strip("[]").split("%")[0])
    except ValueError:
        return None


def is_public_ip(ip: IPAddress) -> bool:
    """Адрес публичного интернета: не loopback, не частный, не link-local, не служебный."""
    if isinstance(ip, ipaddress.IPv6Address):
        embedded = ip.ipv4_mapped or ip.sixtofour  # ::ffff:127.0.0.1, 2002:7f00:1::
        if embedded is not None:
            return is_public_ip(embedded)
        if ip.is_site_local:
            return False
    return ip.is_global and not (
        ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
        or ip.is_multicast or ip.is_unspecified
    )


def check_host(host: str, port: int) -> list[str]:
    """IP, на которые можно соединяться с этим хостом. BlockedURL — если хоть один из них внутренний."""
    name = host.strip().lower().strip("[]").rstrip(".")
    if not name:
        raise BlockedURL("В адресе не указан сервер")
    literal = _ip_literal(name)
    if literal is not None:
        addresses = [str(literal)]
    else:
        try:
            addresses = _resolve(name, port)
        except (OSError, UnicodeError):
            addresses = []
        if not addresses:
            raise BlockedURL(f"Не удалось найти сервер «{name}» — проверьте адрес")
    if name in _allowed_hosts():
        return addresses
    for address in addresses:
        ip = _ip_literal(address)
        if ip is None or not is_public_ip(ip):
            raise BlockedURL(
                f"«{name}» указывает на внутренний или служебный адрес — такие адреса запрещены. "
                "Укажите публичный адрес сервера (исключения задаёт INTEGRATIONS_ALLOWED_HOSTS в backend/.env)"
            )
    return addresses


def check_url(url: str) -> httpx.URL:
    """Проверка адреса до запроса и при сохранении настроек. BlockedURL — с понятным текстом."""
    try:
        parsed = httpx.URL(url.strip())
    except Exception:  # httpx.InvalidURL и ошибки разбора
        raise BlockedURL("Некорректный адрес") from None
    if parsed.scheme not in ("https", "http") or not parsed.raw_host:
        raise BlockedURL("Укажите адрес полностью, начиная с https://")
    if parsed.scheme == "http" and not get_settings().integrations_allow_http:
        raise BlockedURL("Нужен адрес с https:// — незащищённый http:// разрешён только для разработки "
                         "(INTEGRATIONS_ALLOW_HTTP в backend/.env)")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    check_host(parsed.raw_host.decode("ascii"), port)
    return parsed


# ------------------------------------------------------------------ запросы

class _GuardedBackend(httpcore.NetworkBackend):
    """Сетевой слой httpcore: перед каждым соединением заново резолвит и проверяет хост и соединяется
    с проверенным IP, а не с именем. Сертификат TLS при этом проверяется по имени хоста."""

    def __init__(self, inner: httpcore.NetworkBackend):
        self._inner = inner

    def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        error: Exception | None = None
        for address in check_host(host, port):
            try:
                return self._inner.connect_tcp(address, port, timeout=timeout, local_address=local_address,
                                               socket_options=socket_options)
            except httpcore.ConnectError as exc:  # пробуем следующий адрес хоста
                error = exc
        raise error or httpcore.ConnectError(f"Нет адресов для {host}")

    def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise httpcore.ConnectError("Unix-сокеты для интеграций запрещены")

    def sleep(self, seconds: float) -> None:
        self._inner.sleep(seconds)


def _inner_backend() -> httpcore.NetworkBackend:
    """Настоящая сеть. В тестах подменяется на httpcore.MockBackend."""
    return httpcore.SyncBackend()


@lru_cache(maxsize=1)
def _ssl_context() -> ssl.SSLContext:
    return httpx.create_ssl_context(trust_env=False)


class _GuardedTransport(httpx.HTTPTransport):
    def __init__(self) -> None:  # родительский __init__ не зовём: пул собираем сами, с проверяющим сетевым слоем
        self._pool = httpcore.ConnectionPool(ssl_context=_ssl_context(), network_backend=_GuardedBackend(_inner_backend()))


def _send(method: str, url: str, **kwargs) -> httpx.Response:
    """Сам запрос: без редиректов и прокси из окружения, соединение — только на проверенный IP."""
    with httpx.Client(transport=_GuardedTransport(), follow_redirects=False, trust_env=False) as client:
        return client.request(method, url, **kwargs)


def request(method: str, url: str, **kwargs) -> httpx.Response:
    """Исходящий запрос интеграции. BlockedURL — адрес запрещён; httpx.HTTPError — сеть."""
    check_url(url)
    return _send(method, url, **kwargs)


def get(url: str, **kwargs) -> httpx.Response:
    return request("GET", url, **kwargs)


def post(url: str, **kwargs) -> httpx.Response:
    return request("POST", url, **kwargs)
