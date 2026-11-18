"""Каталог квартир из CRM MEMOR: жилые комплексы, планировки и свободные квартиры.

Сайт забирает данные у CRM по ключу партнёра — тот же адрес и ключ, что для заявок;
ключу нужны права VIEW_PROJECTS (проекты) и VIEW_BUILDINGS (помещения).
Снимок каталога живёт в памяти 5 минут: посетитель не ждёт CRM, а CRM не получает
запрос на каждый просмотр. Если CRM недоступна, отдаём последний удачный снимок.

Статусы помещений — публичные (free / booked / sold / unavailable), цена — только
у свободных: так их отдаёт сама CRM (apps/realty/site_api.py).
"""
import logging
import threading
import time
from decimal import Decimal, InvalidOperation

import httpx

from . import outbound
from .site_settings import IntegrationSettings

log = logging.getLogger(__name__)

TTL = 300  # сколько секунд снимок считается свежим
RETRY_AFTER = 60  # после сбоя CRM не спрашиваем её чаще раза в минуту
TIMEOUT = 8.0
PAGE_SIZE = 500  # максимум CRM для /v1/properties/
MAX_PAGES = 20  # предохранитель: 10 000 помещений
PROJECTS_PATH = "/api/public/projects/"
UNITS_PATH = "/api/public/v1/properties/"


class CatalogError(RuntimeError):
    """CRM не отдала каталог: текст ошибки показывается в админке."""


_lock = threading.Lock()
_cache: dict = {"key": None, "at": 0.0, "data": None, "error": "", "error_at": 0.0}


def configured(cfg: IntegrationSettings) -> bool:
    return bool(cfg.crm_catalog_enabled and cfg.crm_url and cfg.crm_api_key)


def reset_cache() -> None:
    with _lock:
        _cache.update(key=None, at=0.0, data=None, error="", error_at=0.0)


# ------------------------------------------------------------------ запросы к CRM

def _get(cfg: IntegrationSettings, path: str, params: dict | None = None):
    # Адрес CRM задаёт админ — запрос идёт через защиту от SSRF (app/outbound.py)
    try:
        resp = outbound.get(
            f"{cfg.crm_url}{path}",
            params=params,
            headers={"X-API-Key": cfg.crm_api_key, "Accept": "application/json"},
            timeout=TIMEOUT,
        )
    except outbound.BlockedURL as exc:
        raise CatalogError(f"Адрес CRM не принят: {exc}") from exc
    except httpx.HTTPError as exc:
        raise CatalogError(f"CRM недоступна ({exc.__class__.__name__}). Проверьте адрес CRM.") from exc
    if 300 <= resp.status_code < 400:
        raise CatalogError(f"CRM перенаправляет запрос (код {resp.status_code}) — проверьте адрес, возможно нужен https://")
    if resp.status_code == 401:
        raise CatalogError("CRM не приняла ключ: проверьте API-ключ.")
    if resp.status_code == 403:
        raise CatalogError("У ключа нет прав на каталог: нужны VIEW_PROJECTS и VIEW_BUILDINGS (или IP сайта не разрешён).")
    if resp.status_code >= 400:
        raise CatalogError(f"CRM ответила {resp.status_code} на {path}")
    try:
        return resp.json()
    except ValueError as exc:
        raise CatalogError("CRM вернула не JSON — проверьте адрес CRM.") from exc


def _results(data) -> list:
    """Список DRF: голый массив или страница {"results": [...]}."""
    if isinstance(data, dict):
        return list(data.get("results") or [])
    return list(data or [])


def _num(value) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(Decimal(str(value)))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _all_projects(cfg: IntegrationSettings) -> list:
    rows, page = [], 1
    while page <= MAX_PAGES:
        data = _get(cfg, PROJECTS_PATH, {"page": page} if page > 1 else None)
        rows += _results(data)
        if not isinstance(data, dict) or not data.get("next"):
            return rows
        page += 1
    return rows


def _all_units(cfg: IntegrationSettings) -> list:
    rows, page = [], 1
    while page <= MAX_PAGES:
        data = _get(cfg, UNITS_PATH, {"page": page, "page_size": PAGE_SIZE})
        rows += _results(data)
        if page >= int(data.get("pages") or 1):
            return rows
        page += 1
    return rows


# ------------------------------------------------------------------ сборка каталога

def _unit(u: dict) -> dict:
    layout = u.get("layout") or {}
    return {
        "id": u.get("id"),
        "building": u.get("building_name") or "",
        "number": u.get("unit_number") or "",
        "type": u.get("property_type") or "APARTMENT",
        "rooms": u.get("rooms"),
        "area": _num(u.get("area")),
        "floor": u.get("floor"),
        "floors_total": u.get("floors_total"),
        "finishing": u.get("finishing_type") or "",
        "price": _num(u.get("price")),
        "price_per_sqm": _num(u.get("price_per_sqm")),
        "layout_name": layout.get("name") or "",
        "layout_image": layout.get("image"),
    }


def _layouts(units: list[dict]) -> list[dict]:
    """
    Типы квартир для карточек: по комнатности (у коммерции и парковок — по типу).
    В CRM планировка бывает своя у каждого помещения, поэтому группируем не по ней,
    а по тому, как выбирает покупатель: «студия», «1-комнатная», «2-комнатная»…
    Картинка — первая найденная планировка группы.
    """
    groups: dict[tuple, dict] = {}
    for u in units:
        rooms = u["rooms"] if u["type"] == "APARTMENT" else None
        key = (u["type"], rooms)
        g = groups.setdefault(key, {
            "type": u["type"], "rooms": rooms, "image": u["layout_image"],
            "count": 0, "area_min": None, "area_max": None, "price_from": None,
        })
        g["count"] += 1
        g["image"] = g["image"] or u["layout_image"]
        if u["area"] is not None:
            g["area_min"] = u["area"] if g["area_min"] is None else min(g["area_min"], u["area"])
            g["area_max"] = u["area"] if g["area_max"] is None else max(g["area_max"], u["area"])
        if u["price"]:
            g["price_from"] = u["price"] if g["price_from"] is None else min(g["price_from"], u["price"])
    order = {"APARTMENT": 0, "COTTAGE": 1, "COMMERCIAL": 2, "STORAGE": 3, "PARKING": 4}
    return sorted(groups.values(), key=lambda g: (order.get(g["type"], 9), g["rooms"] is None, g["rooms"] or 0))


def _images(detail: dict) -> list[str]:
    images = [img.get("image") for img in detail.get("gallery_images") or []]
    for building in detail.get("buildings") or []:
        images += [img.get("image") for img in building.get("gallery_images") or []]
    seen, out = set(), []
    for url in images:
        if url and url not in seen:
            seen.add(url)
            out.append(url)
    return out[:16]


def _project(p: dict, detail: dict, raw_units: list) -> dict:
    counts = {status: sum(1 for u in raw_units if u.get("status") == status) for status in ("free", "booked", "sold")}
    free = sorted(
        (_unit(u) for u in raw_units if u.get("status") == "free"),
        key=lambda u: (u["type"] != "APARTMENT", u["rooms"] or 0, u["area"] or 0, u["floor"] or 0),
    )
    prices = [u["price"] for u in free if u["price"]]
    areas = [u["area"] for u in free if u["area"]]
    floors = [u.get("floors_total") for u in raw_units if u.get("floors_total")]
    images = _images(detail)
    return {
        "id": p["id"],
        "name": p.get("name") or detail.get("name") or "",
        "address": p.get("address") or detail.get("address") or "",
        "description": detail.get("description") or "",
        "usp": [x for x in (detail.get("usp_1"), detail.get("usp_2"), detail.get("usp_3")) if x],
        "logo": p.get("logo") or detail.get("logo"),
        "cover": images[0] if images else None,
        "images": images,
        "buildings": [
            {"id": b.get("id"), "name": b.get("name") or "", "floors": b.get("floors_count")}
            for b in detail.get("buildings") or []
        ],
        "currency": next((u.get("price_currency") for u in raw_units if u.get("price_currency")), ""),
        "stats": {
            **counts,
            "total": len(raw_units),
            "price_from": min(prices) if prices else None,
            "area_min": min(areas) if areas else None,
            "area_max": max(areas) if areas else None,
            "floors_max": max(floors) if floors else None,
            "rooms": sorted({u["rooms"] for u in free if u["rooms"] is not None and u["type"] == "APARTMENT"}),
        },
        "layouts": _layouts(free),
        "units": free,
    }


def _fetch(cfg: IntegrationSettings) -> dict:
    projects = _all_projects(cfg)
    by_project: dict = {}
    for unit in _all_units(cfg):
        by_project.setdefault(unit.get("project"), []).append(unit)
    out = []
    for p in projects:
        try:
            detail = _get(cfg, f"{PROJECTS_PATH}{p['id']}/")
        except CatalogError as exc:
            # Описание и галерея не обязательны: квартиры покажем и без них
            log.warning("Каталог CRM: проект %s без описания: %s", p.get("id"), exc)
            detail = {}
        out.append(_project(p, detail, by_project.get(p["id"], [])))
    return {"projects": out, "fetched_at": time.time()}


# ------------------------------------------------------------------ кэш

def get_catalog(cfg: IntegrationSettings, *, force: bool = False) -> dict:
    """Снимок каталога. CatalogError — только если удачного снимка ещё не было."""
    if not configured(cfg):
        raise CatalogError("Каталог CRM выключен или не настроен.")
    key = (cfg.crm_url, cfg.crm_api_key)
    now = time.time()
    with _lock:
        same = _cache["key"] == key
        cached = _cache["data"] if same else None
        if not force and cached is not None and now - _cache["at"] < TTL:
            return cached
        if not force and same and _cache["error"] and now - _cache["error_at"] < RETRY_AFTER:
            if cached is not None:
                return cached
            raise CatalogError(_cache["error"])
    try:
        data = _fetch(cfg)
    except CatalogError as exc:
        log.warning("Каталог CRM: %s", exc)
        with _lock:
            _cache.update(key=key, error=str(exc), error_at=now)
            if not same:
                _cache.update(data=None, at=0.0)
        if cached is not None and not force:
            return cached
        raise
    with _lock:
        _cache.update(key=key, at=now, data=data, error="", error_at=0.0)
    return data


def summary(project: dict) -> dict:
    """Карточка комплекса для списка — без квартир и планировок."""
    return {k: v for k, v in project.items() if k not in ("units", "layouts", "images", "description")} | {
        "layouts_count": len(project["layouts"]),
    }


def find_project(cfg: IntegrationSettings, project_id: int) -> dict | None:
    try:
        data = get_catalog(cfg)
    except CatalogError:
        return None
    return next((p for p in data["projects"] if p["id"] == project_id), None)
