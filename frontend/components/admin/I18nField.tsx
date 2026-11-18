"use client";

import { useState } from "react";

import { ADMIN_LANGS, type I18n } from "@/lib/admin-api";

import { inputCls } from "./ui";

interface Props {
  label: string;
  value: I18n;
  onChange: (v: I18n) => void;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  hint?: string;
}

/** Поле с переводами: вкладки RU / UZ / EN, точка показывает, заполнен ли язык. */
export function I18nField({ label, value, onChange, multiline, rows = 4, required, hint }: Props) {
  const [lang, setLang] = useState<"ru" | "uz" | "en">("ru");
  const v = value ?? {};
  const common = {
    value: v[lang] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...v, [lang]: e.target.value }),
    className: inputCls,
    placeholder: lang === "ru" ? "" : v.ru ? `RU: ${v.ru.slice(0, 80)}` : "",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink-700">
          {label} {required && <span className="text-brand">*</span>}
        </span>
        <div className="flex gap-1 rounded-lg bg-sand p-0.5">
          {ADMIN_LANGS.map((l) => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLang(l.key)}
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold tracking-wider transition-colors ${
                lang === l.key ? "bg-white text-ink shadow-sm" : "text-ink-500 hover:text-ink"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${v[l.key]?.trim() ? "bg-emerald-500" : "bg-ink/20"}`} />
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {multiline ? <textarea rows={rows} {...common} className={`${inputCls} resize-y leading-relaxed`} /> : <input {...common} />}
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </div>
  );
}
