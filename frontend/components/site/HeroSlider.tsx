"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ArrowRight, ArrowUpRight } from "@/components/icons";
import { Accent, StatValue } from "@/lib/typography";
import type { HeroSlide, Lang } from "@/lib/types";

const INTERVAL = 6500;

interface Props {
  lang: Lang;
  slides: HeroSlide[];
  eyebrow: string;
  title: string;
  text: string;
  primary: string;
  secondary: string;
  stats: { value: string; label: string }[];
}

export function HeroSlider({ lang, slides, eyebrow, title, text, primary, secondary, stats }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setTimeout(() => go(index + 1), INTERVAL);
    return () => window.clearTimeout(id);
  }, [index, count, paused, go]);

  const current = slides[index];

  return (
    <section
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink-950 text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out-soft ${i === index ? "opacity-100" : "opacity-0"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image}
            alt=""
            fetchPriority={i === 0 ? "high" : "auto"}
            loading={i === 0 ? "eager" : "lazy"}
            className={`h-full w-full object-cover ${i === index ? "animate-hero-zoom" : ""}`}
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" />

      <div className="container-x relative flex flex-1 flex-col justify-center pb-8 pt-28 sm:pb-10 sm:pt-32">
        <p className="eyebrow !text-brand">{eyebrow}</p>
        <h1 className="display-title mt-5 max-w-[1060px]"><Accent text={title} tone="dark" /></h1>
        <p className="mt-5 max-w-[560px] text-base leading-relaxed text-white/75 sm:mt-7 sm:text-xl">{text}</p>
        <div className="mt-8 flex flex-wrap gap-3 sm:mt-10">
          <a href="#lead" className="btn-primary">
            {primary} <ArrowRight size={18} />
          </a>
          <Link href={`/${lang}/projects`} className="btn-ghost-light">
            {secondary}
          </Link>
        </div>
      </div>

      <div className="container-x relative pb-8">
        <div className="flex flex-col gap-6 border-t border-white/15 pt-6 sm:gap-8 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
          <dl className="grid grid-cols-2 gap-x-10 gap-y-6 sm:flex sm:gap-x-12">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col-reverse">
                <dt className="mt-2 whitespace-nowrap text-[13px] text-white/60">{s.label}</dt>
                <dd className="stat-num text-[34px] sm:text-[46px]"><StatValue value={s.value} /></dd>
              </div>
            ))}
          </dl>

          {count > 0 && current && (
            <div className="flex items-center gap-5">
              {current.project_slug ? (
                <Link href={`/${lang}/projects/${current.project_slug}`}
                      className="group hidden max-w-[280px] items-center gap-3 text-sm font-medium text-white/85 hover:text-white sm:flex">
                  <span className="line-clamp-2">{current.caption}</span>
                  <ArrowUpRight size={18} className="shrink-0 text-brand transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <span className="hidden max-w-[280px] text-sm text-white/85 sm:inline">{current.caption}</span>
              )}
              {count > 1 && (
                <div className="flex gap-1" role="tablist" aria-label="Slides">
                  {slides.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      role="tab"
                      aria-selected={i === index}
                      aria-label={`${i + 1} / ${count}`}
                      onClick={() => go(i)}
                      className="flex h-8 w-11 items-center"
                    >
                      <span className="relative block h-1 w-full overflow-hidden rounded-full bg-white/25">
                      {i === index && (
                        <span
                          key={`${index}-${paused}`}
                          className={`absolute inset-0 rounded-full bg-brand ${paused ? "" : "animate-progress"}`}
                          style={{ animationDuration: `${INTERVAL}ms` }}
                        />
                      )}
                      {i < index && <span className="absolute inset-0 rounded-full bg-white/70" />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
