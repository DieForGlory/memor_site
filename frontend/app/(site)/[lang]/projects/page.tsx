import type { Metadata } from "next";

import { LeadSection } from "@/components/site/LeadSection";
import { PageHeader } from "@/components/site/PageHeader";
import { ProjectsCatalog } from "@/components/site/ProjectsCatalog";
import { getCatalog, getSite } from "@/lib/api";
import { getDict, href, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Props = {
  params: Promise<{ lang: Lang }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(lang);
  return {
    title: t.catalog.title,
    description: t.catalog.lead,
    alternates: { canonical: `/${lang}/projects`, languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/projects`])) },
  };
}

export default async function ProjectsPage({ params, searchParams }: Props) {
  const { lang } = await params;
  const sp = await searchParams;
  const [site, data] = await Promise.all([getSite(lang), getCatalog(lang)]);
  const t = getDict(lang);
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  return (
    <>
      <PageHeader
        title={t.catalog.title}
        lead={t.catalog.lead}
        crumbs={[{ href: href(lang), label: "MEMOR GROUP" }, { label: t.catalog.title }]}
      >
        <p className="stat-num text-[64px] italic text-brand sm:text-[96px] lg:text-[128px]">{data.items.length}</p>
      </PageHeader>
      <section className="bg-sand py-6 sm:py-12 lg:py-16">
        <div className="container-x">
          <ProjectsCatalog
            lang={lang}
            data={data}
            t={t.catalog}
            sectorAll={t.sector.all}
            mapLabels={{ city: t.home.mapCity, country: t.home.mapAll, more: t.cta.more }}
            initial={{
              sector: one("sector"),
              status: one("status"),
              type: one("type"),
              city: one("city"),
              view: one("view") === "map" ? "map" : "grid",
            }}
          />
        </div>
      </section>
      <LeadSection lang={lang} site={site} />
    </>
  );
}
