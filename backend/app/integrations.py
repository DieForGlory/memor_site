"""Доставка заявок: Telegram, почта, вебхук и CRM MEMOR. Каждый канал независим и не роняет остальные.

Адреса CRM и вебхука задаёт админ, поэтому запросы к ним идут через app/outbound.py (защита от SSRF).
"""
import html
import logging
import re
import smtplib
from email.message import EmailMessage

import httpx

from . import outbound, site_settings
from .config import get_settings
from .db import SessionLocal
from .models import Lead
from .site_settings import IntegrationSettings

log = logging.getLogger(__name__)

TIMEOUT = 8.0

KIND_LABELS = {
    "project": "Строительство объекта",
    "tender": "Тендер",
    "subcontract": "Субподряд и поставки",
    "apartment": "Покупка квартиры",
    "other": "Другое",
}


def lead_payload(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "kind": lead.kind,
        "kind_label": KIND_LABELS.get(lead.kind, lead.kind),
        "name": lead.name,
        "phone": lead.phone,
        "email": lead.email,
        "company": lead.company,
        "message": lead.message,
        "project": (lead.project.title.get("ru", "") if lead.project else ""),
        "service": (lead.service.title.get("ru", "") if lead.service else ""),
        # Жилой комплекс из каталога CRM: id уходит в CRM, название — в уведомления
        "crm_project_id": lead.crm_project_id,
        "realty": lead.crm_project_name,
        "page_url": lead.page_url,
        "lang": lead.lang,
        "created_at": lead.created_at.isoformat(),
    }


def _lines(p: dict) -> list[tuple[str, str]]:
    rows = [
        ("Тип", p["kind_label"]),
        ("Имя", p["name"]),
        ("Телефон", p["phone"]),
        ("Email", p["email"]),
        ("Компания", p["company"]),
        ("Объект", p["project"]),
        ("Жилой комплекс", p.get("realty") or ""),
        ("Услуга", p["service"]),
        ("Сообщение", p["message"]),
        ("Страница", p["page_url"]),
    ]
    return [(k, v) for k, v in rows if v]


def send_telegram(cfg: IntegrationSettings, text: str) -> None:
    if not cfg.telegram_bot_token or not cfg.telegram_chat_id:
        raise RuntimeError("Не заданы токен бота или chat_id")
    resp = httpx.post(
        f"https://api.telegram.org/bot{cfg.telegram_bot_token}/sendMessage",
        json={"chat_id": cfg.telegram_chat_id, "text": text, "parse_mode": "HTML",
              "disable_web_page_preview": True},
        timeout=TIMEOUT,
    )
    if resp.status_code != 200:
        # Тело ответа Telegram не содержит токена — его можно показывать в админке.
        raise RuntimeError(f"Telegram ответил {resp.status_code}: {resp.text[:200]}")


def send_email(cfg: IntegrationSettings, subject: str, body: str) -> None:
    env = get_settings()
    recipients = [r.strip() for r in cfg.email_recipients.split(",") if r.strip()]
    if not env.smtp_host:
        raise RuntimeError("SMTP не настроен (SMTP_HOST в backend/.env)")
    if not recipients:
        raise RuntimeError("Не указаны получатели")
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = env.smtp_from or env.smtp_user
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)
    with smtplib.SMTP(env.smtp_host, env.smtp_port, timeout=TIMEOUT) as smtp:
        smtp.starttls()
        if env.smtp_user:
            smtp.login(env.smtp_user, env.smtp_password)
        smtp.send_message(msg)


def send_webhook(cfg: IntegrationSettings, payload: dict) -> None:
    if not cfg.webhook_url:
        raise RuntimeError("Не указан URL вебхука")
    try:
        resp = outbound.post(cfg.webhook_url, json=payload, timeout=TIMEOUT)
    except outbound.BlockedURL as exc:
        raise RuntimeError(f"URL вебхука не принят: {exc}") from None
    except httpx.TimeoutException:
        raise RuntimeError("Вебхук не ответил вовремя — попробуйте позже") from None
    except httpx.HTTPError:
        # Текст исключения (сообщение ОС о соединении) в админку не отдаём.
        raise RuntimeError("Не удалось связаться с вебхуком — проверьте адрес и доступность сервера") from None
    if 300 <= resp.status_code < 400:
        raise RuntimeError(f"Вебхук перенаправляет запрос (код {resp.status_code}) — укажите конечный адрес")
    if resp.status_code >= 400:
        raise RuntimeError(f"Вебхук ответил {resp.status_code}")


# ---------------------------------------------------------------- CRM MEMOR

CRM_PATH = "/api/public/applications/"
CRM_LANGS = {"ru", "uz"}  # английского в CRM нет — для en язык не передаём
CRM_FIELD_LABELS = {
    "phone_number": "телефон",
    "full_name": "имя",
    "notes": "комментарий",
    "project_id": "объект CRM",
    "language": "язык",
}


def normalize_phone(phone: str) -> str:
    """«+998 97 425-77-77» → «+998974257777»: CRM принимает только цифры и ведущий плюс."""
    digits = re.sub(r"[^0-9]", "", phone)
    return f"+{digits}" if phone.strip().startswith("+") else digits


def _crm_notes(p: dict) -> str:
    rows = [
        ("Заявка с сайта", f"№{p['id']}" if p.get("id") else ""),
        ("Тип", p.get("kind_label", "")),
        ("Компания", p.get("company", "")),
        ("Email", p.get("email", "")),
        ("Объект на сайте", p.get("project", "")),
        ("Жилой комплекс", p.get("realty") or ""),
        ("Услуга", p.get("service", "")),
        ("Сообщение", p.get("message", "")),
        ("Страница", p.get("page_url", "")),
    ]
    return "\n".join(f"{k}: {v}" for k, v in rows if v)


def crm_body(p: dict) -> dict:
    """Тело запроса к CRM. Источник «Сайт» CRM определяет по utm_source=site."""
    body = {
        "phone_number": normalize_phone(p["phone"]),
        "full_name": p.get("name", ""),
        "notes": _crm_notes(p),
        "utm_source": "site",
        "utm_medium": "form",
        "utm_campaign": p.get("kind", ""),
    }
    if p.get("crm_project_id"):
        body["project_id"] = p["crm_project_id"]
    if p.get("lang") in CRM_LANGS:
        body["language"] = p["lang"]
    return body


def _crm_post(cfg: IntegrationSettings, body: dict) -> httpx.Response:
    if not cfg.crm_url.startswith(("https://", "http://")):
        raise RuntimeError("Некорректный адрес CRM — укажите его полностью, с https://")
    if not cfg.crm_api_key:
        raise RuntimeError("Не задан API-ключ CRM")
    try:
        return outbound.post(f"{cfg.crm_url}{CRM_PATH}", json=body,
                             headers={"X-API-Key": cfg.crm_api_key}, timeout=TIMEOUT)
    except outbound.BlockedURL as exc:
        raise RuntimeError(f"Адрес CRM не принят: {exc}") from None
    except httpx.TimeoutException:
        raise RuntimeError("CRM не ответила вовремя — попробуйте позже") from None
    except httpx.HTTPError:
        # Текст исключения httpx не показываем: он на английском и менеджеру ничего не скажет.
        raise RuntimeError("Не удалось связаться с CRM — проверьте адрес и доступность сервера") from None


def _json(resp: httpx.Response):
    try:
        return resp.json()
    except ValueError:
        return None


def _crm_reason(data) -> str:
    """Текст ошибки из ответа CRM: detail/error или ошибки полей сериализатора."""
    if isinstance(data, dict):
        for key in ("detail", "error"):
            if isinstance(data.get(key), str):
                return data[key]
        parts = []
        for field, msgs in data.items():
            text = "; ".join(map(str, msgs)) if isinstance(msgs, list) else str(msgs)
            parts.append(f"{CRM_FIELD_LABELS.get(field, field)}: {text}")
        return "; ".join(parts)
    if isinstance(data, list):
        return "; ".join(map(str, data))
    return ""


def _crm_error(resp: httpx.Response) -> str:
    code = resp.status_code
    reason = _crm_reason(_json(resp))[:200].rstrip(". ")
    if code == 401:
        return f"CRM не приняла API-ключ: {reason or 'ключ отсутствует или недействителен'}"
    if code == 403:
        return (f"CRM отказала в доступе: {reason or 'нет прав'}. Проверьте право «Создание заявок» "
                "(CREATE_APPLICATION), список IP и привязку ключа к компании")
    if code == 400:
        return f"CRM отклонила данные заявки: {reason or 'ошибка проверки данных'}"
    if code == 404:
        return "По адресу CRM не найден приём заявок (404) — проверьте адрес CRM"
    if code == 429:
        return "Превышен лимит запросов для API-ключа CRM — попробуйте позже"
    if code >= 500:
        return f"CRM временно недоступна (ошибка {code})"
    if 300 <= code < 400:
        return f"CRM перенаправляет запрос (код {code}) — проверьте адрес, возможно нужен https://"
    return f"CRM ответила {code}" + (f": {reason}" if reason else "")


def send_crm(cfg: IntegrationSettings, payload: dict) -> str:
    """Создаёт обращение в CRM MEMOR и возвращает текст для статуса доставки."""
    resp = _crm_post(cfg, crm_body(payload))
    if not resp.is_success:
        raise RuntimeError(_crm_error(resp))
    data = _json(resp)
    inquiry = data.get("inquiry_id") if isinstance(data, dict) else None
    deal = data.get("deal_id") if isinstance(data, dict) else None
    if inquiry and deal:
        return f"Обращение №{inquiry}, сделка №{deal} в CRM"
    if inquiry:
        return f"Обращение №{inquiry} в CRM"
    return "Отправлено в CRM"


def check_crm(cfg: IntegrationSettings) -> dict:
    """Проверка ключа без создания клиента: CRM проверяет ключ раньше данных,
    поэтому на пустое тело ответ 400 с ошибкой phone_number означает, что ключ принят."""
    try:
        resp = _crm_post(cfg, {})
        data = _json(resp)
        if resp.status_code == 400 and isinstance(data, dict) and "phone_number" in data:
            return {"ok": True, "detail": "Ключ принят, CRM на связи"}
        if resp.is_success:
            raise RuntimeError(f"CRM ответила {resp.status_code} на пустую заявку — проверьте адрес CRM")
        raise RuntimeError(_crm_error(resp))
    except Exception as exc:
        return {"ok": False, "detail": error_text("crm", exc)}


def _telegram_text(p: dict) -> str:
    head = f"<b>Новая заявка №{p['id']}</b> — MEMOR GROUP"
    body = "\n".join(f"<b>{k}:</b> {html.escape(v)}" for k, v in _lines(p))
    return f"{head}\n\n{body}"


def _email_body(p: dict) -> str:
    return "\n".join(f"{k}: {v}" for k, v in _lines(p))


def error_text(channel: str, exc: Exception) -> str:
    """Текст ошибки канала для админки. Свои сообщения (RuntimeError) — как есть; сырой текст
    исключений ОС, SMTP и httpx не показываем (адреса, порты, «[WinError …]»), он уходит в журнал."""
    if isinstance(exc, RuntimeError):
        return str(exc)[:300]
    log.warning("Канал %s: %r", channel, exc)
    if isinstance(exc, httpx.TimeoutException):
        return "Сервер не ответил вовремя — попробуйте позже"
    if isinstance(exc, httpx.HTTPError):
        return "Не удалось связаться с сервером — проверьте настройки канала"
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return "SMTP-сервер не принял логин или пароль (backend/.env)"
    if isinstance(exc, smtplib.SMTPException):
        return "SMTP-сервер отклонил письмо — проверьте получателей и настройки SMTP"
    if isinstance(exc, OSError):
        return "Не удалось подключиться к серверу — проверьте настройки канала"
    return "Не удалось отправить — подробности в журнале сервера"


def run_channel(channel: str, cfg: IntegrationSettings, payload: dict) -> dict:
    try:
        detail = "Отправлено"
        if channel == "telegram":
            send_telegram(cfg, _telegram_text(payload))
        elif channel == "email":
            send_email(cfg, f"Заявка №{payload['id']} с сайта MEMOR GROUP", _email_body(payload))
        elif channel == "webhook":
            send_webhook(cfg, payload)
        elif channel == "crm":
            detail = send_crm(cfg, payload)
        else:
            raise RuntimeError("Неизвестный канал")
        return {"ok": True, "detail": detail}
    except Exception as exc:  # канал не должен ронять остальные; текст ошибки виден в админке
        return {"ok": False, "detail": error_text(channel, exc)}


def enabled_channels(cfg: IntegrationSettings) -> list[str]:
    flags = {
        "telegram": cfg.telegram_enabled,
        "email": cfg.email_enabled,
        "webhook": cfg.webhook_enabled,
        "crm": cfg.crm_enabled,
    }
    return [ch for ch, on in flags.items() if on]


def deliver_lead(lead_id: int) -> None:
    """Фоновая задача: рассылает заявку по включённым каналам и записывает результат в заявку."""
    with SessionLocal() as db:
        lead = db.get(Lead, lead_id)
        if not lead:
            return
        cfg = site_settings.load(db, "integrations")
        payload = lead_payload(lead)
        lead.delivery = {ch: run_channel(ch, cfg, payload) for ch in enabled_channels(cfg)}
        db.commit()


TEST_PAYLOAD = {
    "id": 0,
    "kind": "other",
    "kind_label": "Проверка интеграции",
    "name": "Тестовая заявка",
    "phone": "+998 00 000 00 00",
    "email": "",
    "company": "",
    "message": "Если вы видите это сообщение, канал настроен верно.",
    "project": "",
    "service": "",
    "page_url": "",
    "lang": "ru",
    "created_at": "",
}
