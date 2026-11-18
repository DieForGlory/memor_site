import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeadSection } from "@/components/site/LeadSection";
import { PageHeader } from "@/components/site/PageHeader";
import { RealtyCard } from "@/components/site/RealtyCard";
import { getRealty, getSite } from "@/lib/api";
import { getDict, href, LANGS } from "@/lib/i18n";
import { plain } from "@/lib/typography";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: plain(t.realty.title),
    description: t.realty.lead,
    alternates: { canonical: `/${lang}/realty`, languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/realty`])) },
  };
}

export default async function RealtyPage({ params }: Props) {
  const { lang } = await params;
  const [site, data] = await Promise.all([getSite(lang), getRealty()]);
  // Раздел выключен в админке — страницы нет
  if (!data.enabled) notFound();
  const t = getDict(lang);
  const free = data.projects.reduce((sum, p) => sum + p.stats.free, 0);

  return (
    <>
      <PageHeader
        title={t.realty.title}
        lead={t.realty.lead}
        eyebrow={t.realty.eyebrow}
        crumbs={[{ href: href(lang), label: "MEMOR GROUP" }, { label: t.nav.realty }]}
      >
        {data.available && free > 0 && (
          <div className="shrink-0">
            <p className="stat-num text-[64px] italic text-brand sm:text-[96px] lg:text-[128px]">{free}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">{t.realty.freeLong}</p>
          </div>
        )}
      </PageHeader>

      <section className="bg-sand py-12 sm:py-16 lg:py-20">
        <div className="container-x">
          {!data.available || data.projects.length === 0 ? (
            <p className="max-w-2xl rounded-[22px] bg-white p-8 text-lg leading-relaxed text-ink-700">
              {data.available ? t.realty.empty : t.realty.unavailable}
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {data.projects.map((p, i) => (
                // Нечётное число комплексов: первый — во всю ширину
                <div key={p.id} className={data.projects.length % 2 === 1 && i === 0 ? "lg:col-span-2" : ""}>
                  <RealtyCard lang={lang} project={p} t={t.realty}
                              size={data.projects.length % 2 === 1 && i === 0 ? "lg" : "md"} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <LeadSection lang={lang} site={site} title={t.realty.leadTitle} text={t.realty.leadText} variant="apartment" />
    </>
  );
}
