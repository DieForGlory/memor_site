"use client";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Подписи полей для ошибок проверки: вместо «area_m2: …» администратор видит «Площадь, м²: …»
const FIELD_LABELS: Record<string, string> = {
  title: "Название", name: "Имя", slug: "Адрес страницы (slug)", order: "Порядок", year: "Год",
  area_m2: "Площадь, м²", address: "Адрес", description: "Описание", short: "Кратко", text: "Текст",
  caption: "Подпись", city_id: "Город", type_id: "Тип", project_id: "Объект", service_id: "Услуга",
  service_ids: "Услуги", stage: "Этап", status: "Статус", kind: "Тип", lat: "Широта", lng: "Долгота",
  phone: "Телефон", phones: "Телефоны", email: "Email", email_recipients: "Получатели писем", company: "Компания",
  company_name: "Компания", message: "Сообщение", note: "Комментарий", website: "Сайт", client: "Клиент",
  founded_year: "Год основания", companies_count: "Число компаний", employees_count: "Число сотрудников",
  clients: "Клиенты", valid_until: "Действует до", password: "Пароль", current_password: "Текущий пароль",
  new_password: "Новый пароль", role: "Роль", hero_title: "Заголовок главной", hero_text: "Текст главной",
  about_short: "О компании кратко", about_text: "О компании", legal_name: "Юридическое название",
  requisites: "Реквизиты", working_hours: "Часы работы", seo_title: "SEO-заголовок", seo_description: "SEO-описание",
  yandex_metrika_id: "ID Яндекс.Метрики", google_analytics_id: "ID Google Analytics",
  crm_url: "Адрес CRM", crm_api_key: "Ключ API CRM", crm_project_id: "Проект в CRM", webhook_url: "Адрес вебхука",
  telegram_bot_token: "Токен Telegram-бота", telegram_chat_id: "ID чата Telegram",
  presentation_url: "Ссылка на презентацию", facebook_url: "Facebook", instagram_url: "Instagram",
  telegram_url: "Telegram", youtube_url: "YouTube", ru: "RU", uz: "UZ", en: "EN",
};

function fieldLabel(loc: (string | number)[]): string {
  return loc
    .filter((x) => x !== "body")
    .map((x) => (typeof x === "number" ? `№${x + 1}` : FIELD_LABELS[x] ?? x))
    .join(" → ");
}

function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => {
        const field = fieldLabel(d.loc ?? []);
        const msg = (d.msg ?? "").replace(/^Value error, /, "");
        return field ? `${field}: ${msg}` : msg;
      })
      .join("\n");
  }
  return "Ошибка запроса";
}

type Options = { method?: string; json?: unknown; form?: FormData; signal?: AbortSignal };

/** Запрос к API админки. Cookie сессии уходит автоматически (тот же домен). */
export async function api<T = unknown>(path: string, { method = "GET", json, form, signal }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "X-Memor-Admin": "1" };
  let body: BodyInit | undefined;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }
  const res = await fetch(path, { method, headers, body, signal, credentials: "same-origin", cache: "no-store" });
  if (res.status === 401 && !path.startsWith("/api/auth/login")) {
    // Сессия истекла по времени (простой или предел от входа) — на вход с возвратом на ту же страницу
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/admin/login?expired=1&next=${next}`;
    throw new ApiError("Требуется вход", 401);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(formatDetail(data?.detail) || `Ошибка ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  return (type.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

export type I18n = { ru?: string; uz?: string; en?: string };

export const ADMIN_LANGS = [
  { key: "ru", label: "RU" },
  { key: "uz", label: "UZ" },
  { key: "en", label: "EN" },
] as const;

export function formatDate(iso: string | null | undefined, withTime = true): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
