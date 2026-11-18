"use client";

import { useEffect, useState } from "react";

import { I18nField } from "@/components/admin/I18nField";
import { MapPicker } from "@/components/admin/MapPicker";
import { Button, Card, Field, inputCls, Loading, PageTitle, useToast } from "@/components/admin/ui";
import { api, type I18n } from "@/lib/admin-api";

type Settings = Record<string, unknown> & { phones: string[]; lat: number | null; lng: number | null };

const I18N_GROUPS: { title: string; fields: { key: string; label: string; multiline?: boolean; hint?: string }[] }[] = [
  {
    title: "Первый экран",
    fields: [
      { key: "hero_title", label: "Заголовок", hint: "Слово или фразу в *звёздочках* сайт выделит курсивом и цветом." },
      { key: "hero_text", label: "Подзаголовок", multiline: true },
      { key: "tagline", label: "Слоган (в подвале)" },
    ],
  },
  {
    title: "О компании",
    fields: [
      { key: "about_short", label: "Кратко о компании", multiline: true, hint: "Блок «Кто мы» и шапка страницы «О компании»." },
      { key: "letter_title", label: "Заголовок обращения" },
      { key: "letter_text", label: "Текст обращения", multiline: true, hint: "Абзацы разделяйте пустой строкой." },
      { key: "clients", label: "Клиенты", hint: "Через запятую — выводятся плашками." },
    ],
  },
  {
    title: "Контакты и реквизиты",
    fields: [
      { key: "legal_name", label: "Юридическое название" },
      { key: "address", label: "Адрес офиса" },
      { key: "working_hours", label: "Часы работы" },
      { key: "requisites", label: "Реквизиты (в подвале)", multiline: true, hint: "Р/с, банк, МФО, ИНН — по желанию." },
    ],
  },
  {
    title: "SEO",
    fields: [
      { key: "seo_title", label: "Заголовок сайта для поисковиков" },
      { key: "seo_description", label: "Описание для поисковиков", multiline: true },
    ],
  },
];

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api<Settings>("/api/admin/settings/site").then(setS).catch((e) => toast(e.message, "error"));
  }, [toast]);

  if (!s) return <Loading />;
  const set = (key: string, value: unknown) => setS((prev) => (prev ? { ...prev, [key]: value } : prev));

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      setS(await api<Settings>("/api/admin/settings/site", { method: "PUT", json: { ...s, phones: s.phones.filter((p) => p.trim()) } }));
      toast("Настройки сохранены");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  const text = (key: string, label: string, hint?: string, type = "text") => (
    <Field label={label} hint={hint}>
      <input type={type} className={inputCls} value={(s[key] as string | number | null) ?? ""}
             onChange={(e) => set(key, type === "number" ? (e.target.value === "" ? 0 : Number(e.target.value)) : e.target.value)} />
    </Field>
  );

  return (
    <div className="pb-24">
      <PageTitle title="Сайт и контакты" subtitle="Тексты, цифры, контакты и соцсети. Изменения видны на сайте сразу после сохранения." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Компания и цифры">
          <div className="grid gap-5 sm:grid-cols-2">
            {text("company_name", "Название бренда")}
            {text("founded_year", "Год основания", undefined, "number")}
            {text("companies_count", "Компаний в группе", undefined, "number")}
            {text("employees_count", "Специалистов", undefined, "number")}
          </div>
        </Card>

        <Card title="Телефоны и почта">
          <div className="space-y-3">
            {s.phones.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} value={p} placeholder="+998 __ ___ __ __"
                       onChange={(e) => set("phones", s.phones.map((x, j) => (j === i ? e.target.value : x)))} />
                <Button variant="ghost" onClick={() => set("phones", s.phones.filter((_, j) => j !== i))} aria-label="Удалить номер">✕</Button>
              </div>
            ))}
            <Button size="sm" onClick={() => set("phones", [...s.phones, ""])}>Добавить телефон</Button>
            <div className="pt-2">{text("email", "Email для связи", undefined, "email")}</div>
          </div>
        </Card>

        {I18N_GROUPS.map((g) => (
          <Card key={g.title} title={g.title}>
            <div className="space-y-5">
              {g.fields.map((f) => (
                <I18nField key={f.key} label={f.label} multiline={f.multiline} hint={f.hint} rows={f.key === "letter_text" ? 10 : 4}
                           value={(s[f.key] as I18n) ?? {}} onChange={(v) => set(f.key, v)} />
              ))}
            </div>
          </Card>
        ))}

        <Card title="Офис на карте">
          <MapPicker lat={s.lat} lng={s.lng} onChange={(lat, lng) => setS((prev) => (prev ? { ...prev, lat, lng } : prev))} />
          <p className="mt-3 text-xs text-ink-400">Точка используется на странице «Контакты» и для кнопки «Построить маршрут».</p>
        </Card>

        <Card title="Соцсети и файлы">
          <div className="space-y-5">
            {text("telegram_url", "Telegram", "https://t.me/…")}
            {text("instagram_url", "Instagram", "https://instagram.com/…")}
            {text("facebook_url", "Facebook")}
            {text("youtube_url", "YouTube")}
            {text("presentation_url", "Ссылка на презентацию (PDF)", "Необязательно")}
          </div>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[1280px] justify-end px-4 py-3 sm:px-8">
          <Button variant="primary" loading={saving} onClick={save}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}
