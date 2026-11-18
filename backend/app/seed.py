"""Наполнение базы стартовым контентом и фото.

    python -m app.seed            # заполнить пустую базу
    python -m app.seed --reset    # стереть контент (кроме пользователей и заявок) и залить заново

Исходники: папки с фото объектов и .pptx в папке СЛАЙД (путь — MATERIALS_DIR в backend/.env).
"""
import argparse
import hashlib
import secrets
import shutil
import sys
import zipfile
from datetime import date
from pathlib import Path

from PIL import Image, ImageChops
from sqlalchemy import delete, func, select

from . import seed_data as data
from . import site_settings
from .config import BACKEND_DIR, get_settings
from .db import SessionLocal
from .images import ImageError, save_image
from .models import (
    Advantage,
    City,
    Document,
    Equipment,
    HeroSlide,
    Project,
    ProjectPhoto,
    ProjectType,
    Service,
    Setting,
    User,
)
from .security import hash_password

IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")
MEDIA_SUBDIRS = ("projects", "hero", "services", "equipment", "documents")


def trim_white(im: Image.Image) -> Image.Image:
    """Срезает белые поля, которыми картинки обрамлены на слайдах."""
    bg = Image.new("RGB", im.size, (255, 255, 255))
    mask = ImageChops.difference(im, bg).convert("L").point(lambda p: 255 if p > 28 else 0)
    bbox = mask.getbbox()
    if not bbox:
        return im
    left, top, right, bottom = bbox
    if (right - left) * (bottom - top) < 0.45 * im.width * im.height:
        return im
    inset = 2 if (right - left) < im.width or (bottom - top) < im.height else 0
    return im.crop((left + inset, top + inset, right - inset, bottom - inset))


def make_transform(opts: dict):
    crop = opts.get("crop_bottom", 0)
    trim = opts.get("trim", False)
    if not crop and not trim:
        return None, ""

    def transform(im: Image.Image) -> Image.Image:
        if trim:
            im = trim_white(im)
        if crop:
            im = im.crop((0, 0, im.width, int(im.height * (1 - crop))))
        return im

    return transform, f"trim={trim};crop={crop}"


class Sources:
    def __init__(self, materials: Path, deck: Path | None):
        self.materials = materials
        self.deck = zipfile.ZipFile(deck) if deck else None
        self.missing: list[str] = []

    def read_deck(self, name: str) -> bytes | None:
        if not self.deck:
            self.missing.append(f"pptx:{name}")
            return None
        try:
            return self.deck.read(f"ppt/media/{name}")
        except KeyError:
            self.missing.append(f"pptx:{name}")
            return None

    def expand(self, spec) -> list[tuple[str, str]]:
        """Разворачивает описание источника в список (тип, путь)."""
        kind = spec[0]
        if kind in ("f", "d"):
            return [(kind, spec[1])]
        if kind == "dir":
            folder = self.materials / spec[1]
            return [("f", str(p.relative_to(self.materials))) for p in sorted(folder.iterdir())
                    if p.suffix.lower() in IMAGE_EXT] if folder.is_dir() else []
        if kind == "glob":
            folder, pattern = spec[1].rsplit("/", 1)
            exclude = set(spec[2]) if len(spec) > 2 else set()
            base = self.materials / folder
            return [("f", str(p.relative_to(self.materials))) for p in sorted(base.glob(pattern))
                    if p.suffix.lower() in IMAGE_EXT and p.name not in exclude]
        raise ValueError(f"Неизвестный источник {spec!r}")

    def read(self, kind: str, path: str) -> bytes | None:
        if kind == "d":
            return self.read_deck(path)
        full = self.materials / path
        if not full.is_file():
            self.missing.append(path)
            return None
        return full.read_bytes()


def store(sources: Sources, kind: str, path: str, subdir: str, opts: dict) -> dict | None:
    raw = sources.read(kind, path)
    if raw is None:
        return None
    opts = {"trim": True, **opts} if kind == "d" else opts
    transform, variant = make_transform(opts)
    try:
        stored = save_image(raw, subdir, transform=transform, variant=variant)
    except ImageError as exc:
        print(f"  ! {path}: {exc}")
        return None
    stored["hash"] = hashlib.sha1(raw + variant.encode()).hexdigest()
    return stored


def find_deck(materials: Path) -> Path | None:
    for folder in (materials / "СЛАЙД", materials):
        if folder.is_dir():
            decks = sorted(p for p in folder.glob("*.pptx") if not p.name.startswith("~$"))
            if decks:
                return decks[0]
    return None


def ensure_env_file() -> None:
    """Создаёт backend/.env со случайными SECRET_KEY и паролем администратора, если его ещё нет."""
    env = BACKEND_DIR / ".env"
    if env.exists():
        return
    env.write_text(
        "# Локальные настройки. Файл не коммитится.\n"
        "DEBUG=true\n"
        f"SECRET_KEY={secrets.token_urlsafe(48)}\n"
        "ADMIN_EMAIL=admin@memor.uz\n"
        f"ADMIN_PASSWORD={secrets.token_urlsafe(12)}\n"
        "# DATABASE_URL=postgresql+psycopg://memor:password@localhost:5432/memor\n"
        "# SMTP_HOST=smtp.gmail.com\n# SMTP_PORT=587\n# SMTP_USER=\n# SMTP_PASSWORD=\n# SMTP_FROM=\n"
        "# CRM MEMOR на этом же компьютере (разработка): разрешить http и локальный адрес\n"
        "# INTEGRATIONS_ALLOW_HTTP=true\n# INTEGRATIONS_ALLOWED_HOSTS=127.0.0.1,localhost\n",
        encoding="utf-8",
    )
    get_settings.cache_clear()
    print(f"Создан {env} — там SECRET_KEY и пароль администратора.")


def wipe(db) -> None:
    for model in (HeroSlide, ProjectPhoto, Project, Service, Equipment, Advantage, Document, City, ProjectType):
        db.execute(delete(model))
    db.execute(delete(Setting))
    db.commit()
    media = get_settings().media_dir
    for sub in MEDIA_SUBDIRS:
        shutil.rmtree(media / sub, ignore_errors=True)


def seed(reset: bool = False, deck_path: str | None = None) -> None:
    ensure_env_file()
    settings = get_settings()
    materials = settings.materials_dir
    deck = Path(deck_path) if deck_path else find_deck(materials)
    sources = Sources(materials, deck)
    print(f"Материалы: {materials}\nПрезентация: {deck or 'не найдена'}")

    with SessionLocal() as db:
        if reset:
            wipe(db)
        elif db.scalar(select(func.count(Project.id))):
            print("База уже заполнена. Для перезаливки: python -m app.seed --reset")
            return

        if not db.scalar(select(func.count(User.id))):
            if not settings.admin_password:
                sys.exit("Задайте ADMIN_PASSWORD в backend/.env")
            db.add(User(email=settings.admin_email.lower(), name="Администратор",
                        password_hash=hash_password(settings.admin_password)))
            print(f"Администратор: {settings.admin_email} (пароль — ADMIN_PASSWORD в backend/.env)")

        site_settings.save(db, "site", site_settings.SiteSettings.model_validate(data.SITE))
        site_settings.save(db, "integrations", site_settings.IntegrationSettings())

        cities = {slug: City(slug=slug, title=title, order=i) for i, (slug, title) in enumerate(data.CITIES)}
        types = {slug: ProjectType(slug=slug, title=title, order=i) for i, (slug, title) in enumerate(data.TYPES)}
        db.add_all([*cities.values(), *types.values()])

        services = {}
        for i, s in enumerate(data.SERVICES):
            services[s["slug"]] = Service(order=i, **s)
        db.add_all(services.values())

        for i, (title, text) in enumerate(data.ADVANTAGES):
            db.add(Advantage(title=title, text=text, order=i))

        print("Спецтехника…")
        for i, (name, title) in enumerate(data.EQUIPMENT):
            stored = store(sources, "d", name, "equipment", {})
            db.add(Equipment(title=title, image=stored["image"] if stored else "", order=i))

        print("Документы…")
        for i, d in enumerate(data.DOCUMENTS):
            stored = store(sources, "d", d["image"], "documents", {"trim": False})
            db.add(Document(kind=d["kind"], title=d["title"], image=stored["image"] if stored else "",
                            valid_until=date.fromisoformat(d["valid_until"]) if d["valid_until"] else None,
                            order=i, is_published=False))
        db.flush()

        projects: dict[str, Project] = {}
        for order, spec in enumerate(data.PROJECTS):
            p = Project(
                slug=spec["slug"], title=spec["title"], kicker=spec.get("kicker", {}), sector=spec["sector"],
                type=types[spec["type"]], city=cities[spec["city"]], role=spec["role"],
                role_text=spec.get("role_text", {}), status=spec["status"], client=spec.get("client", {}),
                address=spec["address"], lat=spec.get("lat"), lng=spec.get("lng"),
                description=spec.get("description", {}), is_featured=spec.get("featured", False),
                is_published=True, order=order,
                services=[services[s] for s in spec.get("services", [])],
            )
            db.add(p)
            db.flush()
            opts = spec.get("photo_opts", {})
            seen: set[str] = set()
            n = 0
            for stage, specs in spec["photos"]:
                for src in specs:
                    for kind, path in sources.expand(src):
                        stored = store(sources, kind, path, f"projects/{p.id}", opts)
                        if not stored or stored["hash"] in seen:
                            continue
                        seen.add(stored.pop("hash"))
                        p.photos.append(ProjectPhoto(stage=stage, order=n, **stored))
                        n += 1
            if p.photos:
                p.cover, p.cover_thumb = p.photos[0].image, p.photos[0].thumb
            projects[p.slug] = p
            print(f"  {p.title['ru']}: {n} фото")

        print("Слайды главной…")
        for i, (slug, src, opts) in enumerate(data.HERO):
            project = projects[slug]
            stored = store(sources, src[0], src[1], f"projects/{project.id}", opts)
            if stored:
                db.add(HeroSlide(image=stored["image"], project=project, order=i))

        db.commit()

    if sources.missing:
        print("Не найдены файлы:", *sources.missing, sep="\n  ")
    print("Готово.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="стереть контент и залить заново")
    parser.add_argument("--deck", help="путь к .pptx (по умолчанию ищется в папке СЛАЙД)")
    args = parser.parse_args()
    seed(reset=args.reset, deck_path=args.deck)


if __name__ == "__main__":
    main()

