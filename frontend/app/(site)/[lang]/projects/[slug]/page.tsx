import type { Metadata } from "next";
import Link from "next/link";

import { ArrowLeft, ArrowRight, ServiceIcon } from "@/components/icons";
import { Gallery } from "@/components/site/Gallery";
import { LeadSection } from "@/components/site/LeadSection";
import { SectionHeading } from "@/components/site/PageHeader";
import { ProjectCard, StatusBadge } from "@/components/site/ProjectCard";
import { ProjectsMap } from "@/components/site/ProjectsMap";
import { getProject, getSite } from "@/lib/api";
import { getDict, href, LANGS } from "@/lib/i18n";
import { plain } from "@/lib/typography";
import type { Lang } from "@/lib/types";

type Props = { params: Promise<{ lang: Lang; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = await getProject(lang, slug);
  const description = p.description || `${p.kicker}. ${p.role_label}. ${p.address}`;
  return {
    title: plain(p.title),
    description,
    alternates: {
      canonical: `/${lang}/projects/${p.slug}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/projects/${p.slug}`])),
    },
    openGraph: { title: p.title, description, images: p.cover ? [p.cover] : undefined },
  };
}

export default async function ProjectPage({ params }: Props) {
  const { lang, slug } = await params;
  const [site, p] = await Promise.all([getSite(lang), getProject(lang, slug)]);
  const t = getDict(lang);

  const facts = [
    { label: t.project.role, value: p.role_label },
    { label: t.project.client, value: p.client },
    { label: t.project.address, value: p.address },
    { label: t.project.sector, value: p.sector_label },
    { label: t.project.year, value: p.year ? String(p.year) : "" },
    { label: t.project.area, value: p.area_m2 ? `${p.area_m2.toLocaleString("ru-RU")} ${t.project.m2}` : "" },
  ].filter((f) => f.value);

  return (
    <>
      <section className="relative flex min-h-[72svh] items-end overflow-hidden bg-ink-950 text-white sm:min-h-[78svh]">
        {p.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt={p.title} fetchPriority="high" className="animate-hero-zoom absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/30" />
        <div className="container-x relative pb-10 pt-32 sm:pb-14 sm:pt-36 lg:pb-20">
          <nav aria-label="Breadcrumbs" className="mb-5 flex flex-wrap items-center gap-x-2 text-sm text-white/60 sm:mb-8">
            <Link href={href(lang)} className="inline-block py-1.5 hover:text-white">MEMOR GROUP</Link>
            <span aria-hidden="true">/</span>
            <Link href={href(lang, "/projects")} className="inline-block py-1.5 hover:text-white">{t.catalog.title}</Link>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={p.status} label={p.status_label} />
            {p.type && <span className="rounded-full border border-white/25 px-3 py-1 text-xs font-semibold">{p.type.title}</span>}
          </div>
          <p className="eyebrow mt-5 sm:mt-6">{p.kicker}</p>
          <h1 className="display-title mt-3 max-w-5xl text-balance">{p.title}</h1>
        </div>
      </section>

      <section className="py-12 sm:py-16 lg:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-20">
          <div>
            {p.description && (
              <div className="prose-site max-w-3xl">
                {p.description.split(/\n{2,}/).map((para, i) => (
                  <p key={i} className={i === 0 ? "!font-display !text-[21px] !leading-[1.45] !text-ink sm:!text-[30px] sm:!leading-[1.35]" : "lead-text !text-ink-700"}>{para}</p>
                ))}
              </div>
            )}
            {p.services.length > 0 && (
              <div className="mt-12">
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-400">{t.project.works}</h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  {p.services.map((s) => (
                    <Link key={s.id} href={href(lang, `/services/${s.slug}`)}
                          className="inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-sand py-2 pl-2 pr-5 text-sm font-semibold transition-colors hover:border-brand hover:text-brand-700">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-brand">
                        <ServiceIcon name={s.icon} size={18} />
                      </span>
                      {s.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <dl className="grid divide-y divide-ink/10 rounded-[24px] bg-sand p-6 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0 sm:p-7 lg:grid-cols-1 lg:divide-y">
              {facts.map((f) => (
                <div key={f.label} className="py-4 first:pt-0 last:pb-0 sm:py-3 lg:py-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{f.label}</dt>
                  <dd className="mt-1.5 text-[16px] font-semibold leading-snug text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
            <a href="#lead" className="btn-primary mt-4 w-full">
              {t.cta.discuss} <ArrowRight size={18} />
            </a>
          </aside>
        </div>
      </section>

      {p.photos.length > 0 && (
        <section className="pb-16 sm:pb-20 lg:pb-28">
          <div className="container-x">
            <SectionHeading title={t.project.gallery} />
            <Gallery photos={p.photos} stages={p.stages} allLabel={t.project.all} closeLabel={t.project.close} title={p.title} />
          </div>
        </section>
      )}

      {p.lat != null && p.lng != null && (
        <section className="pb-20 lg:pb-28">
          <div className="container-x">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-[0.16em] text-ink-400">{t.project.onMap}</h2>
            <ProjectsMap lang={lang} projects={[p]} single tone="muted" className="h-[300px] rounded-[24px] sm:h-[380px] sm:rounded-[28px]" />
          </div>
        </section>
      )}

      <nav className="border-y border-ink/10" aria-label="Pagination">
        <div className="container-x grid sm:grid-cols-2">
          {p.prev ? (
            <Link href={href(lang, `/projects/${p.prev.slug}`)} className="group flex items-center gap-4 py-8 sm:pr-8">
              <ArrowLeft className="shrink-0 text-brand transition-transform group-hover:-translate-x-1" />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{t.project.prev}</span>
                <span className="card-title mt-1 block text-[22px]">{p.prev.title}</span>
              </span>
            </Link>
          ) : <span />}
          {p.next && (
            <Link href={href(lang, `/projects/${p.next.slug}`)}
                  className="group flex items-center justify-end gap-4 border-t border-ink/10 py-8 text-right sm:border-l sm:border-t-0 sm:pl-8">
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{t.project.next}</span>
                <span className="card-title mt-1 block text-[22px]">{p.next.title}</span>
              </span>
              <ArrowRight className="shrink-0 text-brand transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </nav>

      {p.related.length > 0 && (
        <section className="bg-sand py-16 sm:py-20 lg:py-28">
          <div className="container-x">
            <SectionHeading
              title={t.project.related}
              action={
                <Link href={href(lang, "/projects")} className="btn-ghost-dark shrink-0">
                  {t.project.back} <ArrowRight size={18} />
                </Link>
              }
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {p.related.map((r) => (
                <ProjectCard key={r.id} lang={lang} project={r} photosLabel={t.catalog.photos} />
              ))}
            </div>
          </div>
        </section>
      )}

      <LeadSection lang={lang} site={site} title={t.project.similarTitle} text={t.project.similarText}
                   projectId={p.id} projectTitle={p.title} />
    </>
  );
}
