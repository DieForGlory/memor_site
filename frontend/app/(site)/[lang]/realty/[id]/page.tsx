import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Check, Pin } from "@/components/icons";
import { LeadSection } from "@/components/site/LeadSection";
import { Eyebrow } from "@/components/site/PageHeader";
import { RealtyCover } from "@/components/site/RealtyCard";
import { RealtyExplorer } from "@/components/site/RealtyExplorer";
import { getRealtyProject, getSite } from "@/lib/api";
import { getDict, href, LANGS } from "@/lib/i18n";
import { areaRange, fill, moneyShort } from "@/lib/realty";
import { Accent, typo } from "@/lib/typography";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ lang: Lang; id: string }> };

function projectId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return id;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const p = await getRealtyProject(projectId(id));
  const t = getDict(lang);
  return {
    title: `${p.name} — ${t.nav.realty}`,
    description: (p.description || t.realty.lead).slice(0, 180),
    alternates: { canonical: `/${lang}/realty/${p.id}`, languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/realty/${p.id}`])) },
    openGraph: p.cover ? { images: [p.cover] } : undefined,
  };
}

export default async function RealtyProjectPage({ params }: Props) {
  const { lang, id } = await params;
  const [site, p] = await Promise.all([getSite(lang), getRealtyProject(projectId(id))]);
  const t = getDict(lang);
  const r = t.realty;
  const s = p.stats;
  const facts = [
    { label: r.freeLong, value: String(s.free) },
    { label: r.priceFrom, value: moneyShort(s.price_from, p.currency, lang, r) },
    { label: r.area, value: areaRange(s.area_min, s.area_max, lang, r) },
    ...(s.floors_max ? [{ label: r.floors, value: fill(r.floorsValue, { n: s.floors_max }) }] : []),
  ];
  const paragraphs = p.description.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);

  return (
    <>
      {/* Первый экран: фото комплекса (или графит), название антиквой, ключевые цифры */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        {p.cover ? (
          <div className="absolute inset-0 opacity-45">
            <RealtyCover src={p.cover} name={p.name} noPhoto="" />
          </div>
        ) : (
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-brand/20 blur-[120px]" />
        )}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
        <div className="container-x relative pb-12 pt-28 sm:pb-16 sm:pt-36 lg:pb-20 lg:pt-44">
          <nav aria-label="Breadcrumbs" className="mb-6 flex flex-wrap items-center gap-x-2 text-sm text-white/50 sm:mb-8">
            <Link href={href(lang)} className="inline-block py-1.5 hover:text-white">MEMOR GROUP</Link>
            <span aria-hidden="true">/</span>
            <Link href={href(lang, "/realty")} className="inline-block py-1.5 hover:text-white">{t.nav.realty}</Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/80">{p.name}</span>
          </nav>
          <p className="eyebrow !text-brand">{r.complexEyebrow}</p>
          <h1 className="display-title mt-4 max-w-4xl">{p.name}</h1>
          {p.address && (
            <p className="mt-5 flex items-start gap-2 text-base text-white/70 sm:text-lg">
              <Pin size={18} className="mt-1 shrink-0 text-brand" /> {p.address}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#units" className="btn-primary">{r.open}</a>
            <a href="#lead" className="btn-ghost-light">{r.pick}</a>
          </div>
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-8 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">{f.label}</dt>
                <dd className="stat-num mt-2 text-[28px] sm:text-[40px]">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* О комплексе: описание, преимущества, фото */}
      {(paragraphs.length > 0 || p.usp.length > 0 || p.images.length > 1) && (
        <section className="py-16 sm:py-20 lg:py-24">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            <div>
              <Eyebrow index="01" text={r.complexEyebrow} />
              <h2 className="section-title mt-5"><Accent text={r.aboutTitle} /></h2>
            </div>
            <div>
              {paragraphs.map((para, i) => (
                <p key={i} className={i === 0 ? "font-display text-[21px] leading-[1.45] text-ink sm:text-[28px] sm:leading-[1.35]" : "lead-text mt-5 text-ink-700"}>
                  {typo(para, lang)}
                </p>
              ))}
              {p.usp.length > 0 && (
                <ul className="mt-8 grid gap-3">
                  {p.usp.map((u) => (
                    <li key={u} className="flex items-start gap-3 text-[17px] text-ink-700">
                      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"><Check size={15} /></span>
                      {typo(u, lang)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          {p.images.length > 1 && (
            <div className="container-x mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {p.images.slice(1, 9).map((src, i) => (
                <div key={src} className={`overflow-hidden rounded-[18px] bg-sand ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- фото отдаёт CRM со своего домена */}
                  <img src={src} alt={`${p.name} — ${r.galleryTitle} ${i + 1}`} loading="lazy" className="aspect-[4/3] h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <RealtyExplorer lang={lang} t={r} layouts={p.layouts} units={p.units} currency={p.currency} />

      <LeadSection lang={lang} site={site} title={r.leadTitle} text={r.leadText}
                   variant="apartment" crmProjectId={p.id} projectTitle={p.name} regardingLabel={r.regarding} />
    </>
  );
}
