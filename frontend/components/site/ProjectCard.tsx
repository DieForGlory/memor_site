import Link from "next/link";

import { ArrowUpRight, Camera, Pin } from "@/components/icons";
import type { Lang, ProjectCard as Card } from "@/lib/types";

interface Props {
  lang: Lang;
  project: Card;
  size?: "md" | "lg";
  photosLabel?: string;
}

export function StatusBadge({ status, label }: { status: Card["status"]; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
        status === "completed" ? "bg-white/90 text-ink" : "bg-brand text-white"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status === "completed" ? "bg-emerald-500" : "bg-white"}`} />
      {label}
    </span>
  );
}

export function ProjectCard({ lang, project: p, size = "md", photosLabel }: Props) {
  return (
    <Link
      href={`/${lang}/projects/${p.slug}`}
      className={`group relative block overflow-hidden rounded-[22px] bg-ink-800 ${
        size === "lg" ? "aspect-[4/5] sm:aspect-[16/11]" : "aspect-[4/3] sm:aspect-[4/5]"
      }`}
    >
      {p.cover_thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={size === "lg" ? p.cover : p.cover_thumb}
          alt={p.title}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.05]"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/0" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 sm:p-5">
        <StatusBadge status={p.status} label={p.status_label} />
        {photosLabel && p.photos_count > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <Camera size={14} /> {p.photos_count} {photosLabel}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-400">{p.kicker}</p>
        <h3 className={`card-title mt-2 text-white ${size === "lg" ? "text-[28px] sm:text-[38px]" : "text-[23px]"}`}>
          {p.title}
        </h3>
        <div className="mt-4 flex items-end justify-between gap-4">
          <p className="flex items-start gap-1.5 text-sm text-white/70">
            <Pin size={16} className="mt-0.5 shrink-0" />
            <span className="line-clamp-1">{p.city?.title ?? p.address}</span>
          </p>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-ink transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
            <ArrowUpRight size={20} />
          </span>
        </div>
      </div>
    </Link>
  );
}
