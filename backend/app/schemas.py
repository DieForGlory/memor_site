"""Схемы входных данных админки и формы заявки."""
import re
import unicodedata
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, EmailStr, Field, field_validator

from .i18n import LANGS


def _clean_i18n(value) -> dict[str, str]:
    if not value:
        return {}
    if not isinstance(value, dict):
        raise ValueError("Ожидается объект с переводами")
    return {k: str(v).strip()[:20000] for k, v in value.items() if k in LANGS and v is not None and str(v).strip()}


I18n = Annotated[dict[str, str], BeforeValidator(_clean_i18n)]

# id записи: целое, которое помещается в колонку INTEGER. Иначе база падает с переполнением (500),
# а не отвечает «не найдено».
DbId = Annotated[int, Field(ge=0, le=2_147_483_647)]
# Любое целое, которое пишется в колонку INTEGER (порядок, площадь): в PostgreSQL это int4,
# число больше 2 147 483 647 там не сохраняется и даёт 500
DbInt = Annotated[int, Field(ge=-2_147_483_648, le=2_147_483_647)]

# Телефон в заявке — по тем же правилам, что у CRM (apps/crm/phones.py в CRM MEMOR): от 9 до 15 цифр,
# кроме цифр — пробелы, скобки, дефисы, точки и «+» в начале. Иначе сайт отвечает «Заявка отправлена»,
# а CRM заявку отклоняет, и в отдел продаж она не попадает.
PHONE_CHARS = re.compile(r"^\+?[0-9\s().-]+$")
PHONE_DIGITS = (9, 15)


def _require_ru(value: dict[str, str]) -> dict[str, str]:
    if not value.get("ru"):
        raise ValueError("Заполните русскую версию")
    return value


Sector = Literal["state", "commercial"]
Role = Literal["general", "contractor", "reconstruction"]
Status = Literal["completed", "in_progress"]
Stage = Literal["render", "construction", "finished", ""]
DocKind = Literal["certificate", "license"]
LeadKind = Literal["project", "tender", "subcontract", "apartment", "other"]
LeadStatus = Literal["new", "in_progress", "done", "spam"]


class ProjectIn(BaseModel):
    slug: str = Field("", max_length=120)
    title: I18n
    kicker: I18n = {}
    sector: Sector = "commercial"
    type_id: DbId | None = None
    city_id: DbId | None = None
    role: Role = "general"
    role_text: I18n = {}
    status: Status = "completed"
    client: I18n = {}
    address: I18n = {}
    lat: float | None = Field(None, ge=-90, le=90)
    lng: float | None = Field(None, ge=-180, le=180)
    year: int | None = Field(None, ge=1990, le=2100)
    area_m2: int | None = Field(None, ge=0, le=2_147_483_647)
    description: I18n = {}
    service_ids: list[DbId] = []
    is_featured: bool = False
    is_published: bool = True
    order: DbInt = 0

    _ru = field_validator("title")(_require_ru)


class PhotoPatch(BaseModel):
    stage: Stage | None = None
    caption: I18n | None = None


class ReorderIn(BaseModel):
    ids: list[DbId]


class ServiceIn(BaseModel):
    slug: str = Field("", max_length=120)
    title: I18n
    short: I18n = {}
    description: I18n = {}
    icon: str = Field("", max_length=40)
    order: DbInt = 0
    is_published: bool = True

    _ru = field_validator("title")(_require_ru)


class EquipmentIn(BaseModel):
    title: I18n
    description: I18n = {}
    order: DbInt = 0
    is_published: bool = True

    _ru = field_validator("title")(_require_ru)


class HeroSlideIn(BaseModel):
    caption: I18n = {}
    project_id: DbId | None = None
    order: DbInt = 0
    is_published: bool = True


class AdvantageIn(BaseModel):
    title: I18n
    text: I18n = {}
    order: DbInt = 0

    _ru = field_validator("title")(_require_ru)


class DocumentIn(BaseModel):
    kind: DocKind = "certificate"
    title: I18n
    valid_until: date | None = None
    order: DbInt = 0
    is_published: bool = False

    _ru = field_validator("title")(_require_ru)


class TaxonomyIn(BaseModel):
    slug: str = Field("", max_length=80)
    title: I18n
    order: DbInt = 0

    _ru = field_validator("title")(_require_ru)


class LeadIn(BaseModel):
    kind: LeadKind = "project"
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=40)
    email: EmailStr | Literal[""] = ""
    company: str = Field("", max_length=160)
    message: str = Field("", max_length=3000)
    project_id: DbId | None = None
    service_id: DbId | None = None
    crm_project_id: DbId | None = None  # жилой комплекс из каталога CRM
    page_url: str = Field("", max_length=500)
    lang: str = "ru"
    website: str = ""  # ловушка для ботов: поле скрыто от людей

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        # Длина — после обрезки пробелов: «   » и « A» именем не считаются
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Укажите имя")
        return v

    @field_validator("phone")
    @classmethod
    def phone_digits(cls, v: str) -> str:
        # Полноширинные цифры и пробелы — в обычные; арабские и прочие не-ASCII цифры не принимаем:
        # при отправке в CRM они бы отбросились, и номер оказался бы пустым
        v = unicodedata.normalize("NFKC", v).strip()
        digits = sum(ch in "0123456789" for ch in v)
        if not PHONE_CHARS.match(v) or not PHONE_DIGITS[0] <= digits <= PHONE_DIGITS[1]:
            raise ValueError("Укажите номер телефона: от 9 до 15 цифр, например +998 90 123 45 67")
        return v


class LeadPatch(BaseModel):
    status: LeadStatus | None = None
    note: str | None = Field(None, max_length=5000)


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=200)


class PasswordChangeIn(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: str = Field(min_length=10, max_length=200)


class UserIn(BaseModel):
    email: EmailStr
    name: str = Field("", max_length=120)
    password: str | None = Field(None, min_length=10, max_length=200)
    is_active: bool = True


class TestChannelIn(BaseModel):
    channel: Literal["telegram", "email", "webhook", "crm"]
