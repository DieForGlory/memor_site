"""Настройки сайта и интеграций: схемы с дефолтами + чтение/запись в таблицу settings."""
import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.orm import Session

from .models import Setting

I18n = dict[str, str]


class SiteSettings(BaseModel):
    company_name: str = "MEMOR GROUP"
    legal_name: I18n = Field(default_factory=dict)
    tagline: I18n = Field(default_factory=dict)
    hero_title: I18n = Field(default_factory=dict)
    hero_text: I18n = Field(default_factory=dict)
    founded_year: int = 1996
    companies_count: int = 10
    employees_count: int = 200
    about_short: I18n = Field(default_factory=dict)
    about_text: I18n = Field(default_factory=dict)
    letter_title: I18n = Field(default_factory=dict)
    letter_text: I18n = Field(default_factory=dict)
    clients: I18n = Field(default_factory=dict)
    phones: list[str] = Field(default_factory=list)
    email: str = ""
    address: I18n = Field(default_factory=dict)
    working_hours: I18n = Field(default_factory=dict)
    lat: float | None = None
    lng: float | None = None
    requisites: I18n = Field(default_factory=dict)
    telegram_url: str = ""
    instagram_url: str = ""
    facebook_url: str = ""
    youtube_url: str = ""
    presentation_url: str = ""
    seo_title: I18n = Field(default_factory=dict)
    seo_description: I18n = Field(default_factory=dict)


# Ссылка для href на сайте: только http(s) или путь от корня сайта — не javascript:, data: и т. п.
_SAFE_LINK = re.compile(r"^(https?://[^\s/?#]+|/(?![/\\]))\S*$", re.IGNORECASE)


class SiteSettingsIn(SiteSettings):
    """Форма «Сайт и контакты». Строже, чем чтение из базы: старые значения не должны ронять сайт."""

    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)
    # Цифры на главной и в «О компании»: год 0 или «-3+ компаний» сайт показал бы как есть
    founded_year: int = Field(1996, ge=1900, le=2100)
    companies_count: int = Field(10, ge=0, le=1_000_000)
    employees_count: int = Field(200, ge=0, le=1_000_000)
    # Адрес для mailto: на сайте; пусто — блок почты не показывается
    email: EmailStr | Literal[""] = ""

    @field_validator("telegram_url", "instagram_url", "facebook_url", "youtube_url", "presentation_url")
    @classmethod
    def _safe_link(cls, v: str) -> str:
        v = v.strip()
        if v and not _SAFE_LINK.match(v):
            raise ValueError("Ссылка должна начинаться с https://")
        return v


class IntegrationSettings(BaseModel):
    telegram_enabled: bool = False
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    email_enabled: bool = False
    email_recipients: str = ""  # через запятую
    webhook_enabled: bool = False
    webhook_url: str = ""  # входящий вебхук CRM (Bitrix24, amoCRM через коннектор) или любой URL
    crm_enabled: bool = False
    crm_url: str = ""  # адрес CRM MEMOR без завершающего слэша, например https://crm.example.uz
    crm_api_key: str = ""  # ключ партнёра с правом CREATE_APPLICATION; в админке не показывается
    # Раздел «Квартиры»: жилые комплексы и свободные квартиры из CRM (тот же адрес и ключ,
    # ключу нужны права VIEW_PROJECTS и VIEW_BUILDINGS)
    crm_catalog_enabled: bool = False
    yandex_metrika_id: str = ""
    google_analytics_id: str = ""

    @field_validator("crm_url")
    @classmethod
    def _crm_url_clean(cls, v: str) -> str:
        return v.strip().rstrip("/")

    @field_validator("webhook_url")
    @classmethod
    def _webhook_url_clean(cls, v: str) -> str:
        return v.strip()


_SCHEMAS = {"site": SiteSettings, "integrations": IntegrationSettings}


def load(db: Session, key: str):
    row = db.get(Setting, key)
    return _SCHEMAS[key].model_validate(row.value if row else {})


def save(db: Session, key: str, data: BaseModel) -> None:
    row = db.get(Setting, key)
    if row:
        row.value = data.model_dump()
    else:
        db.add(Setting(key=key, value=data.model_dump()))
    db.commit()
