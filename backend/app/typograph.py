"""Типограф для текстов сайта — та же логика, что в frontend/lib/typography.tsx.

Неразрывные пробелы после предлогов и союзов, перед тире, между числом и словом,
после сокращений «г.», «ул.», «№». Повторный вызов результат не меняет.
"""
import re

NBSP = " "
_SHORT = {
    "ru": "а|в|во|и|к|ко|о|об|с|со|у|на|по|до|от|за|из|не|ни|но|да|для|без|при|под|над|про|или|что|как|его|её|их",
    "en": "a|an|the|of|to|in|on|at|by|for|and|or|as|is",
    "uz": "va|bu|u|har|eng",
}
_SHORT_RE = {
    lang: re.compile(rf"(^|[\s(«\"*„—])({words}) (?=\S)", re.IGNORECASE)
    for lang, words in _SHORT.items()
}
_NUM_RE = re.compile(r"(\d) (?=[^\W\d_]|[%²³№])")
_ABBR_RE = re.compile(r"(^|\s)(г|ул|д|пр|корп|им|sh)\. (?=\S)", re.IGNORECASE)


def typograph(text: str, lang: str = "ru") -> str:
    if not text:
        return text
    short = _SHORT_RE.get(lang, _SHORT_RE["ru"])
    out = short.sub(rf"\1\2{NBSP}", text)
    out = short.sub(rf"\1\2{NBSP}", out)  # подряд идущие короткие слова
    out = out.replace(" —", f"{NBSP}—")
    out = _NUM_RE.sub(rf"\1{NBSP}", out)
    out = _ABBR_RE.sub(rf"\1\2.{NBSP}", out)
    out = out.replace("№ ", f"№{NBSP}")
    return out
