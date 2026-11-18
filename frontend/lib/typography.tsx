import { Fragment, type ReactNode } from "react";

import type { Lang } from "./types";

const NBSP = " ";

// Короткие слова, которые не должны оставаться в конце строки.
const RU_SHORT = "а|в|во|и|к|ко|о|об|с|со|у|на|по|до|от|за|из|не|ни|но|да|для|без|при|под|над|про|или|что|как|его|её|их";
const EN_SHORT = "a|an|the|of|to|in|on|at|by|for|and|or|as|is";
const UZ_SHORT = "va|bu|u|har|eng";

/**
 * Типограф: неразрывные пробелы после предлогов и союзов, перед тире,
 * между числом и словом, после сокращений «г.», «ул.», «№». Идемпотентен.
 */
export function typo(text: string, lang: Lang = "ru"): string {
  if (!text) return text;
  const short = lang === "en" ? EN_SHORT : lang === "uz" ? UZ_SHORT : RU_SHORT;
  const shortRe = new RegExp(`(^|[\\s(«"*„—])(${short}) (?=\\S)`, "giu");
  let out = text.replace(shortRe, `$1$2${NBSP}`);
  out = out.replace(shortRe, `$1$2${NBSP}`); // повтор — для подряд идущих коротких слов
  out = out.replace(/ —/g, `${NBSP}—`);
  out = out.replace(/(\d) (?=[\p{L}%²³№])/gu, `$1${NBSP}`);
  out = out.replace(/(^|\s)(г|ул|д|пр|корп|им|sh|ko'ch)\. (?=\S)/giu, `$1$2.${NBSP}`);
  out = out.replace(/№ (?=\d)/g, `№${NBSP}`);
  return out;
}

/** Убирает разметку акцента: для title, alt и мест, где курсив не нужен. */
export function plain(text: string): string {
  return text.replace(/\*([^*]+)\*/g, "$1");
}

/**
 * Заголовок с акцентом: слово в *звёздочках* набирается курсивом
 * (на тёмном фоне — оранжевым, на светлом — терракотовым).
 */
export function Accent({ text, tone = "light" }: { text: string; tone?: "light" | "dark" }): ReactNode {
  const parts = text.split(/\*([^*]+)\*/g);
  if (parts.length === 1) return text;
  const cls = tone === "dark" ? "accent-em text-brand" : "accent-em text-brand-700";
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i} className={cls}>{part}</em> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** «200+» → число и оранжевый плюс. */
export function StatValue({ value }: { value: string }) {
  const m = /^(.*?)(\+)$/.exec(value);
  if (!m) return <>{value}</>;
  return (
    <>
      {m[1]}
      <span className="text-brand">+</span>
    </>
  );
}
