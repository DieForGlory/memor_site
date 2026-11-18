import type { Metadata } from "next";

import { LeadSection } from "@/components/site/LeadSection";
import { PageHeader, SectionHeading } from "@/components/site/PageHeader";
import { getHome, getSite } from "@/lib/api";
import { getDict, href, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const [site, t] = [await getSite(lang), getDict(lang)];
  return {
    title: t.about.title,
    description: site.about_short,
    alternates: { canonical: `/${lang}/about`, languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/about`])) },
  };
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params;
  const [site, home] = await Promise.all([getSite(lang), getHome(lang)]);
  const t = getDict(lang);
  const stats = [
    { value: String(site.founded_year), label: t.stats.founded },
    { value: `${site.companies_count}+`, label: t.stats.companies },
    { value: `${site.employees_count}+`, label: t.stats.specialists },
    { value: String(home.stats.projects), label: t.stats.projects },
  ];
  const photo = home.hero[0]?.image;

  return (
    <>
      <PageHeader title={t.about.title} lead={site.about_short}
                  crumbs={[{ href: href(lang), label: "MEMOR GROUP" }, { label: t.about.title }]} />

      <section className="py-12 sm:py-16 lg:py-24">
        <div className="container-x">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[28px] border border-ink/10 bg-ink/10 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white p-5 sm:p-8">
                <dd className="stat-num text-[48px] text-brand sm:text-[64px] lg:text-[76px]">{s.value}</dd>
                <dt className="mt-3 text-sm text-ink-500">{s.label}</dt>
              </div>
            ))}
          </dl>

          <div className="mt-12 grid gap-10 sm:mt-20 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
            {photo && (
              <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-sand sm:aspect-[16/10] lg:sticky lg:top-28 lg:aspect-[4/5] lg:self-start lg:rounded-[28px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={site.company_name} className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              <h2 className="section-title italic">{site.letter_title}</h2>
              {(() => {
                const [first, ...rest] = site.letter_text.split(/\n{2,}/);
                return (
                  <>
                    <blockquote className="relative mt-8 pt-14 sm:pt-16">
                      <span aria-hidden="true" className="absolute left-0 top-0 font-display text-[88px] leading-[0.85] text-brand/30 sm:-left-1 sm:text-[110px]">«</span>
                      <p className="relative font-display text-[20px] leading-[1.5] text-ink sm:text-[26px] lg:text-[29px] lg:leading-[1.4]">{first}</p>
                    </blockquote>
                    <div className="prose-site mt-10">
                      {rest.map((para, i) => <p key={i}>{para}</p>)}
                    </div>
                    <p className="mt-8 font-display text-xl italic text-ink-500">— {site.company_name}</p>
                  </>
                );
              })()}
              {site.clients && (
                <div className="mt-10 rounded-[24px] bg-sand p-6 sm:mt-12 sm:p-8">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-400">{t.about.clients}</h3>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {site.clients.split(",").map((c) => (
                      <li key={c} className="rounded-full bg-white px-4 py-2 text-sm font-semibold">{c.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {home.advantages.length > 0 && (
        <section className="bg-ink py-20 text-white lg:py-28">
          <div className="container-x">
            <SectionHeading eyebrow={t.home.advantagesEyebrow} title={t.home.advantagesTitle} tone="dark" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {home.advantages.map((a, i) => (
                <div key={a.id} className="rounded-[24px] border border-white/10 p-6 sm:p-8">
                  <span className="font-display text-[22px] font-medium italic text-brand">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="card-title mt-5 text-[25px]">{a.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/60">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {home.equipment.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-28">
          <div className="container-x">
            <SectionHeading eyebrow={t.home.equipmentEyebrow} title={t.home.equipmentTitle} />
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {home.equipment.map((e) => (
                <figure key={e.id}>
                  <div className="aspect-[4/3] overflow-hidden rounded-[22px] bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {e.thumb && <img src={e.thumb} alt={e.title} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <figcaption className="card-title mt-3 text-[20px]">{e.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {home.documents.length > 0 && (
        <section className="bg-sand py-16 sm:py-20 lg:py-28">
          <div className="container-x">
            <SectionHeading title={t.home.documentsTitle} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {home.documents.map((d) => (
                <a key={d.id} href={d.image} target="_blank" rel="noopener noreferrer"
                   className="block overflow-hidden rounded-[22px] bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.thumb} alt={d.title} loading="lazy" className="aspect-[3/4] w-full object-contain" />
                  <p className="mt-4 text-sm font-semibold">{d.title}</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <LeadSection lang={lang} site={site} />
    </>
  );
}
