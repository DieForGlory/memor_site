from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

DEV_SECRET = "dev-insecure-change-me"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    debug: bool = True
    secret_key: str = DEV_SECRET
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'memor.db').as_posix()}"
    media_dir: Path = BACKEND_DIR / "media"
    # Папка с исходными материалами заказчика (фото объектов, презентация) — нужна только сиду.
    materials_dir: Path = ROOT_DIR

    site_url: str = "http://localhost:3000"
    # Сессия админки истекает по времени (app/security.py): после session_idle_minutes без запросов
    # и в любом случае через access_token_hours после входа — тогда нужно войти заново.
    access_token_hours: int = Field(12, ge=1)
    session_idle_minutes: int = Field(60, ge=1)
    cookie_secure: bool = False
    # Часовой пояс времени в выгрузке заявок (CSV): смещение от UTC в часах, по умолчанию Ташкент
    export_utc_offset_hours: int = Field(5, ge=-12, le=14)

    # Прокси, которым верим в X-Forwarded-For (IP или подсети через запятую). По этому адресу
    # работают лимиты входа и заявок. По умолчанию — только локальные Next.js/nginx на том же сервере;
    # пусто — заголовок не читается вовсе (бэкенд открыт наружу без прокси).
    trusted_proxies: str = "127.0.0.1,::1"

    # Исходящие запросы интеграций (CRM, вебхук) — защита от SSRF, см. app/outbound.py.
    # http:// без шифрования — только для разработки.
    integrations_allow_http: bool = False
    # Хосты, которым разрешено вести во внутреннюю сеть (CRM на том же сервере или в локальной сети),
    # через запятую: «127.0.0.1,crm.internal». Остальные адреса должны быть публичными.
    integrations_allowed_hosts: str = ""

    # Первый администратор — создаётся сидом.
    admin_email: str = "admin@memor.uz"
    admin_password: str = ""

    # SMTP для писем о заявках (получатели задаются в админке).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.debug and (settings.secret_key == DEV_SECRET or len(settings.secret_key) < 32):
        raise RuntimeError("SECRET_KEY must be a random string of 32+ characters when DEBUG is off")
    settings.media_dir.mkdir(parents=True, exist_ok=True)
    return settings
