"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import { ArrowUpRight, Close, Menu } from "@/components/icons";
import { LogoMark } from "@/components/Logo";
import { api } from "@/lib/admin-api";

import { Loading } from "./ui";

type Me = { id: number; email: string; name: string };
const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx);

const NAV = [
  {
    title: "Обзор",
    items: [
      { href: "/admin", label: "Дашборд" },
      { href: "/admin/leads", label: "Заявки", badge: "leads" },
    ],
  },
  {
    title: "Контент",
    items: [
      { href: "/admin/projects", label: "Объекты" },
      { href: "/admin/services", label: "Услуги" },
      { href: "/admin/equipment", label: "Спецтехника" },
      { href: "/admin/hero", label: "Слайды главной" },
      { href: "/admin/advantages", label: "Преимущества" },
      { href: "/admin/documents", label: "Документы" },
      { href: "/admin/taxonomies", label: "Справочники" },
    ],
  },
  {
    title: "Настройки",
    items: [
      { href: "/admin/settings", label: "Сайт и контакты" },
      { href: "/admin/integrations", label: "Интеграции" },
      { href: "/admin/users", label: "Пользователи" },
    ],
  },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [newLeads, setNewLeads] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api<Me>("/api/auth/me").then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    setOpen(false);
    if (!me) return;
    api<{ status_counts: Record<string, number> }>("/api/admin/leads?per_page=1")
      .then((r) => setNewLeads(r.status_counts.new ?? 0))
      .catch(() => {});
  }, [pathname, me]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  }

  if (!me) {
    return <div className="grid min-h-screen place-items-center"><Loading /></div>;
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-3 px-6 py-6">
        <LogoMark className="h-8 w-8 text-brand" />
        <span className="leading-none text-white">
          <span className="block text-[15px] font-extrabold tracking-[0.06em]">MEMOR</span>
          <span className="mt-1 block text-[10px] font-semibold tracking-[0.3em] text-white/50">ADMIN</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">{group.title}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
                          isActive(item.href) ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                        }`}>
                    {item.label}
                    {item.badge === "leads" && newLeads > 0 && (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{newLeads}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4 text-sm">
        <a href="/ru" target="_blank" rel="noopener" className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 font-medium text-white/80 hover:text-white">
          Открыть сайт <ArrowUpRight size={16} />
        </a>
        <p className="truncate px-2 text-white/50" title={me.email}>{me.email}</p>
        <div className="mt-2 flex gap-1">
          <Link href="/admin/account" className="rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/5 hover:text-white">Пароль</Link>
          <button type="button" onClick={logout} className="rounded-lg px-2 py-1.5 text-white/70 hover:bg-white/5 hover:text-white">Выйти</button>
        </div>
      </div>
    </div>
  );

  return (
    <MeCtx.Provider value={me}>
      <div className="min-h-screen lg:pl-[248px]">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] bg-ink-950 lg:block">{sidebar}</aside>
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink-950 px-4 lg:hidden">
          <Link href="/admin" className="flex items-center gap-2 text-white">
            <LogoMark className="h-7 w-7 text-brand" /> <span className="font-bold">MEMOR</span>
          </Link>
          <button type="button" onClick={() => setOpen(true)} className="-mr-2 grid h-11 w-11 place-items-center text-white" aria-label="Меню"><Menu /></button>
        </header>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-[280px] bg-ink-950">
              <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-4 grid h-11 w-11 place-items-center text-white" aria-label="Закрыть"><Close /></button>
              {sidebar}
            </aside>
          </div>
        )}
        <main className="mx-auto max-w-[1280px] px-3 py-6 sm:px-8 sm:py-8 lg:py-10">{children}</main>
      </div>
    </MeCtx.Provider>
  );
}
