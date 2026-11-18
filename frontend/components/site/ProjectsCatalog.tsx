"use client";

import { useEffect, useMemo, useState } from "react";

import { ChevronDown, Grid, MapIcon } from "@/components/icons";
import type { Dict } from "@/lib/i18n";
import type { CatalogData, Lang } from "@/lib/types";

import { ProjectCard } from "./ProjectCard";
import { ProjectsMap } from "./ProjectsMap";

interface Filters {
  sector: string;
  status: string;
  type: string;
  city: string;
  view: "grid" | "map";
}

interface Props {
  lang: Lang;
  data: CatalogData;
  initial: Partial<Filters>;
  t: Dict["catalog"];
  sectorAll: string;
  mapLabels: { city: string; country: string; more: string };
}

const EMPTY: Filters = { sector: "", status: "", type: "", city: "", view: "grid" };

export function ProjectsCatalog({ lang, data, initial, t, sectorAll, mapLabels }: Props) {
  const [f, setF] = useState<Filters>({ ...EMPTY, ...initial });

  const items = useMemo(
    () =>
      data.items.filter(
        (p) =>
          (!f.sector || p.sector === f.sector) &&
          (!f.status || p.status === f.status) &&
          (!f.type || p.type?.slug === f.type) &&
          (!f.city || p.city?.slug === f.city),
      ),
    [data.items, f],
  );

  // Фильтры живут в адресе страницы — ссылкой на выборку можно поделиться.
  useEffect(() => {
    const params = new URLSearchParams();
    (Object.keys(f) as (keyof Filters)[]).forEach((k) => {
      if (f[k] && !(k === "view" && f[k] === "grid")) params.set(k, f[k]);
    });
    const qs = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [f]);

  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));
  const dirty = f.sector || f.status || f.type || f.city;

  const chip = (active: boolean) =>
    `chip shrink-0 whitespace-nowrap ${active ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink-700 hover:border-ink/40"}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-3 shadow-[0_1px_0_rgb(0_0_0/0.04),0_20px_50px_-30px_rgb(0_0_0/0.25)] sm:gap-4 sm:p-5">
        <div className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <button type="button" className={chip(!f.sector)} onClick={() => set({ sector: "" })}>{sectorAll}</button>
          {data.filters.sectors.map((s) => (
            <button key={s.key} type="button" className={chip(f.sector === s.key)} onClick={() => set({ sector: s.key })}>
              {s.label}
            </button>
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-ink/10" />
          {data.filters.statuses.map((s) => (
            <button key={s.key} type="button" className={chip(f.status === s.key)}
                    onClick={() => set({ status: f.status === s.key ? "" : s.key })}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid w-full grid-cols-2 items-center gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Select label={t.type} any={t.any} value={f.type} onChange={(type) => set({ type })}
                  options={data.filters.types.map((x) => ({ value: x.slug, label: x.title }))} />
          <Select label={t.city} any={t.any} value={f.city} onChange={(city) => set({ city })}
                  options={data.filters.cities.map((x) => ({ value: x.slug, label: x.title }))} />
          <div className="col-span-2 flex rounded-full border border-ink/15 p-1">
            {(["grid", "map"] as const).map((v) => (
              <button key={v} type="button" onClick={() => set({ view: v })} aria-pressed={f.view === v}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium sm:flex-none sm:py-1.5 ${
                        f.view === v ? "bg-ink text-white" : "text-ink-700"
                      }`}>
                {v === "grid" ? <Grid size={16} /> : <MapIcon size={16} />} {v === "grid" ? t.grid : t.map}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-ink-500 sm:mt-6">
        <span>
          {t.found}: <b className="text-ink">{items.length}</b>
        </span>
        {dirty && (
          <button type="button" onClick={() => setF((prev) => ({ ...EMPTY, view: prev.view }))}
                  className="font-semibold text-brand-600 hover:underline">
            {t.reset}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-10 rounded-3xl bg-white p-12 text-center text-ink-500">{t.empty}</p>
      ) : f.view === "map" ? (
        <ProjectsMap lang={lang} projects={items} tone="muted" labels={mapLabels}
                     className="mt-5 h-[70svh] min-h-[420px] rounded-3xl sm:h-[640px]" />
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {items.map((p) => (
            <ProjectCard key={p.id} lang={lang} project={p} photosLabel={t.photos} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({ label, any, value, onChange, options }: {
  label: string;
  any: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative min-w-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none truncate rounded-full border py-2.5 pl-4 pr-9 text-sm font-medium outline-none transition-colors sm:py-2 ${
          value ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink-700 hover:border-ink/40"
        }`}
      >
        <option value="">{label}: {any}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${value ? "text-white" : "text-ink-500"}`} />
    </label>
  );
}
