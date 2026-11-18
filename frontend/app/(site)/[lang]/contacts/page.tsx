import type { Metadata } from "next";

import { Clock, Mail, Phone, Pin } from "@/components/icons";
import { LeadForm } from "@/components/site/LeadForm";
import { PageHeader } from "@/components/site/PageHeader";
import { ProjectsMap } from "@/components/site/ProjectsMap";
import { getSite } from "@/lib/api";
import { getDict, href, LANGS, telHref } from "@/lib/i18n";
import type { Lang, ProjectCard } from "@/lib/types";

type Props = { params: Promise<{ lang: Lang }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const [site, t] = [await getSite(lang), getDict(lang)];
  return {
    title: t.contacts.title,
    description: `${site.phones.join(", ")} · ${site.address}`,
    alternates: { canonical: `/${lang}/contacts`, languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}/contacts`])) },
  };
}

export default async function ContactsPage({ params }: Props) {
  const { lang } = await params;
  const site = await getSite(lang);
  const t = getDict(lang);

  // Офис на карте показываем тем же компонентом, что и объекты.
  const office: ProjectCard | null =
    site.lat != null && site.lng != null
      ? {
          id: 0, slug: "", title: site.company_name, kicker: "", sector: "commercial", role: "", role_label: "",
          status: "completed", status_label: "", type: null, city: null, address: site.address, lat: site.lat,
          lng: site.lng, year: null, cover: "", cover_thumb: "", service_ids: [], photos_count: 0,
        }
      : null;
  const route = site.lat != null && site.lng != null
    ? `https://yandex.uz/maps/?rtext=~${site.lat},${site.lng}&rtt=auto`
    : "";

  const cards = [
    { icon: Phone, label: t.contacts.phone, body: site.phones.map((p) => (
        <a key={p} href={telHref(p)} className="block text-xl font-bold hover:text-brand-700">{p}</a>
      )) },
    { icon: Mail, label: t.contacts.email, body: site.email && (
        <a href={`mailto:${site.email}`} className="text-base font-semibold [overflow-wrap:anywhere] hover:text-brand-700">{site.email}</a>
      ) },
    { icon: Pin, label: t.contacts.address, body: <p className="text-lg font-semibold leading-snug">{site.address}</p> },
    { icon: Clock, label: t.contacts.hours, body: site.working_hours && <p className="text-lg font-semibold">{site.working_hours}</p> },
  ];

  return (
    <>
      <PageHeader title={t.contacts.title} crumbs={[{ href: href(lang), label: "MEMOR GROUP" }, { label: t.contacts.title }]} />

      <section className="py-12 sm:py-16 lg:py-24">
        <div className="container-x">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, label, body }) => (
              <div key={label} className="rounded-[24px] bg-sand p-6 sm:p-7">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-brand">
                  <Icon size={22} />
                </span>
                <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</h2>
                <div className="mt-2 space-y-1">{body}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-[360px] overflow-hidden rounded-[24px] bg-sand sm:min-h-[420px] sm:rounded-[28px]">
              {office && (
                <div className="absolute inset-0">
                  <ProjectsMap lang={lang} projects={[office]} single tone="muted" className="h-full w-full" />
                </div>
              )}
              {route && (
                <a href={route} target="_blank" rel="noopener noreferrer"
                   className="btn-primary absolute bottom-5 left-5 z-[500] !py-3 text-sm shadow-lg">
                  <Pin size={18} /> {t.contacts.route}
                </a>
              )}
            </div>
            <div id="lead" className="scroll-mt-24 rounded-[24px] border border-ink/10 p-5 sm:rounded-[28px] sm:p-10">
              <h2 className="font-display text-[30px] font-medium sm:text-[38px]">{t.contacts.write}</h2>
              <p className="mb-8 mt-3 text-ink-500">{t.lead.text}</p>
              <LeadForm lang={lang} t={t.lead} tone="light" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
