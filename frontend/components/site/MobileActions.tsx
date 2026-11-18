"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Phone } from "@/components/icons";
import { telHref } from "@/lib/i18n";

/** Нижняя панель на телефоне: позвонить и перейти к форме. Прячется, пока форма на экране. */
export function MobileActions({ phone, callLabel, requestLabel }: { phone?: string; callLabel: string; requestLabel: string }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [formInView, setFormInView] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const target = document.getElementById("lead");
    if (!target) return;
    const io = new IntersectionObserver(([entry]) => setFormInView(entry.isIntersecting), { threshold: 0.15 });
    io.observe(target);
    return () => io.disconnect();
  }, [pathname]);

  const shown = visible && !formInView;
  return (
    <div
      aria-hidden={!shown}
      className={`fixed inset-x-3 bottom-3 z-40 flex gap-2 rounded-full bg-ink-950/95 p-1.5 shadow-[0_10px_40px_rgb(0_0_0/0.35)] backdrop-blur transition-[transform,opacity] duration-300 ease-out-soft md:hidden ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[130%] opacity-0"
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {phone && (
        <a href={telHref(phone)} tabIndex={shown ? 0 : -1}
           className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white">
          <Phone size={18} className="text-brand" /> {callLabel}
        </a>
      )}
      <a href="#lead" tabIndex={shown ? 0 : -1}
         className="flex flex-[1.3] items-center justify-center rounded-full bg-brand py-3 text-sm font-semibold text-white">
        {requestLabel}
      </a>
    </div>
  );
}
