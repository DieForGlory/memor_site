"""Сериализация для публичного API: переводимые поля отдаются строкой на нужном языке."""
from .i18n import pick
from .images import media_url, thumb_of
from .models import Advantage, City, Document, Equipment, HeroSlide, Project, ProjectPhoto, ProjectType, Service

ROLE_LABELS = {
    "general": {"ru": "Генеральный подрядчик", "uz": "Bosh pudratchi", "en": "General contractor"},
    "contractor": {"ru": "Подрядчик", "uz": "Pudratchi", "en": "Contractor"},
    "reconstruction": {"ru": "Реконструкция", "uz": "Rekonstruksiya", "en": "Reconstruction"},
}
STATUS_LABELS = {
    "completed": {"ru": "Завершён", "uz": "Yakunlangan", "en": "Completed"},
    "in_progress": {"ru": "В работе", "uz": "Jarayonda", "en": "In progress"},
}
SECTOR_LABELS = {
    "state": {"ru": "Государственные", "uz": "Davlat obyektlari", "en": "Public sector"},
    "commercial": {"ru": "Коммерческие", "uz": "Tijorat obyektlari", "en": "Commercial"},
}
SECTOR_SINGLE = {
    "state": {"ru": "Государственный объект", "uz": "Davlat obyekti", "en": "Public sector"},
    "commercial": {"ru": "Коммерческий объект", "uz": "Tijorat obyekti", "en": "Commercial"},
}
STAGE_LABELS = {
    "render": {"ru": "Проект", "uz": "Loyiha", "en": "Design"},
    "construction": {"ru": "Строительство", "uz": "Qurilish", "en": "Construction"},
    "finished": {"ru": "Результат", "uz": "Natija", "en": "Result"},
}


def taxonomy(obj: City | ProjectType | None, lang: str) -> dict | None:
    if not obj:
        return None
    return {"id": obj.id, "slug": obj.slug, "title": pick(obj.title, lang)}


def role_label(p: Project, lang: str) -> str:
    return pick(p.role_text, lang) or pick(ROLE_LABELS.get(p.role), lang)


def project_card(p: Project, lang: str) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        "title": pick(p.title, lang),
        "kicker": pick(p.kicker, lang),
        "sector": p.sector,
        "role": p.role,
        "role_label": role_label(p, lang),
        "status": p.status,
        "status_label": pick(STATUS_LABELS.get(p.status), lang),
        "type": taxonomy(p.type, lang),
        "city": taxonomy(p.city, lang),
        "address": pick(p.address, lang),
        "lat": p.lat,
        "lng": p.lng,
        "year": p.year,
        "cover": media_url(p.cover),
        "cover_thumb": media_url(p.cover_thumb or thumb_of(p.cover)),
        "service_ids": [s.id for s in p.services],
        "photos_count": len(p.photos),
    }


def photo(ph: ProjectPhoto, lang: str) -> dict:
    return {
        "id": ph.id,
        "image": media_url(ph.image),
        "thumb": media_url(ph.thumb),
        "width": ph.width,
        "height": ph.height,
        "stage": ph.stage,
        "caption": pick(ph.caption, lang),
    }


def project_detail(p: Project, lang: str) -> dict:
    data = project_card(p, lang)
    data.update(
        client=pick(p.client, lang),
        area_m2=p.area_m2,
        description=pick(p.description, lang),
        sector_label=pick(SECTOR_SINGLE.get(p.sector), lang),
        photos=[photo(ph, lang) for ph in p.photos],
        services=[service_card(s, lang) for s in p.services if s.is_published],
        stages=[
            {"key": key, "label": pick(label, lang)}
            for key, label in STAGE_LABELS.items()
            if any(ph.stage == key for ph in p.photos)
        ],
    )
    return data


def service_card(s: Service, lang: str) -> dict:
    return {
        "id": s.id,
        "slug": s.slug,
        "title": pick(s.title, lang),
        "short": pick(s.short, lang),
        "icon": s.icon,
        "image": media_url(s.image),
    }


def equipment(e: Equipment, lang: str) -> dict:
    return {
        "id": e.id,
        "title": pick(e.title, lang),
        "description": pick(e.description, lang),
        "image": media_url(e.image),
        "thumb": media_url(thumb_of(e.image)),
    }


def hero_slide(h: HeroSlide, lang: str) -> dict:
    project = h.project if h.project and h.project.is_published else None
    return {
        "id": h.id,
        "image": media_url(h.image),
        "caption": pick(h.caption, lang) or (pick(project.title, lang) if project else ""),
        "project_slug": project.slug if project else None,
    }


def advantage(a: Advantage, lang: str) -> dict:
    return {"id": a.id, "title": pick(a.title, lang), "text": pick(a.text, lang)}


def document(d: Document, lang: str) -> dict:
    return {
        "id": d.id,
        "kind": d.kind,
        "title": pick(d.title, lang),
        "image": media_url(d.image),
        "thumb": media_url(thumb_of(d.image)),
        "valid_until": d.valid_until.isoformat() if d.valid_until else None,
    }
