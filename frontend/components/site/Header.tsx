"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Close, Menu, Phone } from "@/components/icons";
import { Logo } from "@/components/Logo";
import { LANG_LABELS, LANGS, telHref } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

interface Props {
  lang: Lang;
  nav: { href: string; label: string }[];
  ctaLabel: string;
  phone?: string;
}

export function Header({ lang, nav, ctaLabel, phone }: Props) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Шапка прозрачная только поверх первого экрана главной и страницы объекта.
  const overlay = pathname === `/${lang}` || /^\/[a-z]{2}\/projects\/[^/]+$/.test(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const solid = scrolled || !overlay || open;
  const switchTo = (target: Lang) => pathname.replace(/^\/[a-z]{2}(?=\/|$)/, `/${target}`);
  const rememberLang = (target: Lang) => {
    document.cookie = `lang=${target}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        open ? "bg-ink-950" : solid ? "bg-ink-950/92 shadow-[0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="container-x flex h-[76px] items-center justify-between gap-6">
        <Link href={`/${lang}`} aria-label="MEMOR GROUP" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
                  active ? "text-brand" : "text-white/80 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center rounded-full border border-white/15 p-1 sm:flex">
            {LANGS.map((l) => (
              <Link
                key={l}
                href={switchTo(l)}
                onClick={() => rememberLang(l)}
                hrefLang={l}
                aria-current={l === lang ? "true" : undefined}
                className={`rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-wider transition-colors ${
                  l === lang ? "bg-white text-ink" : "text-white/70 hover:text-white"
                }`}
              >
                {LANG_LABELS[l]}
              </Link>
            ))}
          </div>
          {phone && (
            <a href={telHref(phone)} className="hidden items-center gap-2 text-[15px] font-semibold text-white xl:flex">
              <Phone size={18} className="text-brand" />
              {phone}
            </a>
          )}
          <a href="#lead" className="btn-primary hidden !px-5 !py-2.5 text-sm md:inline-flex">
            {ctaLabel}
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-11 w-11 place-items-center rounded-full text-white lg:hidden"
            aria-expanded={open}
            aria-label="Menu"
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <div className="container-x h-[calc(100dvh-76px)] overflow-y-auto overscroll-contain pb-10 pt-4 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {nav.map((item) => (
              <Link key={item.href} href={item.href}
                    className="border-b border-white/10 py-5 text-2xl font-semibold text-white">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex gap-2">
            {LANGS.map((l) => (
              <Link key={l} href={switchTo(l)} onClick={() => rememberLang(l)}
                    className={`chip ${l === lang ? "border-white bg-white text-ink" : "border-white/20 text-white"}`}>
                {LANG_LABELS[l]}
              </Link>
            ))}
          </div>
          {phone && (
            <a href={telHref(phone)} className="mt-8 flex items-center gap-3 text-xl font-semibold text-white">
              <Phone className="text-brand" /> {phone}
            </a>
          )}
          <a href="#lead" onClick={() => setOpen(false)} className="btn-primary mt-8 w-full">
            {ctaLabel}
          </a>
        </div>
      )}
    </header>
  );
}
