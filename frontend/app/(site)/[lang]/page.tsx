import Link from "next/link";

import { ArrowRight, ArrowUpRight, ServiceIcon } from "@/components/icons";
import { HeroSlider } from "@/components/site/HeroSlider";
import { LeadSection } from "@/components/site/LeadSection";
import { Eyebrow, SectionHeading } from "@/components/site/PageHeader";
import { ProjectCard } from "@/components/site/ProjectCard";
import { ProjectsMap } from "@/components/site/ProjectsMap";
import { getHome, getSite } from "@/lib/api";
import { getDict, href } from "@/lib/i18n";
import { Accent } from "@/lib/typography";
import type { Lang } from "@/lib/types";

type Params = { params: Promise<{ lang: Lang }> };

export default async function HomePage({ params }: Params) {
  const { lang } = await params;
  const [site, home] = await Promise.all([getSite(lang), getHome(lang)]);
  const t = getDict(lang);

  const stats = [
    { value: String(site.founded_year), label: t.stats.founded },
    { value: `${site.companies_count}+`, label: t.stats.companies },
    { value: `${site.employees_count}+`, label: t.stats.specialists },
    { value: String(home.stats.projects), label: t.stats.projects },
  ];
  const [lead, ...rest] = home.featured;
  const mapLabels = { city: t.home.mapCity, country: t.home.mapAll, more: t.cta.more };

  return (
    <>
      <HeroSlider
        lang={lang}
        slides={home.hero}
        eyebrow={t.home.heroEyebrow}
        title={site.hero_title}
        text={site.hero_text}
        primary={t.cta.discuss}
        secondary={t.cta.viewProjects}
        stats={stats}
      />

      {/* Кто мы */}
      <section className="bg-ink py-16 text-white sm:py-20 lg:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <Eyebrow index="01" text={t.home.aboutEyebrow} />
            <h2 className="section-title mt-5"><Accent text={t.home.aboutTitle} tone="dark" /></h2>
          </div>
          <div>
            <p className="lead-text text-white/75">{site.about_short}</p>
            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 p-6">
                <p className="stat-num text-[64px] text-brand">{home.stats.state}</p>
                <p className="mt-2 text-sm text-white/60">{t.stats.state}</p>
              </div>
              <div className="rounded-3xl border border-white/10 p-6">
                <p className="stat-num text-[64px] text-brand">{home.stats.commercial}</p>
                <p className="mt-2 text-sm text-white/60">{t.stats.commercial}</p>
              </div>
            </div>
            <Link href={href(lang, "/about")} className="btn-ghost-light mt-10">
              {t.cta.more} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Услуги */}
      <section className="py-16 sm:py-20 lg:py-28">
        <div className="container-x">
          <SectionHeading
            index="02"
            eyebrow={t.home.servicesEyebrow}
            title={t.home.servicesTitle}
            action={
              <Link href={href(lang, "/services")} className="btn-ghost-dark shrink-0">
                {t.cta.allServices} <ArrowRight size={18} />
              </Link>
            }
          />
          <div className="grid gap-px overflow-hidden rounded-[28px] border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-4">
            {site.services.map((s, i) => (
              <Link key={s.id} href={href(lang, `/services/${s.slug}`)}
                    className="group flex gap-4 bg-white p-5 transition-colors duration-300 hover:bg-ink sm:min-h-[260px] sm:flex-col sm:gap-0 sm:p-7">
                <div className="flex shrink-0 items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white sm:h-14 sm:w-14">
                    <ServiceIcon name={s.icon} size={26} />
                  </span>
                  <span className="hidden text-sm font-semibold text-ink-300 group-hover:text-white/40 sm:inline">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="sm:mt-auto sm:pt-8">
                  <h3 className="card-title text-[20px] group-hover:text-white sm:text-[23px]">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500 group-hover:text-white/60 sm:mt-3">{s.short}</p>
                </div>
              </Link>
            ))}
            <a href="#lead" className="group flex flex-col justify-between gap-6 bg-brand p-5 text-white transition-colors hover:bg-brand-600 sm:min-h-[260px] sm:p-7">
              <ArrowUpRight size={32} className="hidden sm:block" />
              <div>
                <h3 className="card-title text-[23px]">{t.cta.discuss}</h3>
                <p className="mt-3 text-sm text-white/80">{t.lead.text}</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Объекты */}
      <section className="bg-sand py-16 sm:py-20 lg:py-28">
        <div className="container-x">
          <SectionHeading
            index="03"
            eyebrow={t.home.projectsEyebrow}
            title={t.home.projectsTitle}
            action={
              <Link href={href(lang, "/projects")} className="btn-ghost-dark shrink-0">
                {t.cta.allProjects} ({home.stats.projects}) <ArrowRight size={18} />
              </Link>
            }
          />
          {lead && (
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:row-span-2">
                <div className="h-full [&>a]:h-full [&>a]:!aspect-auto [&>a]:min-h-[360px] sm:[&>a]:min-h-[480px]">
                  <ProjectCard lang={lang} project={lead} size="lg" photosLabel={t.catalog.photos} />
                </div>
              </div>
              {rest.slice(0, 8).map((p, i) => (
                <div key={p.id} className={i >= 5 ? "hidden sm:block" : undefined}>
                  <ProjectCard lang={lang} project={p} photosLabel={t.catalog.photos} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Карта */}
      {home.map.length > 0 && (
        <section className="bg-ink-950 py-16 text-white sm:py-20 lg:py-28">
          <div className="container-x">
            <div className="grid gap-10 lg:grid-cols-[360px_1fr] lg:gap-14">
              <div>
                <Eyebrow index="04" text={t.home.mapEyebrow} />
                <h2 className="section-title mt-5"><Accent text={t.home.mapTitle} tone="dark" /></h2>
                <p className="mt-6 leading-relaxed text-white/60">{t.home.mapText}</p>
                <ul className="mt-8 hidden space-y-1 lg:block">
                  {home.map.slice(0, 7).map((p) => (
                    <li key={p.id}>
                      <Link href={href(lang, `/projects/${p.slug}`)}
                            className="flex items-center justify-between gap-4 border-b border-white/10 py-3 text-[15px] text-white/80 hover:text-brand">
                        <span className="line-clamp-1">{p.title}</span>
                        <span className="shrink-0 text-xs text-white/40">{p.city?.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <ProjectsMap lang={lang} projects={home.map} tone="dark" labels={mapLabels}
                           className="h-[420px] rounded-[24px] border border-white/10 sm:h-[520px] lg:h-[640px] lg:rounded-[28px]" />
            </div>
          </div>
        </section>
      )}

      {/* Спецтехника */}
      {home.equipment.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-28">
          <div className="container-x">
            <SectionHeading index="05" eyebrow={t.home.equipmentEyebrow} title={t.home.equipmentTitle} />
          </div>
          <div className="container-x">
            <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 [scrollbar-width:thin]">
              {home.equipment.map((e) => (
                <figure key={e.id} className="w-[280px] shrink-0 snap-start sm:w-[320px]">
                  <div className="aspect-[4/3] overflow-hidden rounded-[22px] bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {e.thumb && <img src={e.thumb} alt={e.title} loading="lazy" className="h-full w-full object-cover" />}
                  </div>
                  <figcaption className="card-title mt-4 text-[21px]">{e.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Почему нам доверяют */}
      {home.advantages.length > 0 && (
        <section className="relative overflow-hidden bg-ink py-16 text-white sm:py-20 lg:py-28">
          {home.hero[1] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={home.hero[1].image} alt="" aria-hidden="true" loading="lazy"
                 className="absolute inset-0 h-full w-full object-cover opacity-15" />
          )}
          <div className="container-x relative">
            <SectionHeading index="06" eyebrow={t.home.advantagesEyebrow} title={t.home.advantagesTitle} tone="dark" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {home.advantages.map((a, i) => (
                <div key={a.id} className="rounded-[24px] border border-white/10 bg-ink-950/50 p-6 backdrop-blur sm:p-8">
                  <span className="font-display text-[22px] font-medium italic text-brand">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="card-title mt-4 text-[22px] sm:mt-6 sm:text-[25px]">{a.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/60">{a.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Сертификаты — показываются, только когда в админке опубликованы актуальные документы */}
      {home.documents.length > 0 && (
        <section className="py-16 sm:py-20 lg:py-28">
          <div className="container-x">
            <SectionHeading title={t.home.documentsTitle} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {home.documents.map((d) => (
                <a key={d.id} href={d.image} target="_blank" rel="noopener noreferrer"
                   className="group block overflow-hidden rounded-[22px] border border-ink/10 bg-sand p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.thumb} alt={d.title} loading="lazy" className="aspect-[3/4] w-full rounded-xl object-contain" />
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
