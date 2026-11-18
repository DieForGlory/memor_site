"use client";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

const TASHKENT: [number, number] = [41.3111, 69.2797];

/** Клик по карте ставит точку, метку можно перетаскивать. */
export function MapPicker({ lat, lng, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const placeRef = useRef<((lat: number, lng: number) => void) | null>(null);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      const m = L.map(ref.current, { scrollWheelZoom: true });
      map.current = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(m);
      const icon = L.divIcon({ className: "", html: '<div class="memor-pin"></div>', iconSize: [18, 18], iconAnchor: [9, 9] });
      const place = (la: number, ln: number) => {
        if (marker.current) marker.current.setLatLng([la, ln]);
        else {
          marker.current = L.marker([la, ln], { icon, draggable: true }).addTo(m);
          marker.current.on("dragend", () => {
            const p = marker.current!.getLatLng();
            onChangeRef.current(+p.lat.toFixed(6), +p.lng.toFixed(6));
          });
        }
      };
      if (lat != null && lng != null) {
        place(lat, lng);
        m.setView([lat, lng], 14);
      } else {
        m.setView(TASHKENT, 11);
      }
      m.on("click", (e) => {
        place(e.latlng.lat, e.latlng.lng);
        onChangeRef.current(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6));
      });
      placeRef.current = place;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
      placeRef.current = null;
    };
    // Карта создаётся один раз; дальше точку двигает пользователь.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Если координаты ввели руками — переносим метку.
  useEffect(() => {
    if (!placeRef.current || lat == null || lng == null) return;
    const cur = marker.current?.getLatLng();
    if (!cur || Math.abs(cur.lat - lat) > 1e-6 || Math.abs(cur.lng - lng) > 1e-6) {
      placeRef.current(lat, lng);
      map.current?.panTo([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={ref} className="map-muted h-[320px] w-full overflow-hidden rounded-xl border border-ink/10" />;
}
