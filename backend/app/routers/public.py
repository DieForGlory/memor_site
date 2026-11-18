"""Публичное API для сайта. Язык выбирается параметром ?lang=ru|uz|en."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import crm_catalog
from .. import serializers as ser
from .. import site_settings
from ..db import get_db
from ..i18n import LANGS, norm_lang, pick
from ..integrations import deliver_lead
from ..models import Advantage, City, Document, Equipment, HeroSlide, Lead, Project, ProjectType, Service
from ..schemas import LeadIn
from ..security import RateLimiter, client_ip

router = APIRouter(prefix="/api/public", tags=["public"])
lead_limiter = RateLimiter(limit=5, window=600)

Lang = Query("ru", description="ru | uz | en")


def _projects_query():
    return (
        select(Project)
        .where(Project.is_published.is_(True))
        .options(
            selectinload(Project.type),
            selectinload(Project.city),
            selectinload(Project.services),
            selectinload(Project.photos),
        )
        .order_by(Project.order, Project.id)
    )


def _site_payload(db: Session, lang: str) -> dict:
    s = site_settings.load(db, "site")
    integ = site_settings.load(db, "integrations")
    i18n_fields = [
        "legal_name", "tagline", "hero_title", "hero_text", "about_short", "about_text",
        "letter_title", "letter_text", "clients", "address", "working_hours", "requisites",
        "seo_title", "seo_description",
    ]
    data = s.model_dump()
    for f in i18n_fields:
        data[f] = pick(getattr(s, f), lang)
    data["analytics"] = {
        "yandex_metrika_id": integ.yandex_metrika_id,
        "google_analytics_id": integ.google_analytics_id,
    }
    data["languages"] = list(LANGS)
    # Раздел «Квартиры» в меню — только когда каталог CRM включён и настроен
    data["realty_enabled"] = crm_catalog.configured(integ)
    return data


@router.get("/site")
def site(lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    services = db.scalars(select(Service).where(Service.is_published.is_(True)).order_by(Service.order)).all()
    projects_count = len(db.scalars(select(Project.id).where(Project.is_published.is_(True))).all())
    data = _site_payload(db, lang)
    data["services"] = [ser.service_card(s, lang) for s in services]
    data["projects_count"] = projects_count
    return data


@router.get("/home")
def home(lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    slides = db.scalars(
        select(HeroSlide).where(HeroSlide.is_published.is_(True)).options(selectinload(HeroSlide.project))
        .order_by(HeroSlide.order, HeroSlide.id)
    ).all()
    projects = db.scalars(_projects_query()).all()
    featured = [p for p in projects if p.is_featured] or projects[:8]
    return {
        "hero": [ser.hero_slide(h, lang) for h in slides if h.image],
        "featured": [ser.project_card(p, lang) for p in featured],
        "map": [ser.project_card(p, lang) for p in projects if p.lat is not None and p.lng is not None],
        "stats": {
            "projects": len(projects),
            "state": sum(p.sector == "state" for p in projects),
            "commercial": sum(p.sector == "commercial" for p in projects),
        },
        "equipment": [ser.equipment(e, lang) for e in _published(db, Equipment)],
        "advantages": [ser.advantage(a, lang) for a in db.scalars(select(Advantage).order_by(Advantage.order)).all()],
        "documents": [ser.document(d, lang) for d in _published(db, Document)],
    }


def _published(db: Session, model):
    return db.scalars(select(model).where(model.is_published.is_(True)).order_by(model.order, model.id)).all()


@router.get("/projects")
def projects(lang: str = Lang, db: Session = Depends(get_db)):
    """Весь каталог разом: объектов десятки, фильтрация идёт на клиенте без перезагрузки."""
    lang = norm_lang(lang)
    items = db.scalars(_projects_query()).all()
    used_types = {p.type_id for p in items}
    used_cities = {p.city_id for p in items}
    types = db.scalars(select(ProjectType).order_by(ProjectType.order)).all()
    cities = db.scalars(select(City).order_by(City.order)).all()
    return {
        "items": [ser.project_card(p, lang) for p in items],
        "filters": {
            "sectors": [{"key": k, "label": pick(v, lang)} for k, v in ser.SECTOR_LABELS.items()],
            "statuses": [{"key": k, "label": pick(v, lang)} for k, v in ser.STATUS_LABELS.items()],
            "roles": [{"key": k, "label": pick(v, lang)} for k, v in ser.ROLE_LABELS.items()],
            "types": [ser.taxonomy(t, lang) for t in types if t.id in used_types],
            "cities": [ser.taxonomy(c, lang) for c in cities if c.id in used_cities],
        },
    }


@router.get("/projects/{slug}")
def project(slug: str, lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    items = db.scalars(_projects_query()).all()
    current = next((p for p in items if p.slug == slug), None)
    if not current:
        raise HTTPException(404, "Объект не найден")
    data = ser.project_detail(current, lang)
    # Похожие: сначала тот же тип, затем тот же сектор.
    others = [p for p in items if p.id != current.id]
    others.sort(key=lambda p: (p.type_id != current.type_id, p.sector != current.sector, p.order))
    data["related"] = [ser.project_card(p, lang) for p in others[:3]]
    idx = items.index(current)
    data["prev"] = {"slug": items[idx - 1].slug, "title": pick(items[idx - 1].title, lang)} if idx > 0 else None
    data["next"] = (
        {"slug": items[idx + 1].slug, "title": pick(items[idx + 1].title, lang)} if idx + 1 < len(items) else None
    )
    return data


@router.get("/services")
def services(lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    items = db.scalars(
        select(Service).where(Service.is_published.is_(True)).options(selectinload(Service.projects))
        .order_by(Service.order)
    ).all()
    return [
        {**ser.service_card(s, lang), "projects_count": sum(p.is_published for p in s.projects)} for s in items
    ]


@router.get("/services/{slug}")
def service(slug: str, lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    s = db.scalar(select(Service).where(Service.slug == slug, Service.is_published.is_(True)))
    if not s:
        raise HTTPException(404, "Услуга не найдена")
    projects = db.scalars(_projects_query().where(Project.services.any(Service.id == s.id))).all()
    data = ser.service_card(s, lang)
    data["description"] = pick(s.description, lang)
    data["projects"] = [ser.project_card(p, lang) for p in projects]
    return data


@router.get("/equipment")
def equipment(lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    return [ser.equipment(e, lang) for e in _published(db, Equipment)]


@router.get("/documents")
def documents(lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    return [ser.document(d, lang) for d in _published(db, Document)]


@router.get("/advantages")
def advantages(lang: str = Lang, db: Session = Depends(get_db)):
    lang = norm_lang(lang)
    return [ser.advantage(a, lang) for a in db.scalars(select(Advantage).order_by(Advantage.order)).all()]


@router.get("/sitemap")
def sitemap(db: Session = Depends(get_db)):
    projects = db.execute(select(Project.slug, Project.updated_at).where(Project.is_published.is_(True))).all()
    services = db.scalars(select(Service.slug).where(Service.is_published.is_(True))).all()
    cfg = site_settings.load(db, "integrations")
    realty: list[int] = []
    if crm_catalog.configured(cfg):
        try:
            realty = [p["id"] for p in crm_catalog.get_catalog(cfg)["projects"]]
        except crm_catalog.CatalogError:
            realty = []
    return {
        "projects": [{"slug": slug, "updated_at": updated.isoformat() if updated else None} for slug, updated in projects],
        "services": list(services),
        "realty": realty,
    }


@router.get("/realty")
def realty_list(db: Session = Depends(get_db)):
    """Жилые комплексы из CRM: карточки для раздела «Квартиры»."""
    cfg = site_settings.load(db, "integrations")
    if not crm_catalog.configured(cfg):
        return {"enabled": False, "available": False, "projects": []}
    try:
        data = crm_catalog.get_catalog(cfg)
    except crm_catalog.CatalogError:
        # CRM недоступна и снимка ещё нет — страница покажет «загляните позже»
        return {"enabled": True, "available": False, "projects": []}
    return {"enabled": True, "available": True, "projects": [crm_catalog.summary(p) for p in data["projects"]]}


@router.get("/realty/{project_id}")
def realty_detail(project_id: int, db: Session = Depends(get_db)):
    """Жилой комплекс: описание, галерея, планировки и свободные квартиры с ценами."""
    cfg = site_settings.load(db, "integrations")
    project = crm_catalog.find_project(cfg, project_id) if crm_catalog.configured(cfg) else None
    if project is None:
        raise HTTPException(404, "Жилой комплекс не найден")
    return project


@router.post("/leads", status_code=201)
def create_lead(payload: LeadIn, request: Request, background: BackgroundTasks, db: Session = Depends(get_db)):
    ip = client_ip(request)
    if payload.website:
        # Бот заполнил скрытое поле — отвечаем как обычно, но ничего не сохраняем.
        return {"ok": True}
    if not lead_limiter.allow(ip):
        raise HTTPException(429, "Слишком много заявок. Попробуйте позже или позвоните нам.")
    project = db.get(Project, payload.project_id) if payload.project_id else None
    service = db.get(Service, payload.service_id) if payload.service_id else None
    # Комплекс из каталога CRM принимаем, только если он есть в каталоге: чужой id в CRM не уйдёт
    realty = None
    if payload.crm_project_id:
        realty = crm_catalog.find_project(site_settings.load(db, "integrations"), payload.crm_project_id)
    lead = Lead(
        kind=payload.kind,
        name=payload.name.strip(),
        phone=payload.phone,
        email=payload.email or "",
        company=payload.company.strip(),
        message=payload.message.strip(),
        project_id=project.id if project else None,
        service_id=service.id if service else None,
        crm_project_id=realty["id"] if realty else None,
        crm_project_name=realty["name"][:200] if realty else "",
        page_url=payload.page_url,
        lang=norm_lang(payload.lang),
        ip=ip,
    )
    db.add(lead)
    db.commit()
    background.add_task(deliver_lead, lead.id)
    return {"ok": True, "id": lead.id}
