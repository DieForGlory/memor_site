"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowLeft, ArrowRight, Close } from "@/components/icons";
import type { Photo } from "@/lib/types";

interface Props {
  photos: Photo[];
  stages: { key: string; label: string }[];
  allLabel: string;
  closeLabel: string;
  title: string;
}

export function Gallery({ photos, stages, allLabel, closeLabel, title }: Props) {
  const [stage, setStage] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const visible = useMemo(() => (stage === "all" ? photos : photos.filter((p) => p.stage === stage)), [photos, stage]);
  const stageLabel = useMemo(() => Object.fromEntries(stages.map((s) => [s.key, s.label])), [stages]);

  return (
    <div>
      {stages.length > 1 && (
        <div className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:mb-8 sm:flex-wrap sm:px-0" role="tablist">
          {[{ key: "all", label: allLabel }, ...stages].map((s) => {
            const n = s.key === "all" ? photos.length : photos.filter((p) => p.stage === s.key).length;
            return (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={stage === s.key}
                onClick={() => setStage(s.key)}
                className={`chip shrink-0 whitespace-nowrap ${stage === s.key ? "border-ink bg-ink text-white" : "border-ink/15 text-ink-700 hover:border-ink/40"}`}
              >
                {s.label} <span className="ml-2 opacity-50">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="columns-2 gap-2.5 sm:gap-4 lg:columns-3 [&>*]:mb-2.5 sm:[&>*]:mb-4">
        {visible.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative block w-full overflow-hidden rounded-xl bg-sand-200 break-inside-avoid sm:rounded-2xl"
            style={{ aspectRatio: p.width && p.height ? `${p.width} / ${p.height}` : undefined }}
            aria-label={`${title} — ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.caption || title} loading="lazy" decoding="async"
                 className="h-full w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]" />
            {p.stage && stageLabel[p.stage] && (
              <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-medium text-white backdrop-blur sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-xs">
                {stageLabel[p.stage]}
              </span>
            )}
          </button>
        ))}
      </div>

      {open !== null && (
        <Lightbox photos={visible} index={open} onIndex={setOpen} onClose={() => setOpen(null)} closeLabel={closeLabel} title={title} />
      )}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  closeLabel,
  title,
}: {
  photos: Photo[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  closeLabel: string;
  title: string;
}) {
  const count = photos.length;
  const go = useCallback((delta: number) => onIndex((index + delta + count) % count), [index, count, onIndex]);
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);

  const photo = photos[index];
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center justify-between px-5 py-4 text-white">
        <span className="text-sm text-white/60">
          {index + 1} / {count}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={closeLabel}
                className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10">
          <Close />
        </button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4 pb-6 sm:px-20" onClick={onClose}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={photo.id} src={photo.image} alt={photo.caption || title}
             className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        {count > 1 && (
          <>
            <button type="button" aria-label="←" onClick={(e) => { e.stopPropagation(); go(-1); }}
                    className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid">
              <ArrowLeft />
            </button>
            <button type="button" aria-label="→" onClick={(e) => { e.stopPropagation(); go(1); }}
                    className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:grid">
              <ArrowRight />
            </button>
          </>
        )}
      </div>
      {photo.caption && <p className="px-5 pb-6 text-center text-sm text-white/70">{photo.caption}</p>}
    </div>
  );
}
