"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ArrowLeft } from "@/components/icons";
import { api, type I18n } from "@/lib/admin-api";

import { I18nField } from "./I18nField";
import { MapPicker } from "./MapPicker";
import { type AdminPhoto, PhotoManager } from "./PhotoManager";
import { Button, Card, Field, inputCls, Loading, Toggle, useConfirm, useToast } from "./ui";

interface Project {
  id?: number;
  slug: string;
  title: I18n;
  kicker: I18n;
  sector: "state" | "commercial";
  type_id: number | null;
  city_id: number | null;
  role: "general" | "contractor" | "reconstruction";
  role_text: I18n;
  status: "completed" | "in_progress";
  client: I18n;
  address: I18n;
  lat: number | null;
  lng: number | null;
  year: number | null;
  area_m2: number | null;
  description: I18n;
  service_ids: number[];
  is_featured: boolean;
  is_published: boolean;
  order: number;
  photos?: AdminPhoto[];
  cover?: string;
}

type Option = { id: number; title: I18n };

const EMPTY: Project = {
  slug: "", title: {}, kicker: {}, sector: "commercial", type_id: null, city_id: null, role: "general", role_text: {},
  status: "completed", client: {}, address: {}, lat: null, lng: null, year: null, area_m2: null, description: {},
  service_ids: [], is_featured: false, is_published: true, order: 0,
};

const PAYLOAD_KEYS: (keyof Project)[] = [
  "slug", "title", "kicker", "sector", "type_id", "city_id", "role", "role_text", "status", "client", "address",
  "lat", "lng", "year", "area_m2", "description", "service_ids", "is_featured", "is_published", "order",
];

export function ProjectEditor({ id }: { id?: number }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [p, setP] = useState<Project | null>(id ? null : EMPTY);
  const [types, setTypes] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    Promise.all([api<Option[]>("/api/admin/types"), api<Option[]>("/api/admin/cities"), api<Option[]>("/api/admin/services")])
      .then(([t, c, s]) => {
        setTypes(t);
        setCities(c);
        setServices(s);
      })
      .catch((e) => toast(e.message, "error"));
    if (id) api<Project>(`/api/admin/projects/${id}`).then(setP).catch((e) => toast(e.message, "error"));
  }, [id, toast]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  if (!p) return <Loading />;

  const set = <K extends keyof Project>(key: K, value: Project[K]) => {
    setP((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
  };

  async function save() {
    if (!p) return;
    setSaving(true);
    try {
      const body = Object.fromEntries(PAYLOAD_KEYS.map((k) => [k, p[k]]));
      const saved = await api<Project>(p.id ? `/api/admin/projects/${p.id}` : "/api/admin/projects", {
        method: p.id ? "PUT" : "POST",
        json: body,
      });
      setP(saved);
      setDirty(false);
      toast("Объект сохранён");
      if (!p.id) router.replace(`/admin/projects/${saved.id}`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!p?.id || !(await confirm(`Удалить объект «${p.title.ru}» вместе со всеми фото?`))) return;
    try {
      await api(`/api/admin/projects/${p.id}`, { method: "DELETE" });
      toast("Объект удалён");
      router.push("/admin/projects");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const select = (value: number | null, options: Option[], onChange: (v: number | null) => void, label: string) => (
    <Field label={label}>
      <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">—</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.title.ru}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="pb-24">
      <Link href="/admin/projects" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink">
        <ArrowLeft size={16} /> Все объекты
      </Link>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{p.id ? p.title.ru || "Объект" : "Новый объект"}</h1>
        {p.id && (
          <a href={`/ru/projects/${p.slug}`} target="_blank" rel="noopener" className="text-sm font-semibold text-brand-700 hover:underline">
            Открыть на сайте ↗
          </a>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Основное">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <I18nField label="Название" required value={p.title} onChange={(v) => set("title", v)} />
              </div>
              <I18nField label="Надзаголовок" hint="Например: «Жилой комплекс», «Головной офис»" value={p.kicker} onChange={(v) => set("kicker", v)} />
              <Field label="Адрес страницы (slug)" hint="Латиницей. Пусто — сгенерируется из названия.">
                <input className={inputCls} value={p.slug} onChange={(e) => set("slug", e.target.value)} />
              </Field>
              <Field label="Сектор">
                <select className={inputCls} value={p.sector} onChange={(e) => set("sector", e.target.value as Project["sector"])}>
                  <option value="state">Государственный</option>
                  <option value="commercial">Коммерческий</option>
                </select>
              </Field>
              {select(p.type_id, types, (v) => set("type_id", v), "Тип объекта")}
              <Field label="Статус">
                <select className={inputCls} value={p.status} onChange={(e) => set("status", e.target.value as Project["status"])}>
                  <option value="completed">Завершён</option>
                  <option value="in_progress">В работе</option>
                </select>
              </Field>
              <Field label="Наша роль">
                <select className={inputCls} value={p.role} onChange={(e) => set("role", e.target.value as Project["role"])}>
                  <option value="general">Генеральный подрядчик</option>
                  <option value="contractor">Подрядчик</option>
                  <option value="reconstruction">Реконструкция</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <I18nField label="Уточнение роли" hint="Если стандартной подписи мало: «Подрядчик по бетонным и стальным работам»" value={p.role_text} onChange={(v) => set("role_text", v)} />
              </div>
              <I18nField label="Заказчик" value={p.client} onChange={(v) => set("client", v)} />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Год">
                  <input type="number" className={inputCls} value={p.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} />
                </Field>
                <Field label="Площадь, м²">
                  <input type="number" className={inputCls} value={p.area_m2 ?? ""} onChange={(e) => set("area_m2", e.target.value ? Number(e.target.value) : null)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Описание">
            <I18nField label="Текст на странице объекта" multiline rows={6} value={p.description} onChange={(v) => set("description", v)}
                       hint="Абзацы разделяйте пустой строкой." />
          </Card>

          <Card title="Адрес и карта">
            <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
              <div className="space-y-5">
                <I18nField label="Адрес" value={p.address} onChange={(v) => set("address", v)} />
                {select(p.city_id, cities, (v) => set("city_id", v), "Город")}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Широта">
                    <input type="number" step="any" className={inputCls} value={p.lat ?? ""} onChange={(e) => set("lat", e.target.value ? Number(e.target.value) : null)} />
                  </Field>
                  <Field label="Долгота">
                    <input type="number" step="any" className={inputCls} value={p.lng ?? ""} onChange={(e) => set("lng", e.target.value ? Number(e.target.value) : null)} />
                  </Field>
                </div>
                <p className="text-xs text-ink-400">Нажмите на карту или перетащите метку, чтобы указать точное место.</p>
              </div>
              <MapPicker lat={p.lat} lng={p.lng} onChange={(lat, lng) => {
                setP((prev) => (prev ? { ...prev, lat, lng } : prev));
                setDirty(true);
              }} />
            </div>
          </Card>

          <Card title={`Фотографии${p.photos ? ` (${p.photos.length})` : ""}`}>
            {p.id ? (
              <PhotoManager projectId={p.id} photos={p.photos ?? []} cover={p.cover ?? ""}
                            onProject={(upd) => setP((prev) => (prev ? { ...prev, photos: upd.photos, cover: upd.cover } : prev))} />
            ) : (
              <p className="rounded-xl bg-sand p-4 text-sm text-ink-500">Сохраните объект — после этого можно загружать фото.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Card title="Публикация">
            <div className="space-y-4">
              <Toggle checked={p.is_published} onChange={(v) => set("is_published", v)} label="Показывать на сайте" />
              <Toggle checked={p.is_featured} onChange={(v) => set("is_featured", v)} label="В подборке на главной" />
            </div>
          </Card>
          <Card title="Виды работ">
            <div className="flex flex-wrap gap-2">
              {services.map((s) => {
                const on = p.service_ids.includes(s.id);
                return (
                  <button key={s.id} type="button"
                          onClick={() => set("service_ids", on ? p.service_ids.filter((x) => x !== s.id) : [...p.service_ids, s.id])}
                          className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${on ? "border-brand bg-brand-50 text-brand-700" : "border-ink/15 text-ink-500 hover:border-ink/35"}`}>
                    {s.title.ru}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink-400">Объект появится на страницах выбранных услуг.</p>
          </Card>
          {p.id && (
            <Button variant="danger" className="w-full" onClick={remove}>Удалить объект</Button>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-white/95 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-end gap-3 px-3 py-3 sm:px-8">
          {dirty && <span className="text-xs text-ink-500 sm:text-sm">Есть несохранённые изменения</span>}
          <Button variant="primary" loading={saving} onClick={save}>{p.id ? "Сохранить" : "Создать объект"}</Button>
        </div>
      </div>
    </div>
  );
}
