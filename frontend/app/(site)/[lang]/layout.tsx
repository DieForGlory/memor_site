import "@fontsource-variable/manrope";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "../../globals.css";

import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";

import { Analytics } from "@/components/site/Analytics";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { MobileActions } from "@/components/site/MobileActions";
import { getSite, SITE_URL } from "@/lib/api";
import { getDict, href, isLang, LANGS } from "@/lib/i18n";

type Params = { params: Promise<{ lang: string }> };

export const viewport: Viewport = { themeColor: "#141414" };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const site = await getSite(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: site.seo_title || site.company_name, template: `%s — ${site.company_name}` },
    description: site.seo_description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}`])),
    },
    openGraph: { siteName: site.company_name, locale: lang, type: "website" },
  };
}

export default async function SiteLayout({ children, params }: Params & { children: React.ReactNode }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [site, t] = [await getSite(lang), getDict(lang)];
  // «Квартиры» — только когда в админке включён каталог CRM
  const keys: (keyof typeof t.nav)[] = ["projects", ...(site.realty_enabled ? ["realty" as const] : []), "services", "about", "contacts"];
  const nav = keys.map((key) => ({
    href: href(lang, `/${key}`),
    label: t.nav[key],
  }));

  return (
    <html lang={lang} data-scroll-behavior="smooth">
      <body>
        <Header lang={lang} nav={nav} ctaLabel={t.cta.request} phone={site.phones[0]} />
        <main>{children}</main>
        <Footer lang={lang} site={site} />
        <MobileActions phone={site.phones[0]} callLabel={t.cta.call} requestLabel={t.cta.request} />
        <Analytics metrikaId={site.analytics.yandex_metrika_id} gaId={site.analytics.google_analytics_id} />
      </body>
    </html>
  );
}
