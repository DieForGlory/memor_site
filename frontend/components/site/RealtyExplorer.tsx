"use client";

import { useMemo, useState } from "react";

import { ArrowRight } from "@/components/icons";
import type { Dict } from "@/lib/i18n";
import { area, areaRange, fill, money, moneyShort, roomsLabel } from "@/lib/realty";
import { Accent } from "@/lib/typography";
import type { Lang, RealtyLayout, RealtyUnit } from "@/lib/types";

import { LEAD_PREFILL_EVENT } from "./LeadForm";
import { Eyebrow } from "./PageHeader";

interface Props {
  lang: Lang;
  t: Dict["realty"];
  layouts: RealtyLayout[];
  units: RealtyUnit[];
  currency: string;
}

const PAGE = 12;
const keyOf = (type: string, rooms: number | null) => `${type}:${type === "APARTMENT" ? rooms ?? "" : ""}`;

/** Схематичная планировка, когда в CRM нет картинки: комнаты — прямоугольники */
function PlanSketch({ rooms }: { rooms: number | null }) {
  const n = Math.max(1, Math.min(rooms ?? 1, 4));
  const cells = [
    [[8, 8, 84, 84]],
    [[8, 8, 46, 84], [58, 8, 34, 50], [58, 62, 34, 30]],
    [[8, 8, 46, 50], [58, 8, 34, 50], [8, 62, 46, 30], [58, 62, 34, 30]],
    [[8, 8, 30, 50], [42, 8, 24, 50], [70, 8, 22, 50], [8, 62, 46, 30], [58, 62, 34, 30]],
  ][n - 1];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full text-ink/25" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {cells.map(([x, y, w, h], i) => <rect key={i} x={x} y={y} width={w} height={h} rx="2" />)}
      <path d="M8 58h8M30 58h8" className="text-brand" stroke="currentColor" />
    </svg>
  );
}

export function RealtyExplorer({ lang, t, layouts, units, currency }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE);

  const visible = useMemo(
    () => (filter === "all" ? units : units.filter((u) => keyOf(u.type, u.rooms) === filter)),
    [filter, units],
  );
  const shown = visible.slice(0, limit);

  const choose = (key: string) => {
    setFilter(key);
    setLimit(PAGE);
  };

  const ask = (u: RealtyUnit) => {
    const text = fill(t.askText, {
      number: u.number,
      building: u.building,
      rooms: roomsLabel(t, u.type, u.rooms),
      area: area(u.area, lang),
      floor: u.floor ?? "—",
    });
    window.dispatchEvent(new CustomEvent(LEAD_PREFILL_EVENT, { detail: text }));
    document.getElementById("lead")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Планировки: карточки — они же фильтр списка */}
      {layouts.length > 0 && (
        <section className="bg-sand py-16 sm:py-20 lg:py-24" id="layouts">
          <div className="container-x">
            <Eyebrow index="02" text={t.layoutsEyebrow} />
            <h2 className="section-title mt-5"><Accent text={t.layoutsTitle} /></h2>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:mt-12 lg:grid-cols-4">
              {layouts.map((l) => {
                const key = keyOf(l.type, l.rooms);
                const active = filter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      choose(active ? "all" : key);
                      document.getElementById("units")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    aria-pressed={active}
                    className={`group flex flex-col rounded-[18px] border bg-white p-3 text-left transition-[border-color,box-shadow] duration-300 sm:rounded-[22px] sm:p-6 ${
                      active ? "border-brand shadow-[0_0_0_3px_rgba(243,127,59,0.15)]" : "border-ink/8 hover:border-brand/40"
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl bg-sand/70 p-2 sm:rounded-2xl sm:p-4">
                      {l.image
                        // eslint-disable-next-line @next/next/no-img-element -- планировки отдаёт CRM со своего домена
                        ? <img src={l.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                        : <PlanSketch rooms={l.rooms} />}
                    </div>
                    <p className="card-title mt-3 text-[18px] sm:mt-5 sm:text-[24px]">{roomsLabel(t, l.type, l.rooms, true)}</p>
                    <p className="mt-1 text-[13px] text-ink-500 sm:text-[15px]">{areaRange(l.area_min, l.area_max, lang, t)}</p>
                    <div className="mt-3 flex flex-col gap-2 border-t border-ink/8 pt-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:pt-4">
                      <span>
                        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">{t.priceFrom}</span>
                        <span className="stat-num mt-1 block text-[17px] sm:text-[20px]">{moneyShort(l.price_from, currency, lang, t)}</span>
                      </span>
                      <span className="w-fit shrink-0 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand-700">
                        {fill(t.layoutsCount, { n: l.count })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Свободные квартиры */}
      <section className="scroll-mt-20 py-16 sm:py-20 lg:py-24" id="units">
        <div className="container-x">
          <Eyebrow index="03" text={t.unitsEyebrow} />
          <h2 className="section-title mt-5"><Accent text={t.unitsTitle} /></h2>

          {units.length === 0 ? (
            <p className="mt-10 max-w-2xl rounded-[22px] bg-sand p-8 text-lg text-ink-700">{t.empty}</p>
          ) : (
            <>
              <div className="mt-8 flex flex-wrap gap-2" role="group">
                <button type="button" onClick={() => choose("all")} aria-pressed={filter === "all"}
                        className={`chip ${filter === "all" ? "border-ink bg-ink text-white" : "border-ink/15 text-ink-700 hover:border-ink/40"}`}>
                  {t.all} · {units.length}
                </button>
                {layouts.map((l) => {
                  const key = keyOf(l.type, l.rooms);
                  return (
                    <button key={key} type="button" onClick={() => choose(key)} aria-pressed={filter === key}
                            className={`chip ${filter === key ? "border-brand bg-brand text-white" : "border-ink/15 text-ink-700 hover:border-ink/40"}`}>
                      {roomsLabel(t, l.type, l.rooms)} · {l.count}
                    </button>
                  );
                })}
              </div>

              {/* Таблица — с планшета; на телефоне — карточки */}
              <div className="mt-8 hidden overflow-hidden rounded-[22px] border border-ink/8 md:block">
                <table className="w-full text-left text-[15px] [font-variant-numeric:lining-nums_tabular-nums]">
                  <thead className="bg-sand/70 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
                    <tr>
                      <th className="px-5 py-4 font-bold">{t.columns.number}</th>
                      <th className="px-5 py-4 font-bold">{t.columns.building}</th>
                      <th className="px-5 py-4 font-bold">{t.columns.rooms}</th>
                      <th className="px-5 py-4 font-bold">{t.columns.area}</th>
                      <th className="px-5 py-4 font-bold">{t.columns.floor}</th>
                      <th className="hidden px-5 py-4 font-bold lg:table-cell">{t.columns.finishing}</th>
                      <th className="px-5 py-4 text-right font-bold">{t.columns.price}</th>
                      <th className="px-5 py-4"><span className="sr-only">{t.ask}</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/6">
                    {shown.map((u) => (
                      <tr key={u.id} className="transition-colors hover:bg-brand/[0.03]">
                        <td className="px-5 py-4 font-semibold">{u.number}</td>
                        <td className="px-5 py-4 text-ink-500">{u.building}</td>
                        <td className="px-5 py-4">{roomsLabel(t, u.type, u.rooms)}</td>
                        <td className="px-5 py-4">{area(u.area, lang)} {t.sqm}</td>
                        <td className="px-5 py-4">{u.floors_total ? fill(t.floorOf, { floor: u.floor ?? "—", total: u.floors_total }) : u.floor}</td>
                        <td className="hidden px-5 py-4 text-ink-500 lg:table-cell">
                          {(t.finishing as Record<string, string>)[u.finishing] ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold">{money(u.price, currency, lang, t)}</td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" onClick={() => ask(u)}
                                  className="btn-ghost-dark !px-4 !py-2 text-[13px]">{t.ask}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="mt-8 grid gap-3 md:hidden">
                {shown.map((u) => (
                  <li key={u.id} className="rounded-[20px] border border-ink/8 bg-white p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="card-title text-[22px]">{roomsLabel(t, u.type, u.rooms)} · {area(u.area, lang)} {t.sqm}</p>
                      <span className="shrink-0 text-sm text-ink-400">№{u.number}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {u.building} · {t.columns.floor.toLowerCase()} {u.floors_total ? fill(t.floorOf, { floor: u.floor ?? "—", total: u.floors_total }) : u.floor}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink/8 pt-4">
                      <span className="stat-num text-[20px]">{money(u.price, currency, lang, t)}</span>
                      <button type="button" onClick={() => ask(u)} className="btn-primary !px-4 !py-2 text-[13px]">{t.ask}</button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-ink-500">{fill(t.shown, { shown: shown.length, total: visible.length })}</p>
                {visible.length > shown.length && (
                  <button type="button" onClick={() => setLimit((n) => n + PAGE * 2)} className="btn-ghost-dark">
                    {t.showMore} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
