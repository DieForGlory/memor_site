"use client";

import { useEffect, useState } from "react";

import { Check } from "@/components/icons";
import type { Dict } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Kind = "project" | "tender" | "subcontract" | "apartment" | "other";

/** Событие «Узнать о квартире»: текст подставляется в сообщение формы */
export const LEAD_PREFILL_EVENT = "memor:lead-prefill";

/** Телефон — как проверяют сервер и CRM: от 9 до 15 цифр, пробелы, скобки, точки, дефисы и «+» в начале */
const PHONE_PATTERN = String.raw`\+?[\s\(\)\.\-]*(?:[0-9][\s\(\)\.\-]*){9,15}`;
const CHECKED_FIELDS = ["name", "phone", "email"] as const;

interface Props {
  lang: Lang;
  t: Dict["lead"];
  projectId?: number;
  projectTitle?: string;
  serviceId?: number;
  tone?: "dark" | "light";
  /** apartment — заявка на квартиру: без выбора типа и поля «Компания» */
  variant?: "default" | "apartment";
  /** Жилой комплекс из каталога CRM — заявка уйдёт в CRM уже с проектом */
  crmProjectId?: number;
  regardingLabel?: string;
}

export function LeadForm({
  lang, t, projectId, projectTitle, serviceId, tone = "dark", variant = "default", crmProjectId, regardingLabel,
}: Props) {
  const apartment = variant === "apartment";
  const [kind, setKind] = useState<Kind>(apartment ? "apartment" : "project");
  const [message, setMessage] = useState("");

  // Кнопка «Узнать» у квартиры подставляет её номер и параметры в сообщение
  useEffect(() => {
    const onPrefill = (event: Event) => {
      const text = (event as CustomEvent<string>).detail;
      if (typeof text === "string") setMessage(text);
    };
    window.addEventListener(LEAD_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(LEAD_PREFILL_EVENT, onPrefill);
  }, []);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const dark = tone === "dark";

  // Ответ сервера — по-русски и про поля техническим списком; посетителю показываем текст на языке
  // сайта и про то поле, которое надо исправить, а не «попробуйте ещё раз»
  function errorText(status: number, body: { detail?: unknown } | null): string {
    if (status === 429) return t.tooMany;
    if (status === 422 && Array.isArray(body?.detail)) {
      for (const item of body.detail as { loc?: unknown[] }[]) {
        const field = CHECKED_FIELDS.find((f) => f === item.loc?.[1]);
        if (field) return t.invalid[field];
      }
    }
    return t.error;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email") || "",
          company: form.get("company") || "",
          message,
          website: form.get("website") || "",
          project_id: projectId ?? null,
          service_id: serviceId ?? null,
          crm_project_id: crmProjectId ?? null,
          page_url: window.location.href.slice(0, 500),
          lang,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(errorText(res.status, body));
        setState("error");
        return;
      }
      setState("done");
      setMessage("");
    } catch {
      // Сеть недоступна: текст браузера («Failed to fetch») посетителю не показываем
      setError(t.error);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className={`rounded-3xl p-10 text-center ${dark ? "bg-white/5" : "bg-sand"}`} role="status">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white">
          <Check size={30} />
        </span>
        <h3 className={`mt-6 text-2xl font-bold ${dark ? "text-white" : "text-ink"}`}>{t.successTitle}</h3>
        <p className={`mt-3 ${dark ? "text-white/70" : "text-ink-500"}`}>{t.successText}</p>
        <button type="button" onClick={() => setState("idle")} className={`mt-8 ${dark ? "btn-ghost-light" : "btn-ghost-dark"}`}>
          {t.again}
        </button>
      </div>
    );
  }

  const label = `mb-2 block text-sm font-medium ${dark ? "text-white/70" : "text-ink-500"}`;
  const field = dark ? "field !border-white/10 !bg-white/5 !text-white placeholder:!text-white/35 focus:!border-brand" : "field";

  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate={false}>
      {!apartment && (
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t.eyebrow}>
        {(Object.keys(t.kinds) as (keyof typeof t.kinds)[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`chip ${
              kind === k
                ? "border-brand bg-brand text-white"
                : dark
                  ? "border-white/15 text-white/75 hover:border-white/40"
                  : "border-ink/15 text-ink-700 hover:border-ink/40"
            }`}
          >
            {t.kinds[k]}
          </button>
        ))}
      </div>
      )}

      {projectTitle && (
        <p className={`text-sm ${dark ? "text-white/60" : "text-ink-500"}`}>
          {regardingLabel ?? t.regarding}: <span className="font-semibold text-brand">{projectTitle}</span>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className={label}>{t.name} *</span>
          <input name="name" required minLength={2} maxLength={120} autoComplete="name" className={field} />
        </label>
        <label>
          <span className={label}>{t.phone} *</span>
          <input name="phone" type="tel" required minLength={9} maxLength={40} autoComplete="tel"
                 pattern={PHONE_PATTERN} title={t.invalid.phone}
                 placeholder="+998 __ ___ __ __" className={field} />
        </label>
        <label>
          <span className={label}>
            {t.email} <span className="opacity-60">({t.optional})</span>
          </span>
          <input name="email" type="email" maxLength={254} autoComplete="email" className={field} />
        </label>
        {!apartment && (
          <label>
            <span className={label}>
              {t.company} <span className="opacity-60">({t.optional})</span>
            </span>
            <input name="company" maxLength={160} autoComplete="organization" className={field} />
          </label>
        )}
      </div>
      <label>
        <span className={label}>{t.message}</span>
        <textarea name="message" rows={4} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)}
                  className={`${field} resize-y`} />
      </label>
      {/* Ловушка для ботов: скрыта от людей и скринридеров */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true"
             className="absolute -left-[9999px] h-px w-px opacity-0" />

      {state === "error" && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500" role="alert">{error}</p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={state === "sending"} className="btn-primary sm:min-w-[220px]">
          {state === "sending" ? t.sending : t.submit}
        </button>
        <p className={`text-xs leading-relaxed sm:max-w-[320px] ${dark ? "text-white/40" : "text-ink-400"}`}>{t.consent}</p>
      </div>
    </form>
  );
}
