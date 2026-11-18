"""API админки. Все маршруты требуют входа; изменяющие — ещё и заголовок X-Memor-Admin."""
import csv
import io
import re
from datetime import date, datetime, timedelta, timezone

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from .. import crm_catalog, outbound, site_settings
from ..config import get_settings
from ..db import get_db
from ..i18n import LANGS, slugify
from ..images import MAX_BYTES, ImageError, delete_files, media_url, save_image, thumb_of
from ..integrations import TEST_PAYLOAD, check_crm, enabled_channels, lead_payload, run_channel
from ..models import (
    Advantage,
    City,
    Document,
    Equipment,
    HeroSlide,
    Lead,
    Project,
    ProjectPhoto,
    ProjectType,
    Service,
    User,
)
from ..schemas import (
    AdvantageIn,
    DocumentIn,
    EquipmentIn,
    HeroSlideIn,
    LeadPatch,
    PhotoPatch,
    ProjectIn,
    ReorderIn,
    ServiceIn,
    TaxonomyIn,
    TestChannelIn,
    UserIn,
)
from ..security import current_user, hash_password, require_admin_header
from ..site_settings import IntegrationSettings, SiteSettingsIn

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(current_user), Depends(require_admin_header)],
)


# ---------------------------------------------------------------- helpers


def as_utc(value: datetime) -> datetime:
    """Время в базе — UTC. SQLite отдаёт его без часового пояса, и браузер принял бы его за местное."""
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def row(obj, image_fields: tuple[str, ...] = ()) -> dict:
    data = {c.key: getattr(obj, c.key) for c in obj.__table__.columns}
    for key, value in data.items():
        if isinstance(value, datetime):
            data[key] = as_utc(value)
    for f in image_fields:
        data[f"{f}_url"] = media_url(data.get(f))
        data[f"{f}_thumb"] = media_url(thumb_of(data.get(f)))
    return data


def get_or_404(db: Session, model, obj_id: int):
    obj = db.get(model, obj_id)
    if not obj:
        raise HTTPException(404, "Запись не найдена")
    return obj


def unique_slug(db: Session, model, wanted: str, fallback_title: dict, own_id: int | None = None) -> str:
    # Не длиннее колонки: у городов и типов это String(80), а транслитерация удлиняет текст («щ» → «sch»).
    # PostgreSQL слишком длинную строку не сохраняет (500), SQLite — молча сохраняет.
    limit = model.__table__.c.slug.type.length
    base = slugify(wanted) or slugify(fallback_title.get("en") or fallback_title.get("ru", "")) or "item"
    base = base[:limit].rstrip("-") or "item"
    slug, n = base, 2
    while True:
        clash = db.scalar(select(model.id).where(model.slug == slug))
        if clash is None or clash == own_id:
            return slug
        suffix = f"-{n}"
        slug, n = f"{base[:limit - len(suffix)].rstrip('-')}{suffix}", n + 1


async def read_upload(file: UploadFile) -> bytes:
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Файл больше 30 МБ")
    return data


def store_upload(data: bytes, subdir: str) -> dict:
    try:
        return save_image(data, subdir)
    except ImageError as exc:
        raise HTTPException(400, str(exc))


def referenced_paths(db: Session) -> set[str]:
    """Все пути к картинкам, на которые ссылается база (файлы делятся по хэшу содержимого)."""
    paths: set[str] = set()
    for image, thumb in db.execute(select(ProjectPhoto.image, ProjectPhoto.thumb)):
        paths.update((image, thumb))
    for cover, cover_thumb in db.execute(select(Project.cover, Project.cover_thumb)):
        paths.update((cover, cover_thumb))
    for model in (HeroSlide, Service, Equipment, Document):
        for (image,) in db.execute(select(model.image)):
            paths.update((image, thumb_of(image)))
    paths.discard("")
    return paths


def cleanup_files(db: Session, *candidates: str) -> None:
    in_use = referenced_paths(db)
    delete_files(*(p for p in candidates if p and p not in in_use))


def require_ref(db: Session, model, obj_id: int | None, message: str) -> None:
    """Ссылка на другую запись (тип, город, объект) должна существовать — иначе 422, а не 500 от базы."""
    if obj_id is not None and db.get(model, obj_id) is None:
        raise HTTPException(422, message)


def apply_reorder(db: Session, model, ids: list[int], *scope) -> None:
    """Новый порядок по списку id. scope — условия, ограничивающие набор (например, фото одного объекта)."""
    objs = {o.id: o for o in db.scalars(select(model).where(model.id.in_(ids), *scope))}
    for position, obj_id in enumerate(ids):
        if obj_id in objs:
            objs[obj_id].order = position
    db.commit()


# ---------------------------------------------------------------- dashboard


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    projects = db.scalars(select(Project).options(selectinload(Project.photos))).all()
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    leads_new = db.scalar(select(func.count(Lead.id)).where(Lead.status == "new")) or 0
    leads_week = db.scalar(select(func.count(Lead.id)).where(Lead.created_at >= week_ago)) or 0
    leads_total = db.scalar(select(func.count(Lead.id))) or 0
    recent = db.scalars(select(Lead).order_by(Lead.created_at.desc()).limit(6)).all()

    warnings: list[dict] = []
    for d in db.scalars(select(Document)).all():
        if d.valid_until and d.valid_until < date.today():
            state = "опубликован" if d.is_published else "скрыт"
            warnings.append({
                "level": "error" if d.is_published else "warning",
                "text": f"Документ «{d.title.get('ru', '')}» просрочен ({d.valid_until:%d.%m.%Y}, {state})",
                "link": "/admin/documents",
            })
    no_coords = [p for p in projects if p.is_published and (p.lat is None or p.lng is None)]
    if no_coords:
        warnings.append({"level": "warning", "text": f"Без точки на карте: {len(no_coords)} объект(ов)",
                         "link": "/admin/projects"})
    no_photos = [p for p in projects if p.is_published and not p.photos]
    if no_photos:
        warnings.append({"level": "warning", "text": f"Без фотографий: {len(no_photos)} объект(ов)",
                         "link": "/admin/projects"})
    missing_tr = [p for p in projects if p.is_published and not all(p.title.get(lang) for lang in LANGS)]
    if missing_tr:
        warnings.append({"level": "info", "text": f"Не переведены названия: {len(missing_tr)} объект(ов)",
                         "link": "/admin/projects"})
    integ = site_settings.load(db, "integrations")
    if not enabled_channels(integ):
        warnings.append({"level": "error", "text": "Заявки никуда не пересылаются — включите хотя бы один канал",
                         "link": "/admin/integrations"})
    # Сбой канала (CRM лежит, отклонила данные) сам не повторяется: без напоминания такая заявка
    # остаётся только на сайте, и отдел продаж о ней не знает
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    undelivered = [
        lead.id for lead in db.scalars(
            select(Lead).where(Lead.created_at >= month_ago, Lead.status.in_(("new", "in_progress")))
        )
        if any(not (result or {}).get("ok") for result in (lead.delivery or {}).values())
    ]
    if undelivered:
        warnings.append({"level": "error",
                         "text": f"Не доставлены в CRM или каналы: {len(undelivered)} заявк(и) — откройте заявку "
                                 "и нажмите «Отправить в каналы ещё раз»",
                         "link": f"/admin/leads?open={undelivered[0]}" if len(undelivered) == 1 else "/admin/leads"})

    return {
        "counts": {
            "projects": sum(p.is_published for p in projects),
            "projects_total": len(projects),
            "photos": sum(len(p.photos) for p in projects),
            "leads_new": leads_new,
            "leads_week": leads_week,
            "leads_total": leads_total,
        },
        "recent_leads": [lead_out(lead) for lead in recent],
        "warnings": warnings,
    }


# ---------------------------------------------------------------- projects


def project_out(p: Project) -> dict:
    data = row(p)
    data["cover_url"] = media_url(p.cover)
    data["cover_thumb_url"] = media_url(p.cover_thumb)
    data["service_ids"] = [s.id for s in p.services]
    data["photos"] = [photo_out(ph) for ph in p.photos]
    return data


def photo_out(ph: ProjectPhoto) -> dict:
    data = row(ph)
    data["image_url"] = media_url(ph.image)
    data["thumb_url"] = media_url(ph.thumb)
    return data


def load_project(db: Session, project_id: int) -> Project:
    p = db.scalar(
        select(Project).where(Project.id == project_id)
        .options(selectinload(Project.photos), selectinload(Project.services))
    )
    if not p:
        raise HTTPException(404, "Объект не найден")
    return p


def fill_project(db: Session, p: Project, payload: ProjectIn) -> None:
    require_ref(db, ProjectType, payload.type_id, "Тип объекта не найден — выберите его из списка")
    require_ref(db, City, payload.city_id, "Город не найден — выберите его из списка")
    data = payload.model_dump(exclude={"service_ids", "slug"})
    for key, value in data.items():
        setattr(p, key, value)
    p.slug = unique_slug(db, Project, payload.slug, payload.title, p.id)
    p.services = db.scalars(select(Service).where(Service.id.in_(payload.service_ids))).all() if payload.service_ids else []


@router.get("/projects")
def list_projects(db: Session = Depends(get_db)):
    items = db.scalars(
        select(Project).options(selectinload(Project.photos), selectinload(Project.services))
        .order_by(Project.order, Project.id)
    ).all()
    out = []
    for p in items:
        data = project_out(p)
        data["photos_count"] = len(data.pop("photos"))
        out.append(data)
    return out


@router.post("/projects", status_code=201)
def create_project(payload: ProjectIn, db: Session = Depends(get_db)):
    p = Project()
    fill_project(db, p, payload)
    if not payload.order:
        p.order = (db.scalar(select(func.max(Project.order))) or 0) + 1
    db.add(p)
    db.commit()
    return project_out(load_project(db, p.id))


@router.get("/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    return project_out(load_project(db, project_id))


@router.put("/projects/{project_id}")
def update_project(project_id: int, payload: ProjectIn, db: Session = Depends(get_db)):
    p = load_project(db, project_id)
    fill_project(db, p, payload)
    db.commit()
    return project_out(load_project(db, project_id))


@router.delete("/projects/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db)):
    p = load_project(db, project_id)
    paths = [p.cover, p.cover_thumb] + [x for ph in p.photos for x in (ph.image, ph.thumb)]
    db.delete(p)
    db.commit()
    cleanup_files(db, *paths)
    return {"ok": True}


@router.post("/projects/reorder")
def reorder_projects(payload: ReorderIn, db: Session = Depends(get_db)):
    apply_reorder(db, Project, payload.ids)
    return {"ok": True}


@router.post("/projects/{project_id}/photos", status_code=201)
async def upload_photos(
    project_id: int,
    files: list[UploadFile] = File(...),
    stage: str = Form(""),
    db: Session = Depends(get_db),
):
    p = load_project(db, project_id)
    if stage not in ("", "render", "construction", "finished"):
        raise HTTPException(400, "Неизвестный этап")
    next_order = max((ph.order for ph in p.photos), default=-1) + 1
    errors = []
    for f in files:
        try:
            stored = save_image(await read_upload(f), f"projects/{p.id}")
        except (ImageError, HTTPException) as exc:
            errors.append(f"{f.filename}: {getattr(exc, 'detail', exc)}")
            continue
        p.photos.append(ProjectPhoto(stage=stage, order=next_order, **stored))
        next_order += 1
    if not p.cover and p.photos:
        p.cover, p.cover_thumb = p.photos[0].image, p.photos[0].thumb
    db.commit()
    return {"project": project_out(load_project(db, project_id)), "errors": errors}


@router.post("/projects/{project_id}/photos/reorder")
def reorder_photos(project_id: int, payload: ReorderIn, db: Session = Depends(get_db)):
    load_project(db, project_id)
    # Только фото этого объекта: id чужих фото молча пропускаются
    apply_reorder(db, ProjectPhoto, payload.ids, ProjectPhoto.project_id == project_id)
    return project_out(load_project(db, project_id))


class CoverIn(BaseModel):
    photo_id: int


@router.post("/projects/{project_id}/cover")
def set_cover(project_id: int, payload: CoverIn, db: Session = Depends(get_db)):
    p = load_project(db, project_id)
    ph = next((x for x in p.photos if x.id == payload.photo_id), None)
    if not ph:
        raise HTTPException(404, "Фото не найдено")
    p.cover, p.cover_thumb = ph.image, ph.thumb
    db.commit()
    return project_out(load_project(db, project_id))


@router.patch("/photos/{photo_id}")
def patch_photo(photo_id: int, payload: PhotoPatch, db: Session = Depends(get_db)):
    ph = get_or_404(db, ProjectPhoto, photo_id)
    if payload.stage is not None:
        ph.stage = payload.stage
    if payload.caption is not None:
        ph.caption = payload.caption
    db.commit()
    return photo_out(ph)


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, db: Session = Depends(get_db)):
    ph = get_or_404(db, ProjectPhoto, photo_id)
    p = load_project(db, ph.project_id)
    paths = [ph.image, ph.thumb]
    was_cover = p.cover == ph.image
    p.photos.remove(ph)
    db.flush()
    if was_cover:
        first = p.photos[0] if p.photos else None
        p.cover, p.cover_thumb = (first.image, first.thumb) if first else ("", "")
    db.commit()
    cleanup_files(db, *paths)
    return project_out(load_project(db, p.id))


# ---------------------------------------------------------------- simple entities


def register_crud(path: str, model, schema, *, image: bool = False, slug: bool = False, image_dir: str = "",
                  refs: dict[str, tuple] | None = None):
    """CRUD для простых сущностей: список, создание, правка, удаление, порядок, картинка.

    refs — поля-ссылки на другие записи: {"project_id": (Project, "Объект не найден")}.
    """
    name = model.__tablename__
    image_fields = ("image",) if image else ()

    def out(obj):
        return row(obj, image_fields)

    def check_refs(db: Session, payload) -> None:
        for field, (ref_model, message) in (refs or {}).items():
            require_ref(db, ref_model, getattr(payload, field), message)

    def list_items(db: Session = Depends(get_db)):
        return [out(o) for o in db.scalars(select(model).order_by(model.order, model.id))]

    def create_item(payload: schema, db: Session = Depends(get_db)):
        check_refs(db, payload)
        obj = model(**payload.model_dump(exclude={"slug"} if slug else set()))
        if slug:
            obj.slug = unique_slug(db, model, payload.slug, payload.title)
        db.add(obj)
        db.commit()
        return out(obj)

    def update_item(item_id: int, payload: schema, db: Session = Depends(get_db)):
        obj = get_or_404(db, model, item_id)
        check_refs(db, payload)
        for key, value in payload.model_dump(exclude={"slug"} if slug else set()).items():
            setattr(obj, key, value)
        if slug:
            obj.slug = unique_slug(db, model, payload.slug, payload.title, obj.id)
        db.commit()
        return out(obj)

    def delete_item(item_id: int, db: Session = Depends(get_db)):
        obj = get_or_404(db, model, item_id)
        old = getattr(obj, "image", "") if image else ""
        db.delete(obj)
        db.commit()
        if old:
            cleanup_files(db, old, thumb_of(old))
        return {"ok": True}

    def reorder_items(payload: ReorderIn, db: Session = Depends(get_db)):
        apply_reorder(db, model, payload.ids)
        return {"ok": True}

    router.add_api_route(path, list_items, methods=["GET"], name=f"{name}_list")
    router.add_api_route(path, create_item, methods=["POST"], status_code=201, name=f"{name}_create")
    router.add_api_route(f"{path}/reorder", reorder_items, methods=["POST"], name=f"{name}_reorder")
    router.add_api_route(f"{path}/{{item_id}}", update_item, methods=["PUT"], name=f"{name}_update")
    router.add_api_route(f"{path}/{{item_id}}", delete_item, methods=["DELETE"], name=f"{name}_delete")

    if image:
        async def upload_image(item_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
            obj = get_or_404(db, model, item_id)
            stored = store_upload(await read_upload(file), image_dir)
            old = obj.image
            obj.image = stored["image"]
            db.commit()
            if old and old != obj.image:
                cleanup_files(db, old, thumb_of(old))
            return out(obj)

        def remove_image(item_id: int, db: Session = Depends(get_db)):
            obj = get_or_404(db, model, item_id)
            old, obj.image = obj.image, ""
            db.commit()
            cleanup_files(db, old, thumb_of(old))
            return out(obj)

        router.add_api_route(f"{path}/{{item_id}}/image", upload_image, methods=["POST"], name=f"{name}_image")
        router.add_api_route(f"{path}/{{item_id}}/image", remove_image, methods=["DELETE"],
                             name=f"{name}_image_delete")


register_crud("/services", Service, ServiceIn, image=True, slug=True, image_dir="services")
register_crud("/equipment", Equipment, EquipmentIn, image=True, image_dir="equipment")
register_crud("/hero", HeroSlide, HeroSlideIn, image=True, image_dir="hero",
              refs={"project_id": (Project, "Объект для слайда не найден — выберите его из списка")})
register_crud("/advantages", Advantage, AdvantageIn)
register_crud("/documents", Document, DocumentIn, image=True, image_dir="documents")
register_crud("/cities", City, TaxonomyIn, slug=True)
register_crud("/types", ProjectType, TaxonomyIn, slug=True)


# ---------------------------------------------------------------- leads


def lead_out(lead: Lead) -> dict:
    data = row(lead)
    data["project_title"] = lead.project.title.get("ru", "") if lead.project else ""
    data["realty_title"] = lead.crm_project_name or ""  # жилой комплекс из каталога CRM
    data["service_title"] = lead.service.title.get("ru", "") if lead.service else ""
    return data


PHONE_QUERY = re.compile(r"^\+?[0-9\s().-]+$")


def leads_query(status: str | None, kind: str | None, q: str | None):
    query = select(Lead).options(selectinload(Lead.project), selectinload(Lead.service))
    if status:
        query = query.where(Lead.status == status)
    if kind:
        query = query.where(Lead.kind == kind)
    if q and q.strip():
        text = q.strip()
        # % и _ ищутся как обычные символы, а не как «что угодно»
        like = "%" + text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        conditions = [field.ilike(like, escape="\\")
                      for field in (Lead.name, Lead.phone, Lead.email, Lead.company, Lead.message)]
        digits = re.sub(r"\D", "", text)
        if len(digits) >= 5 and PHONE_QUERY.match(text):
            # Телефон ищем по цифрам: «998901234567» находит заявку с «+998 (90) 123-45-67»
            phone_digits = Lead.phone
            for ch in " -().+":
                phone_digits = func.replace(phone_digits, ch, "")
            conditions.append(phone_digits.like(f"%{digits}%"))
        query = query.where(or_(*conditions))
    return query


@router.get("/leads")
def list_leads(
    status: str | None = None,
    kind: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = leads_query(status, kind, q)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(Lead.created_at.desc()).offset((page - 1) * per_page).limit(per_page)).all()
    counts = dict(db.execute(select(Lead.status, func.count(Lead.id)).group_by(Lead.status)).all())
    return {"items": [lead_out(x) for x in items], "total": total, "page": page, "per_page": per_page,
            "status_counts": counts}


CSV_FORMULA_START = ("=", "+", "-", "@", "\t", "\r")


def csv_cell(value):
    """Защита от CSV-инъекции: Excel и LibreOffice исполняют ячейку, начинающуюся с = + - @ (и таба/CR),
    как формулу (в том числе после ведущих пробелов). Такой текст — а его пишут и анонимы в форме
    заявки — получает ведущий апостроф и остаётся просто текстом."""
    if isinstance(value, str) and value.lstrip(" \n").startswith(CSV_FORMULA_START):
        return "'" + value
    return value


LEAD_STATUS_LABELS = {"new": "Новая", "in_progress": "В работе", "done": "Закрыта", "spam": "Спам"}
def export_tz() -> timezone:
    """Часовой пояс времени в выгрузке — как его видит менеджер (EXPORT_UTC_OFFSET_HOURS, по умолчанию
    Ташкент: UTC+5, без перехода на летнее время)."""
    hours = get_settings().export_utc_offset_hours
    return timezone(timedelta(hours=hours), "Ташкент" if hours == 5 else f"UTC{hours:+d}")


@router.get("/leads/export.csv")
def export_leads(status: str | None = None, kind: str | None = None, q: str | None = None,
                 db: Session = Depends(get_db)):
    items = db.scalars(leads_query(status, kind, q).order_by(Lead.created_at.desc())).all()
    buf = io.StringIO()
    buf.write("﻿")  # BOM, чтобы Excel открыл кириллицу
    writer = csv.writer(buf, delimiter=";")
    tz = export_tz()
    writer.writerow(["№", f"Дата ({tz.tzname(None)})", "Тип", "Статус", "Имя", "Телефон", "Email", "Компания", "Объект",
                     "Жилой комплекс", "Услуга", "Сообщение", "Комментарий", "Язык", "Страница"])
    for lead in items:
        p = lead_payload(lead)
        writer.writerow([csv_cell(v) for v in (
            lead.id, as_utc(lead.created_at).astimezone(tz).strftime("%d.%m.%Y %H:%M"), p["kind_label"],
            LEAD_STATUS_LABELS.get(lead.status, lead.status),
            lead.name, lead.phone, lead.email, lead.company, p["project"], p["realty"], p["service"],
            lead.message, lead.note, lead.lang, lead.page_url,
        )])
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="leads.csv"'},
    )


@router.get("/leads/{lead_id}")
def get_lead(lead_id: int, db: Session = Depends(get_db)):
    return lead_out(get_or_404(db, Lead, lead_id))


@router.patch("/leads/{lead_id}")
def patch_lead(lead_id: int, payload: LeadPatch, db: Session = Depends(get_db)):
    lead = get_or_404(db, Lead, lead_id)
    if payload.status is not None:
        lead.status = payload.status
    if payload.note is not None:
        lead.note = payload.note
    db.commit()
    return lead_out(lead)


@router.post("/leads/{lead_id}/resend")
def resend_lead(lead_id: int, db: Session = Depends(get_db)):
    """Повтор — только в каналы, где прошлая попытка не удалась (или которые включили позже).
    Удачные не трогаем: повтор в CRM через 10 минут заводит второе обращение, а их результат
    («Обращение №…») затёрся бы новым — в том числе ошибкой, если CRM сейчас недоступна."""
    lead = get_or_404(db, Lead, lead_id)
    cfg = site_settings.load(db, "integrations")
    enabled = enabled_channels(cfg)
    if not enabled:
        raise HTTPException(400, "Нет включённых каналов — настройте их в разделе «Интеграции»")
    previous = dict(lead.delivery or {})
    pending = [ch for ch in enabled if not (previous.get(ch) or {}).get("ok")]
    if not pending:
        raise HTTPException(409, "Заявка уже доставлена во все включённые каналы — повтор создал бы дубли")
    payload = lead_payload(lead)
    lead.delivery = {**previous, **{ch: run_channel(ch, cfg, payload) for ch in pending}}
    db.commit()
    return lead_out(lead)


@router.delete("/leads/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    db.delete(get_or_404(db, Lead, lead_id))
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------- settings


@router.get("/settings/site")
def get_site_settings(db: Session = Depends(get_db)):
    return site_settings.load(db, "site").model_dump()


@router.put("/settings/site")
def put_site_settings(payload: SiteSettingsIn, db: Session = Depends(get_db)):
    site_settings.save(db, "site", payload)
    return payload.model_dump()


def mask_token(token: str) -> str:
    return f"{token[:4]}…{token[-4:]}" if len(token) > 12 else ("задан" if token else "")


INTEGRATION_SECRETS = ("telegram_bot_token", "crm_api_key")  # в админку отдаются только маской


def integrations_out(cfg: IntegrationSettings) -> dict:
    data = cfg.model_dump()
    for key in INTEGRATION_SECRETS:
        data[key] = ""
        data[f"{key}_masked"] = mask_token(getattr(cfg, key))
    return data


def keep_secret(new: str | None, current: str, clear: bool) -> str:
    """Секрет из формы: пусто или прежняя маска — оставить сохранённый, флаг очистки — стереть."""
    if clear:
        return ""
    new = (new or "").strip()
    if not new or new == mask_token(current):
        return current
    return new


class IntegrationsIn(IntegrationSettings):
    telegram_bot_token: str | None = None  # пусто — оставить сохранённый токен
    clear_telegram_token: bool = False
    crm_api_key: str | None = None  # пусто — оставить сохранённый ключ
    clear_crm_api_key: bool = False

    # Счётчики сайт подключает, только если ID в ожидаемом формате (components/site/Analytics.tsx),
    # иначе молча пропускает — ошибку в ID видно лишь по пустой статистике. Проверяем при сохранении.
    @field_validator("yandex_metrika_id")
    @classmethod
    def _metrika_id(cls, v: str) -> str:
        v = v.strip()
        if v and not re.fullmatch(r"\d{5,12}", v):
            raise ValueError("Номер счётчика Яндекс Метрики — только цифры, например 98765432")
        return v

    @field_validator("google_analytics_id")
    @classmethod
    def _ga_id(cls, v: str) -> str:
        v = v.strip().upper()
        if v and not re.fullmatch(r"G-[A-Z0-9]{4,16}", v):
            raise ValueError("Measurement ID Google Analytics — в формате G-XXXXXXXXXX")
        return v

    @field_validator("email_recipients")
    @classmethod
    def _recipients(cls, v: str) -> str:
        # Опечатка в адресе иначе всплывает только при отправке заявки
        recipients = [r.strip() for r in v.split(",") if r.strip()]
        for r in recipients:
            try:
                validate_email(r, check_deliverability=False)
            except EmailNotValidError:
                raise ValueError(f"Получатель «{r[:60]}» — неверный адрес почты") from None
        return ", ".join(recipients)


@router.get("/settings/integrations")
def get_integrations(db: Session = Depends(get_db)):
    return integrations_out(site_settings.load(db, "integrations"))


@router.put("/settings/integrations")
def put_integrations(payload: IntegrationsIn, db: Session = Depends(get_db)):
    current = site_settings.load(db, "integrations")
    data = payload.model_dump(exclude={"clear_telegram_token", "clear_crm_api_key"})
    data["telegram_bot_token"] = keep_secret(payload.telegram_bot_token, current.telegram_bot_token,
                                             payload.clear_telegram_token)
    data["crm_api_key"] = keep_secret(payload.crm_api_key, current.crm_api_key, payload.clear_crm_api_key)
    cfg = IntegrationSettings.model_validate(data)
    # Защита от SSRF: сервер сайта сам ходит по этим адресам — внутренние адреса не сохраняем.
    # При запросе адрес проверяется ещё раз (app/outbound.py).
    for field, label in (("crm_url", "Адрес CRM"), ("webhook_url", "URL вебхука")):
        value = getattr(cfg, field)
        if value:
            try:
                outbound.check_url(value)
            except outbound.BlockedURL as exc:
                raise HTTPException(422, f"{label}: {exc}") from None
    site_settings.save(db, "integrations", cfg)
    # Адрес или ключ могли смениться — следующий просмотр «Квартир» заберёт каталог заново
    crm_catalog.reset_cache()
    return integrations_out(cfg)


@router.post("/settings/integrations/catalog")
def refresh_catalog(db: Session = Depends(get_db)):
    """Проверка раздела «Квартиры»: забирает каталог из CRM заново и считает комплексы и квартиры."""
    cfg = site_settings.load(db, "integrations")
    if not (cfg.crm_url and cfg.crm_api_key):
        return {"ok": False, "detail": "Сначала укажите адрес CRM и API-ключ."}
    try:
        data = crm_catalog.get_catalog(cfg.model_copy(update={"crm_catalog_enabled": True}), force=True)
    except crm_catalog.CatalogError as exc:
        return {"ok": False, "detail": str(exc)}
    projects = data["projects"]
    free = sum(p["stats"]["free"] for p in projects)
    note = "" if cfg.crm_catalog_enabled else " Раздел на сайте пока выключен."
    return {"ok": True, "detail": f"Каталог получен: комплексов — {len(projects)}, свободных квартир — {free}.{note}"}


@router.post("/settings/integrations/test")
def test_integration(payload: TestChannelIn, db: Session = Depends(get_db)):
    cfg = site_settings.load(db, "integrations")
    if payload.channel == "crm":
        # Для CRM — только проверка ключа: тестовая заявка завела бы в CRM лишнего клиента.
        return check_crm(cfg)
    return run_channel(payload.channel, cfg, TEST_PAYLOAD)


# ---------------------------------------------------------------- users


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "is_active": u.is_active,
            "created_at": as_utc(u.created_at)}


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    return [user_out(u) for u in db.scalars(select(User).order_by(User.id))]


@router.post("/users", status_code=201)
def create_user(payload: UserIn, db: Session = Depends(get_db)):
    if not payload.password:
        raise HTTPException(400, "Задайте пароль (не короче 10 символов)")
    if db.scalar(select(User).where(func.lower(User.email) == payload.email.lower())):
        raise HTTPException(400, "Пользователь с таким email уже есть")
    u = User(email=payload.email.lower(), name=payload.name, is_active=payload.is_active,
             password_hash=hash_password(payload.password))
    db.add(u)
    db.commit()
    return user_out(u)


@router.put("/users/{user_id}")
def update_user(user_id: int, payload: UserIn, me: User = Depends(current_user), db: Session = Depends(get_db)):
    u = get_or_404(db, User, user_id)
    clash = db.scalar(select(User).where(func.lower(User.email) == payload.email.lower(), User.id != u.id))
    if clash:
        raise HTTPException(400, "Пользователь с таким email уже есть")
    if u.id == me.id and not payload.is_active:
        raise HTTPException(400, "Нельзя отключить свою учётную запись")
    u.email, u.name, u.is_active = payload.email.lower(), payload.name, payload.is_active
    if payload.password:
        u.password_hash = hash_password(payload.password)
    db.commit()
    return user_out(u)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, me: User = Depends(current_user), db: Session = Depends(get_db)):
    if user_id == me.id:
        raise HTTPException(400, "Нельзя удалить свою учётную запись")
    db.delete(get_or_404(db, User, user_id))
    db.commit()
    return {"ok": True}
