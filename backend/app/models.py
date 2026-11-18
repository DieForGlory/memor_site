"""Модели данных.

Переводимые поля хранятся как JSON вида {"ru": "...", "uz": "...", "en": "..."}.
Публичный API отдаёт строку на нужном языке (с откатом на русский), админский — весь объект.
"""
from datetime import date, datetime, timezone

from sqlalchemy import JSON, Column, Date, DateTime, Float, ForeignKey, Integer, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

SECTORS = ("state", "commercial")
ROLES = ("general", "contractor", "reconstruction")
STATUSES = ("completed", "in_progress")
STAGES = ("render", "construction", "finished")
DOCUMENT_KINDS = ("certificate", "license")
LEAD_KINDS = ("project", "tender", "subcontract", "other")
LEAD_STATUSES = ("new", "in_progress", "done", "spam")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def i18n_col(**kw):
    return mapped_column(JSON, default=dict, nullable=False, **kw)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Setting(Base):
    """Хранилище настроек: ключ 'site' — контакты и тексты, 'integrations' — каналы заявок."""

    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[dict] = i18n_col()
    order: Mapped[int] = mapped_column(default=0)


class ProjectType(Base):
    __tablename__ = "project_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    title: Mapped[dict] = i18n_col()
    order: Mapped[int] = mapped_column(default=0)


project_services = Table(
    "project_services",
    Base.metadata,
    Column("project_id", ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("service_id", ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    title: Mapped[dict] = i18n_col()
    short: Mapped[dict] = i18n_col()
    description: Mapped[dict] = i18n_col()
    icon: Mapped[str] = mapped_column(String(40), default="")
    image: Mapped[str] = mapped_column(String(255), default="")
    order: Mapped[int] = mapped_column(default=0)
    is_published: Mapped[bool] = mapped_column(default=True)

    projects: Mapped[list["Project"]] = relationship(secondary=project_services, back_populates="services")


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[dict] = i18n_col()
    description: Mapped[dict] = i18n_col()
    image: Mapped[str] = mapped_column(String(255), default="")
    order: Mapped[int] = mapped_column(default=0)
    is_published: Mapped[bool] = mapped_column(default=True)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    title: Mapped[dict] = i18n_col()
    kicker: Mapped[dict] = i18n_col()  # надзаголовок: «Жилой комплекс», «Головной офис»
    sector: Mapped[str] = mapped_column(String(20), default="commercial", index=True)
    type_id: Mapped[int | None] = mapped_column(ForeignKey("project_types.id", ondelete="SET NULL"))
    city_id: Mapped[int | None] = mapped_column(ForeignKey("cities.id", ondelete="SET NULL"))
    role: Mapped[str] = mapped_column(String(20), default="general")
    role_text: Mapped[dict] = i18n_col()  # уточнение роли, если стандартной подписи мало
    status: Mapped[str] = mapped_column(String(20), default="completed")
    client: Mapped[dict] = i18n_col()
    address: Mapped[dict] = i18n_col()
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    year: Mapped[int | None] = mapped_column(Integer)
    area_m2: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[dict] = i18n_col()
    cover: Mapped[str] = mapped_column(String(255), default="")
    cover_thumb: Mapped[str] = mapped_column(String(255), default="")
    is_featured: Mapped[bool] = mapped_column(default=False)
    is_published: Mapped[bool] = mapped_column(default=True, index=True)
    order: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    type: Mapped[ProjectType | None] = relationship()
    city: Mapped[City | None] = relationship()
    services: Mapped[list[Service]] = relationship(secondary=project_services, back_populates="projects")
    photos: Mapped[list["ProjectPhoto"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectPhoto.order"
    )


class ProjectPhoto(Base):
    __tablename__ = "project_photos"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    image: Mapped[str] = mapped_column(String(255))
    thumb: Mapped[str] = mapped_column(String(255), default="")
    width: Mapped[int] = mapped_column(default=0)
    height: Mapped[int] = mapped_column(default=0)
    stage: Mapped[str] = mapped_column(String(20), default="")  # render / construction / finished / ''
    caption: Mapped[dict] = i18n_col()
    order: Mapped[int] = mapped_column(default=0)

    project: Mapped[Project] = relationship(back_populates="photos")


class HeroSlide(Base):
    __tablename__ = "hero_slides"

    id: Mapped[int] = mapped_column(primary_key=True)
    image: Mapped[str] = mapped_column(String(255), default="")
    caption: Mapped[dict] = i18n_col()
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"))
    order: Mapped[int] = mapped_column(default=0)
    is_published: Mapped[bool] = mapped_column(default=True)

    project: Mapped[Project | None] = relationship()


class Advantage(Base):
    __tablename__ = "advantages"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[dict] = i18n_col()
    text: Mapped[dict] = i18n_col()
    order: Mapped[int] = mapped_column(default=0)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), default="certificate")
    title: Mapped[dict] = i18n_col()
    image: Mapped[str] = mapped_column(String(255), default="")
    valid_until: Mapped[date | None] = mapped_column(Date)
    order: Mapped[int] = mapped_column(default=0)
    is_published: Mapped[bool] = mapped_column(default=False)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), default="project")
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40))
    email: Mapped[str] = mapped_column(String(254), default="")
    company: Mapped[str] = mapped_column(String(160), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"))
    service_id: Mapped[int | None] = mapped_column(ForeignKey("services.id", ondelete="SET NULL"))
    # Жилой комплекс из каталога CRM (раздел «Квартиры»): id проекта в CRM и его название
    crm_project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    crm_project_name: Mapped[str] = mapped_column(String(200), default="", server_default="")
    page_url: Mapped[str] = mapped_column(String(500), default="")
    lang: Mapped[str] = mapped_column(String(5), default="ru")
    ip: Mapped[str] = mapped_column(String(64), default="")
    status: Mapped[str] = mapped_column(String(20), default="new", index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    delivery: Mapped[dict] = mapped_column(JSON, default=dict)  # результат отправки по каналам
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    project: Mapped[Project | None] = relationship()
    service: Mapped[Service | None] = relationship()
