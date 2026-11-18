"use client";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef, useState } from "react";

import type { Lang, ProjectCard } from "@/lib/types";

interface Props {
  lang: Lang;
  projects: ProjectCard[];
  tone?: "dark" | "muted";
  className?: string;
  /** Показать один объект крупно (страница объекта). */
  single?: boolean;
  labels?: { city: string; country: string; more: string };
}

// Ташкент и область — основная масса объектов; остальные города видны при отдалении.
const TASHKENT_BOUNDS: [[number, number], [number, number]] = [
  [41.18, 69.15],
  [41.42, 69.45],
];

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function popupHtml(p: ProjectCard, lang: Lang, more: string) {
  const img = p.cover_thumb
    ? `<img src="${escapeHtml(p.cover_thumb)}" alt="" style="display:block;width:100%;height:140px;object-fit:cover">`
    : "";
  return `${img}<div style="padding:14px 16px 16px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e0672a">${escapeHtml(p.kicker)}</div>
    <div style="margin-top:6px;font-size:16px;font-weight:700;line-height:1.25;color:#242424">${escapeHtml(p.title)}</div>
    <div style="margin-top:6px;font-size:12px;color:#6b6b6b">${escapeHtml(p.address)}</div>
    <a href="/${lang}/projects/${encodeURIComponent(p.slug)}" style="display:inline-block;margin-top:12px;font-size:13px;font-weight:700;color:#e0672a">${escapeHtml(more)} →</a>
  </div>`;
}

export function ProjectsMap({ lang, projects, tone = "dark", className = "", single = false, labels }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const boundsRef = useRef<{ all?: [[number, number], [number, number]] }>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      // На телефоне карта не должна перехватывать прокрутку страницы: перетаскивание
      // включается после первого касания карты, масштаб — щипком или кнопками.
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const map = L.map(ref.current, {
        scrollWheelZoom: false,
        dragging: !coarse,
        zoomControl: !single,
        attributionControl: true,
      });
      if (coarse) map.once("click", () => map.dragging.enable());
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const icon = L.divIcon({ className: "", html: '<div class="memor-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      const points = projects.filter((p) => p.lat != null && p.lng != null);
      const markers: Marker[] = points.map((p) => {
        const m = L.marker([p.lat!, p.lng!], { icon, title: p.title, keyboard: true }).addTo(map);
        if (!single) m.bindPopup(popupHtml(p, lang, labels?.more ?? "→"), { closeButton: false, maxWidth: 260 });
        return m;
      });

      if (single && points[0]) {
        map.setView([points[0].lat!, points[0].lng!], 14);
      } else if (markers.length) {
        const all = L.featureGroup(markers).getBounds();
        boundsRef.current.all = [
          [all.getSouth(), all.getWest()],
          [all.getNorth(), all.getEast()],
        ];
        const inTashkent = points.filter(
          (p) => p.lat! > TASHKENT_BOUNDS[0][0] && p.lat! < TASHKENT_BOUNDS[1][0] && p.lng! > TASHKENT_BOUNDS[0][1] && p.lng! < TASHKENT_BOUNDS[1][1],
        );
        map.fitBounds(inTashkent.length >= points.length / 2 ? TASHKENT_BOUNDS : all, { padding: [30, 30] });
      } else {
        map.fitBounds(TASHKENT_BOUNDS);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [projects, lang, single, labels?.more]);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <div ref={ref} className={`h-full w-full ${tone === "dark" ? "map-dark" : "map-muted"}`} />
      {ready && labels && !single && (
        <div className="absolute right-3 top-3 z-[500] flex gap-1 rounded-full bg-white p-1 shadow-lg sm:right-4 sm:top-4">
          <button type="button" className="rounded-full px-4 py-2 text-xs font-semibold text-ink hover:bg-sand"
                  onClick={() => mapRef.current?.flyToBounds(TASHKENT_BOUNDS, { padding: [30, 30], duration: 0.8 })}>
            {labels.city}
          </button>
          <button type="button" className="rounded-full px-4 py-2 text-xs font-semibold text-ink hover:bg-sand"
                  onClick={() => boundsRef.current.all && mapRef.current?.flyToBounds(boundsRef.current.all, { padding: [40, 40], duration: 0.8 })}>
            {labels.country}
          </button>
        </div>
      )}
    </div>
  );
}
