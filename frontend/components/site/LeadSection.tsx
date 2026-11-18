import { Mail, Phone } from "@/components/icons";
import { getDict, telHref } from "@/lib/i18n";
import { Accent } from "@/lib/typography";
import type { Lang, SiteInfo } from "@/lib/types";

import { LeadForm } from "./LeadForm";

interface Props {
  lang: Lang;
  site: SiteInfo;
  title?: string;
  text?: string;
  projectId?: number;
  projectTitle?: string;
  serviceId?: number;
  variant?: "default" | "apartment";
  crmProjectId?: number;
  regardingLabel?: string;
}

export function LeadSection({
  lang, site, title, text, projectId, projectTitle, serviceId, variant, crmProjectId, regardingLabel,
}: Props) {
  const t = getDict(lang);
  return (
    <section id="lead" className="relative scroll-mt-20 overflow-hidden bg-ink py-16 text-white sm:py-20 lg:py-28">
      <div aria-hidden="true"
           className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand/20 blur-[120px]" />
      <div className="container-x relative grid gap-10 xl:grid-cols-[1fr_1.25fr] xl:gap-20">
        <div>
          <p className="eyebrow !text-brand">{t.lead.eyebrow}</p>
          <h2 className="section-title mt-5"><Accent text={title ?? t.lead.title} tone="dark" /></h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/65">{text ?? t.lead.text}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:mt-10 xl:grid-cols-1">
            {site.phones.map((p) => (
              <a key={p} href={telHref(p)} className="flex items-center gap-4 text-xl font-bold hover:text-brand sm:text-2xl">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-brand">
                  <Phone size={20} />
                </span>
                {p}
              </a>
            ))}
            {site.email && (
              <a href={`mailto:${site.email}`} className="flex items-center gap-4 text-lg text-white/80 hover:text-brand">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-brand">
                  <Mail size={20} />
                </span>
                {site.email}
              </a>
            )}
          </div>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-ink-900/60 p-5 sm:rounded-[28px] sm:p-10">
          <LeadForm lang={lang} t={t.lead} projectId={projectId} projectTitle={projectTitle} serviceId={serviceId}
                    variant={variant} crmProjectId={crmProjectId} regardingLabel={regardingLabel} />
        </div>
      </div>
    </section>
  );
}
