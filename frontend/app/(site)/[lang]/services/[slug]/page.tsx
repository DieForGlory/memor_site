import type { Metadata } from "next";
import Link from "next/link";

import { ArrowRight, ServiceIcon } from "@/components/icons";
import { LeadSection } from "@/components/site/LeadSection";
import { PageHeader, SectionHeading } from "@/components/site/PageHeader";
import { ProjectCard } from "@/components/site/ProjectCard";
import { getService, getSite } from "@/lib/api";
import { getDict, href, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ lang: Lang; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const s = await getService(lang, slug);
  return {
    title: s.title,
    description: s.short,
    alternates: {
      canonical: `/${lang}/services/${s.slug}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/services/${s.slug}`])),
    },
  };
}

export default async function ServicePage({ params }: Props) {
  const { lang, slug } = await params;
  const [site, s] = await Promise.all([getSite(lang), getService(lang, slug)]);
  const t = getDict(lang);
  const others = site.services.filter((x) => x.id !== s.id);

  return (
    <>
      <PageHeader
        title={s.title}
        lead={s.short}
        crumbs={[
          { href: href(lang), label: "MEMOR GROUP" },
          { href: href(lang, "/services"), label: t.services.title },
          { label: s.title },
        ]}
      >
        <span className="hidden h-24 w-24 shrink-0 place-items-center rounded-[28px] bg-brand text-white sm:grid">
          <ServiceIcon name={s.icon} size={44} />
        </span>
      </PageHeader>

      <section className="py-12 sm:py-16 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-20">
          <div className="prose-site max-w-3xl">
            {s.description.split(/\n{2,}/).map((para, i) => (
              <p key={i} className={i === 0 ? "!font-display !text-[21px] !leading-[1.45] !text-ink sm:!text-[30px] sm:!leading-[1.35]" : "lead-text !text-ink-700"}>{para}</p>
            ))}
          </div>
          <aside>
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-400">{t.services.other}</h2>
            <ul className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={href(lang, `/services/${o.slug}`)}
                        className="flex items-center justify-between gap-4 py-4 font-semibold hover:text-brand-700">
                    {o.title} <ArrowRight size={18} className="shrink-0 text-brand" />
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {s.projects.length > 0 && (
        <section className="bg-sand py-16 sm:py-20 lg:py-28">
          <div className="container-x">
            <SectionHeading
              title={t.services.projects}
              action={
                <Link href={href(lang, "/projects")} className="btn-ghost-dark shrink-0">
                  {t.cta.allProjects} <ArrowRight size={18} />
                </Link>
              }
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {s.projects.map((p) => (
                <ProjectCard key={p.id} lang={lang} project={p} photosLabel={t.catalog.photos} />
              ))}
            </div>
          </div>
        </section>
      )}

      <LeadSection lang={lang} site={site} title={t.services.askTitle} serviceId={s.id} />
    </>
  );
}
