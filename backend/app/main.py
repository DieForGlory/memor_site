import logging
import mimetypes

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from starlette.datastructures import MutableHeaders

from .config import get_settings
from .routers import admin, auth, public

settings = get_settings()
log = logging.getLogger(__name__)

app = FastAPI(
    title="MEMOR GROUP API",
    version="1.0.0",
    docs_url="/api/docs" if settings.debug else None,
    redoc_url=None,
    openapi_url="/api/openapi.json" if settings.debug else None,
)

# API отдаёт только JSON, CSV и картинки — им не нужны ни скрипты, ни стили, ни встраивание во фреймы.
API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
HSTS = "max-age=31536000"


class SecurityHeadersMiddleware:
    """Защитные заголовки на все ответы бэкенда. Страницы сайта и админки получают свои от Next.js
    (frontend/next.config.ts); ответы /api и /media Next.js проксирует как есть, с этими заголовками."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path = scope.get("path", "")
        https = scope.get("scheme") == "https"

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers.setdefault("X-Content-Type-Options", "nosniff")
                headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
                headers.setdefault("X-Frame-Options", "DENY")
                # Swagger (/api/docs, только при DEBUG) грузит скрипты с CDN — ему строгий CSP не подходит
                if not path.startswith("/api/docs"):
                    headers.setdefault("Content-Security-Policy", API_CSP)
                # HSTS — только за HTTPS (схему от доверенного nginx uvicorn берёт из X-Forwarded-Proto)
                if https or settings.cookie_secure:
                    headers.setdefault("Strict-Transport-Security", HSTS)
            await send(message)

        await self.app(scope, receive, send_with_headers)


app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError):
    # Страховка: ссылки проверяются в обработчиках заранее, но нарушение целостности базы — это
    # ошибка в данных запроса, а не падение сервера.
    log.warning("IntegrityError на %s %s: %s", request.method, request.url.path, exc.orig)
    return JSONResponse({"detail": "Данные не сохранены: связанная запись не найдена или уже существует"},
                        status_code=400)


@app.exception_handler(OverflowError)
async def overflow_error(request: Request, exc: OverflowError):
    # Например, /api/admin/projects/99999999999999999999 — число не помещается в колонку базы
    return JSONResponse({"detail": "Слишком большое число в запросе"}, status_code=422)


# Тексты ошибок проверки полей — по-русски: админка показывает msg как есть («Год: …»), а pydantic
# пишет по-английски («Input should be greater than or equal to 1990»). Формат ответа прежний
# (detail — список с type/loc/msg), меняется только msg.
VALIDATION_MESSAGES = {
    "missing": "Обязательное поле",
    "string_too_short": "Слишком коротко: нужно не меньше {min_length} симв.",
    "string_too_long": "Слишком длинно: не больше {max_length} симв.",
    "too_long": "Слишком много значений: не больше {max_length}",
    "greater_than_equal": "Должно быть не меньше {ge}",
    "less_than_equal": "Должно быть не больше {le}",
    "greater_than": "Должно быть больше {gt}",
    "less_than": "Должно быть меньше {lt}",
    "int_parsing": "Введите целое число, без пробелов и запятых",
    "int_from_float": "Введите целое число",
    "int_type": "Введите целое число",
    "float_parsing": "Введите число; дробную часть отделяйте точкой",
    "float_type": "Введите число",
    "bool_parsing": "Ожидается «да» или «нет»",
    "bool_type": "Ожидается «да» или «нет»",
    "date_parsing": "Неверная дата: нужен формат ГГГГ-ММ-ДД",
    "date_from_datetime_parsing": "Неверная дата: нужен формат ГГГГ-ММ-ДД",
    "date_type": "Неверная дата: нужен формат ГГГГ-ММ-ДД",
    "literal_error": "Недопустимое значение",
    "enum": "Недопустимое значение",
    "string_type": "Ожидается текст",
    "list_type": "Ожидается список",
    "dict_type": "Неверный формат данных",
    "model_type": "Неверный формат данных",
    "model_attributes_type": "Неверный формат данных",
    "json_invalid": "Некорректный JSON",
}


def _ru_message(error: dict) -> str:
    template = VALIDATION_MESSAGES.get(error.get("type", ""))
    if template:
        try:
            return template.format(**(error.get("ctx") or {}))
        except (KeyError, IndexError, ValueError):
            return template.split(":")[0]
    msg = str(error.get("msg", "")).removeprefix("Value error, ")
    if msg.startswith("value is not a valid email address"):
        return "Неверный адрес электронной почты"
    return msg


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    errors, seen = [], set()
    for error in exc.errors():
        # Поле-объединение («email или пусто») даёт по ошибке на каждый вариант с хвостом в loc
        # вида «function-after[…]», «literal['']» — показываем одну ошибку на поле
        loc = [part for part in error.get("loc", ()) if not (isinstance(part, str) and "[" in part)]
        if tuple(loc) in seen:
            continue
        seen.add(tuple(loc))
        errors.append({**error, "loc": loc, "msg": _ru_message(error)})
    return JSONResponse({"detail": jsonable_encoder(errors)}, status_code=422)


app.include_router(public.router)
app.include_router(auth.router)
app.include_router(admin.router)

# В продакшене /media отдаёт nginx напрямую; здесь — для разработки и простого деплоя.
# Все загрузки хранятся в WebP, а реестр Windows отдаёт для .webp application/octet-stream:
# с X-Content-Type-Options: nosniff такой файл по прямой ссылке скачивается, а не открывается.
mimetypes.add_type("image/webp", ".webp")
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.get("/api/health")
def health():
    return {"ok": True}
