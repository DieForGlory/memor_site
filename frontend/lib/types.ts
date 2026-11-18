export type Lang = "ru" | "uz" | "en";

export interface Taxonomy {
  id: number;
  slug: string;
  title: string;
}

export interface ServiceCard {
  id: number;
  slug: string;
  title: string;
  short: string;
  icon: string;
  image: string;
  projects_count?: number;
}

export interface ServiceDetail extends ServiceCard {
  description: string;
  projects: ProjectCard[];
}

export interface ProjectCard {
  id: number;
  slug: string;
  title: string;
  kicker: string;
  sector: "state" | "commercial";
  role: string;
  role_label: string;
  status: "completed" | "in_progress";
  status_label: string;
  type: Taxonomy | null;
  city: Taxonomy | null;
  address: string;
  lat: number | null;
  lng: number | null;
  year: number | null;
  cover: string;
  cover_thumb: string;
  service_ids: number[];
  photos_count: number;
}

export interface Photo {
  id: number;
  image: string;
  thumb: string;
  width: number;
  height: number;
  stage: string;
  caption: string;
}

export interface ProjectDetail extends ProjectCard {
  client: string;
  area_m2: number | null;
  description: string;
  sector_label: string;
  photos: Photo[];
  services: ServiceCard[];
  stages: { key: string; label: string }[];
  related: ProjectCard[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export interface Equipment {
  id: number;
  title: string;
  description: string;
  image: string;
  thumb: string;
}

export interface Advantage {
  id: number;
  title: string;
  text: string;
}

export interface DocumentItem {
  id: number;
  kind: "certificate" | "license";
  title: string;
  image: string;
  thumb: string;
  valid_until: string | null;
}

export interface HeroSlide {
  id: number;
  image: string;
  caption: string;
  project_slug: string | null;
}

export interface SiteInfo {
  company_name: string;
  legal_name: string;
  tagline: string;
  hero_title: string;
  hero_text: string;
  founded_year: number;
  companies_count: number;
  employees_count: number;
  about_short: string;
  about_text: string;
  letter_title: string;
  letter_text: string;
  clients: string;
  phones: string[];
  email: string;
  address: string;
  working_hours: string;
  lat: number | null;
  lng: number | null;
  requisites: string;
  telegram_url: string;
  instagram_url: string;
  facebook_url: string;
  youtube_url: string;
  presentation_url: string;
  seo_title: string;
  seo_description: string;
  analytics: { yandex_metrika_id: string; google_analytics_id: string };
  services: ServiceCard[];
  projects_count: number;
  /** Раздел «Квартиры» (каталог CRM) включён и настроен */
  realty_enabled: boolean;
}

export interface HomeData {
  hero: HeroSlide[];
  featured: ProjectCard[];
  map: ProjectCard[];
  stats: { projects: number; state: number; commercial: number };
  equipment: Equipment[];
  advantages: Advantage[];
  documents: DocumentItem[];
}

export interface FilterOption {
  key: string;
  label: string;
}

export interface CatalogData {
  items: ProjectCard[];
  filters: {
    sectors: FilterOption[];
    statuses: FilterOption[];
    roles: FilterOption[];
    types: Taxonomy[];
    cities: Taxonomy[];
  };
}

// ---------------------------------------------------------------- квартиры из CRM

export type RealtyType = "APARTMENT" | "COMMERCIAL" | "PARKING" | "STORAGE" | "COTTAGE";

export interface RealtyStats {
  free: number;
  booked: number;
  sold: number;
  total: number;
  price_from: number | null;
  area_min: number | null;
  area_max: number | null;
  floors_max: number | null;
  rooms: number[];
}

export interface RealtySummary {
  id: number;
  name: string;
  address: string;
  logo: string | null;
  cover: string | null;
  usp: string[];
  buildings: { id: number; name: string; floors: number | null }[];
  currency: string;
  stats: RealtyStats;
  layouts_count: number;
}

export interface RealtyLayout {
  type: RealtyType;
  rooms: number | null;
  image: string | null;
  count: number;
  area_min: number | null;
  area_max: number | null;
  price_from: number | null;
}

export interface RealtyUnit {
  id: number;
  building: string;
  number: string;
  type: RealtyType;
  rooms: number | null;
  area: number | null;
  floor: number | null;
  floors_total: number | null;
  finishing: string;
  price: number | null;
  price_per_sqm: number | null;
  layout_name: string;
  layout_image: string | null;
}

export interface RealtyProject extends Omit<RealtySummary, "layouts_count"> {
  description: string;
  images: string[];
  layouts: RealtyLayout[];
  units: RealtyUnit[];
}

export interface RealtyList {
  enabled: boolean;
  available: boolean;
  projects: RealtySummary[];
}
