import re

from .typograph import typograph

LANGS = ("ru", "uz", "en")
DEFAULT_LANG = "ru"

_TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z",
    "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
    "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    "қ": "q", "ғ": "g", "ҳ": "h", "ў": "o",
}


def norm_lang(lang: str | None) -> str:
    return lang if lang in LANGS else DEFAULT_LANG


def pick(value: dict | None, lang: str) -> str:
    """Строка на нужном языке (если перевода нет — русская), с типографом."""
    if not value:
        return ""
    if value.get(lang):
        return typograph(value[lang], lang)
    return typograph(value.get(DEFAULT_LANG) or "", DEFAULT_LANG)


def slugify(text: str) -> str:
    text = "".join(_TRANSLIT.get(ch, ch) for ch in text.lower())
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")[:100]
