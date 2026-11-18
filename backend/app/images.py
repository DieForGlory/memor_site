"""Приём и обработка картинок: поворот по EXIF, уменьшение, WebP, превью.

Имя файла — хэш содержимого (и варианта обработки), поэтому повторная загрузка
того же снимка не плодит копии на диске.
"""
import hashlib
import io
from collections.abc import Callable

from PIL import Image, ImageOps

from .config import get_settings

MAX_SIDE = 2000
THUMB_SIDE = 800
MAX_BYTES = 30 * 1024 * 1024

Transform = Callable[[Image.Image], Image.Image]


class ImageError(ValueError):
    pass


def _flatten(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        return bg
    return im.convert("RGB")


def open_image(data: bytes) -> Image.Image:
    if len(data) > MAX_BYTES:
        raise ImageError("Файл больше 30 МБ")
    try:
        im = Image.open(io.BytesIO(data))
        if im.format == "JPEG":
            im.draft("RGB", (MAX_SIDE, MAX_SIDE))
        im.load()
    except Exception as exc:  # Pillow бросает разные исключения на битые файлы
        raise ImageError("Файл не является изображением") from exc
    return _flatten(ImageOps.exif_transpose(im))


def save_image(data: bytes, subdir: str, *, transform: Transform | None = None, variant: str = "") -> dict:
    """Сохраняет картинку в media/<subdir>/ и возвращает пути относительно media."""
    im = open_image(data)
    if transform:
        im = transform(im)

    digest = hashlib.sha1(data + variant.encode()).hexdigest()[:16]
    folder = get_settings().media_dir / subdir
    folder.mkdir(parents=True, exist_ok=True)

    full = im.copy()
    full.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    full_name, thumb_name = f"{digest}.webp", f"{digest}_t.webp"
    if not (folder / full_name).exists():
        full.save(folder / full_name, "WEBP", quality=82, method=4)
    if not (folder / thumb_name).exists():
        thumb = full.copy()
        thumb.thumbnail((THUMB_SIDE, THUMB_SIDE), Image.LANCZOS)
        thumb.save(folder / thumb_name, "WEBP", quality=78, method=4)

    return {
        "image": f"{subdir}/{full_name}",
        "thumb": f"{subdir}/{thumb_name}",
        "width": full.width,
        "height": full.height,
    }


def delete_files(*relative_paths: str) -> None:
    media = get_settings().media_dir.resolve()
    for rel in relative_paths:
        if not rel:
            continue
        path = (media / rel).resolve()
        if media in path.parents and path.is_file():
            path.unlink()


def media_url(rel: str | None) -> str:
    return f"/media/{rel}" if rel else ""


def thumb_of(rel: str | None) -> str:
    """Путь превью для картинки, сохранённой через save_image."""
    if not rel or not rel.endswith(".webp"):
        return rel or ""
    return rel[: -len(".webp")] + "_t.webp"
