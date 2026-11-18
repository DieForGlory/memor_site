import type { Metadata } from "next";
import Link from "next/link";

import { ArrowUpRight, ServiceIcon } from "@/components/icons";
import { LeadSection } from "@/components/site/LeadSection";
import { PageHeader } from "@/components/site/PageHeader";
import { getServices, getSite } from "@/lib/api";
import { getDict, href, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: t.services.title,
    description: t.services.lead,
    alternates: { canonical: `/${lang}/services`, languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/services`])) },
  };
}

export default async function ServicesPage({ params }: Props) {
  const { lang } = await params;
  const [site, services] = await Promise.all([getSite(lang), getServices(lang)]);
  const t = getDict(lang);

  return (
    <>
      <PageHeader title={t.services.title} lead={t.services.lead}
                  crumbs={[{ href: href(lang), label: "MEMOR GROUP" }, { label: t.services.title }]} />
      <section className="py-12 sm:py-16 lg:py-24">
        <div className="container-x">
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {services.map((s, i) => (
              <li key={s.id}>
                <Link href={href(lang, `/services/${s.slug}`)}
                      className="group grid items-center gap-4 py-6 transition-colors sm:grid-cols-[80px_1fr_auto] sm:gap-6 sm:py-8 lg:grid-cols-[80px_1.1fr_1fr_auto] lg:py-10">
                  <span className="hidden font-display text-[26px] font-medium italic text-brand-600 sm:inline">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex items-center gap-5">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                      <ServiceIcon name={s.icon} size={28} />
                    </span>
                    <span className="card-title text-[24px] transition-colors group-hover:text-brand-700 sm:text-[30px] lg:text-[38px]">{s.title}</span>
                  </span>
                  <span className="text-[15px] leading-relaxed text-ink-500 sm:col-start-2 lg:col-start-auto">
                    {s.short}
                    {!!s.projects_count && (
                      <span className="mt-2 block text-sm font-semibold text-ink">
                        {s.projects_count} {t.services.count}
                      </span>
                    )}
                  </span>
                  <span className="hidden h-14 w-14 place-items-center rounded-full border border-ink/15 transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white sm:grid">
                    <ArrowUpRight />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <LeadSection lang={lang} site={site} />
    </>
  );
}
