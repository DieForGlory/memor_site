import type { MetadataRoute } from "next";

import { getSitemap, SITE_URL } from "@/lib/api";
import { LANGS } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemap();
  const pages: { path: string; lastModified?: string; priority: number }[] = [
    { path: "", priority: 1 },
    { path: "/projects", priority: 0.9 },
    { path: "/services", priority: 0.8 },
    { path: "/about", priority: 0.6 },
    { path: "/contacts", priority: 0.6 },
    ...data.projects.map((p) => ({ path: `/projects/${p.slug}`, lastModified: p.updated_at ?? undefined, priority: 0.7 })),
    ...data.services.map((s) => ({ path: `/services/${s}`, priority: 0.6 })),
    // Квартиры из CRM — только когда раздел включён (бэкенд отдаёт список комплексов)
    ...(data.realty?.length
      ? [{ path: "/realty", priority: 0.9 }, ...data.realty.map((id) => ({ path: `/realty/${id}`, priority: 0.8 }))]
      : []),
  ];
  return pages.map((p) => ({
    url: `${SITE_URL}/ru${p.path}`,
    lastModified: p.lastModified,
    priority: p.priority,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `${SITE_URL}/${l}${p.path}`])) },
  }));
}
