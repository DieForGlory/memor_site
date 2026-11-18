import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import type {
  CatalogData, HomeData, Lang, ProjectDetail, RealtyList, RealtyProject, ServiceCard, ServiceDetail, SiteInfo,
} from "./types";

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

async function get<T>(path: string, lang?: Lang): Promise<T> {
  const url = new URL(`/api/public${path}`, BACKEND);
  if (lang) url.searchParams.set("lang", lang);
  // Контент правится в админке — всегда берём свежие данные с бэкенда.
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`API ${url.pathname} ответил ${res.status}`);
  return res.json() as Promise<T>;
}

export const getSite = cache((lang: Lang) => get<SiteInfo>("/site", lang));
export const getHome = cache((lang: Lang) => get<HomeData>("/home", lang));
export const getCatalog = cache((lang: Lang) => get<CatalogData>("/projects", lang));
export const getProject = cache((lang: Lang, slug: string) =>
  get<ProjectDetail>(`/projects/${encodeURIComponent(slug)}`, lang),
);
export const getServices = cache((lang: Lang) => get<ServiceCard[]>("/services", lang));
export const getService = cache((lang: Lang, slug: string) =>
  get<ServiceDetail>(`/services/${encodeURIComponent(slug)}`, lang),
);
export const getSitemap = () =>
  get<{ projects: { slug: string; updated_at: string | null }[]; services: string[]; realty?: number[] }>("/sitemap");

// Квартиры из CRM: каталог одинаков на всех языках (названия комплексов ведёт отдел продаж)
export const getRealty = cache(() => get<RealtyList>("/realty"));
export const getRealtyProject = cache((id: number) => get<RealtyProject>(`/realty/${id}`));

export const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";
