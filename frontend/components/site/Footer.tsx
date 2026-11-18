import Link from "next/link";

import { Clock, Facebook, Instagram, Mail, Phone, Pin, Telegram, Youtube } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { getDict, href, telHref } from "@/lib/i18n";
import type { Lang, SiteInfo } from "@/lib/types";

// Ссылки соцсетей задаёт админ: в href пропускаем только http(s), не javascript: и прочие схемы.
const safeUrl = (url: string) => (/^https?:\/\/[^\s/]/i.test(url.trim()) ? url.trim() : "");

export function Footer({ lang, site }: { lang: Lang; site: SiteInfo }) {
  const t = getDict(lang);
  const socials = [
    { url: safeUrl(site.telegram_url), label: "Telegram", Icon: Telegram },
    { url: safeUrl(site.instagram_url), label: "Instagram", Icon: Instagram },
    { url: safeUrl(site.facebook_url), label: "Facebook", Icon: Facebook },
    { url: safeUrl(site.youtube_url), label: "YouTube", Icon: Youtube },
  ].filter((s) => s.url);

  return (
    <footer className="bg-ink-950 pb-20 text-white md:pb-0">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 sm:gap-12 lg:grid-cols-[1.4fr_1fr_1.2fr_1.4fr] lg:py-20">
        <div>
          <Logo />
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/60">{site.tagline}</p>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map(({ url, label, Icon }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}
                   className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-brand hover:text-brand">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/40">{t.footer.navigation}</h3>
          <ul className="mt-4 space-y-1 text-[15px]">
            {(["projects", ...(site.realty_enabled ? ["realty" as const] : []), "services", "about", "contacts"] as const).map((key) => (
              <li key={key}>
                <Link href={href(lang, `/${key}`)} className="inline-block py-1.5 text-white/80 transition-colors hover:text-brand">
                  {t.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/40">{t.footer.services}</h3>
          <ul className="mt-4 space-y-1 text-[15px]">
            {site.services.map((s) => (
              <li key={s.id}>
                <Link href={href(lang, `/services/${s.slug}`)} className="inline-block py-1.5 text-white/80 transition-colors hover:text-brand">
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/40">{t.footer.contacts}</h3>
          <ul className="mt-4 space-y-2 text-[15px] text-white/80">
            {site.phones.map((p) => (
              <li key={p}>
                <a href={telHref(p)} className="flex items-center gap-3 py-1.5 font-semibold text-white hover:text-brand">
                  <Phone size={18} className="shrink-0 text-brand" /> {p}
                </a>
              </li>
            ))}
            {site.email && (
              <li>
                <a href={`mailto:${site.email}`} className="flex items-center gap-3 py-1.5 hover:text-brand">
                  <Mail size={18} className="shrink-0 text-brand" /> {site.email}
                </a>
              </li>
            )}
            {site.address && (
              <li className="flex gap-3">
                <Pin size={18} className="mt-0.5 shrink-0 text-brand" /> {site.address}
              </li>
            )}
            {site.working_hours && (
              <li className="flex gap-3">
                <Clock size={18} className="mt-0.5 shrink-0 text-brand" /> {site.working_hours}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-sm text-white/40 sm:flex-row sm:justify-between">
          <span>
            © {new Date().getFullYear()} {site.legal_name}. {t.footer.rights}
          </span>
          {site.requisites && <span className="whitespace-pre-line">{site.requisites}</span>}
        </div>
      </div>
    </footer>
  );
}
