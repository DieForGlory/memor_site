// Форматирование для раздела «Квартиры»: цены, площади, комнатность. Без "server-only" —
// нужно и серверным страницам, и клиентскому списку квартир.
import type { Dict } from "./i18n";
import type { Lang, RealtyType } from "./types";

type T = Dict["realty"];

const LOCALES: Record<Lang, string> = { ru: "ru-RU", uz: "uz-UZ", en: "en-US" };
const NBSP = " ";

/** Подстановка {name} в шаблон из словаря */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}

function currencyLabel(t: T, currency: string): string {
  return (t.currency as Record<string, string>)[currency] ?? currency;
}

function number(value: number, lang: Lang, digits = 0): string {
  // Узбекская локаль в браузерах бывает неполной — разряды всё равно отбиваем пробелом
  return new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: digits })
    .format(value)
    .replace(/[\s ]/g, NBSP);
}

/** Полная цена: «121 000 000 сум», «$ 85 000» */
export function money(value: number | null, currency: string, lang: Lang, t: T): string {
  if (value == null) return "—";
  const label = currencyLabel(t, currency);
  return currency === "USD" ? `$${NBSP}${number(value, lang)}` : `${number(value, lang)}${NBSP}${label}`;
}

/** Короткая цена для карточек: «121 млн сум»; доллары — полностью */
export function moneyShort(value: number | null, currency: string, lang: Lang, t: T): string {
  if (value == null) return "—";
  if (currency !== "USD" && value >= 1_000_000) {
    return `${number(value / 1_000_000, lang, value < 100_000_000 ? 1 : 0)}${NBSP}${t.million}${NBSP}${currencyLabel(t, currency)}`;
  }
  return money(value, currency, lang, t);
}

export function area(value: number | null, lang: Lang): string {
  return value == null ? "—" : number(value, lang, 1);
}

export function areaRange(min: number | null, max: number | null, lang: Lang, t: T): string {
  if (min == null) return "—";
  return max != null && Math.round(max) !== Math.round(min)
    ? `${area(min, lang)}–${area(max, lang)}${NBSP}${t.sqm}`
    : `${area(min, lang)}${NBSP}${t.sqm}`;
}

/** «2-комн.» / «2-комнатные»; 0 комнат в CRM — студия; у коммерции и парковок — название типа */
export function roomsLabel(t: T, type: RealtyType, rooms: number | null, long = false): string {
  if (type !== "APARTMENT" || rooms == null) return t.types[type] ?? type;
  if (rooms === 0) return long ? t.studioLong : t.studio;
  return fill(long ? t.roomsLong : t.rooms, { n: rooms });
}
