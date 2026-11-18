import Link from "next/link";

import { ArrowUpRight, Pin } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import type { Dict } from "@/lib/i18n";
import { areaRange, fill, moneyShort, roomsLabel } from "@/lib/realty";
import type { Lang, RealtySummary } from "@/lib/types";

interface Props {
  lang: Lang;
  project: RealtySummary;
  t: Dict["realty"];
  size?: "md" | "lg";
}

/** Обложка комплекса; без фото — графитовая плашка со знаком MEMOR */
export function RealtyCover({ src, name, noPhoto, className = "" }: { src: string | null; name: string; noPhoto: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- фото отдаёт CRM со своего домена
    return <img src={src} alt={name} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div className={`relative grid h-full w-full place-items-center overflow-hidden bg-ink-900 ${className}`}>
      <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-[90px]" />
      <div className="relative flex flex-col items-center gap-4 text-center">
        <LogoMark className="h-16 w-16 text-brand/80" />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">{noPhoto}</span>
      </div>
    </div>
  );
}

export function RealtyCard({ lang, project: p, t, size = "md" }: Props) {
  const s = p.stats;
  return (
    <Link
      href={`/${lang}/realty/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-[24px] border border-ink/8 bg-white transition-[border-color,box-shadow] duration-300 hover:border-brand/40 hover:shadow-[0_18px_50px_-24px_rgba(36,36,36,0.35)]"
    >
      <div className={`relative overflow-hidden ${size === "lg" ? "aspect-[16/9]" : "aspect-[4/3] sm:aspect-[16/10]"}`}>
        <RealtyCover src={p.cover} name={p.name} noPhoto={t.noPhoto}
                     className="transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]" />
        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-ink backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {s.free} {t.free}
        </span>
        <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-brand text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <ArrowUpRight size={18} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">{t.complexEyebrow}</p>
        <h3 className={`card-title mt-3 ${size === "lg" ? "text-[30px] sm:text-[40px]" : "text-[26px] sm:text-[32px]"}`}>{p.name}</h3>
        {p.address && (
          <p className="mt-2 flex items-start gap-2 text-[15px] text-ink-500">
            <Pin size={16} className="mt-0.5 shrink-0 text-brand" />
            {p.address}
          </p>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink/8 pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">{t.priceFrom}</dt>
            <dd className="stat-num mt-1.5 text-[22px] sm:text-[26px]">{moneyShort(s.price_from, p.currency, lang, t)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">{t.area}</dt>
            <dd className="stat-num mt-1.5 text-[22px] sm:text-[26px]">{areaRange(s.area_min, s.area_max, lang, t)}</dd>
          </div>
          {s.floors_max && (
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">{t.floors}</dt>
              <dd className="stat-num mt-1.5 text-[22px] sm:text-[26px]">{fill(t.floorsValue, { n: s.floors_max })}</dd>
            </div>
          )}
        </dl>
        {s.rooms.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {s.rooms.map((r) => (
              <span key={r} className="chip border-ink/12 !py-1.5 text-[13px] text-ink-700">{roomsLabel(t, "APARTMENT", r)}</span>
            ))}
          </div>
        )}
        <span className="mt-auto inline-flex items-center gap-2 pt-6 text-[15px] font-semibold text-brand-700">
          {t.open} <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  );
}
