"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { type Lead, LEAD_KINDS, statusMeta } from "@/components/admin/leads";
import { Badge, Card, EmptyState, Loading, PageTitle } from "@/components/admin/ui";
import { ArrowRight } from "@/components/icons";
import { api, formatDate } from "@/lib/admin-api";

interface Dashboard {
  counts: Record<string, number>;
  recent_leads: Lead[];
  warnings: { level: "error" | "warning" | "info"; text: string; link: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    api<Dashboard>("/api/admin/dashboard").then(setData).catch(() => {});
  }, []);

  if (!data) return <Loading />;
  const c = data.counts;
  const tiles = [
    { label: "Новых заявок", value: c.leads_new, href: "/admin/leads?status=new", accent: true },
    { label: "Заявок за 7 дней", value: c.leads_week, href: "/admin/leads" },
    { label: "Объектов на сайте", value: `${c.projects} / ${c.projects_total}`, href: "/admin/projects" },
    { label: "Фотографий", value: c.photos, href: "/admin/projects" },
  ];
  const warnTone = { error: "border-red-200 bg-red-50 text-red-800", warning: "border-amber-200 bg-amber-50 text-amber-900", info: "border-sky-200 bg-sky-50 text-sky-900" };

  return (
    <div>
      <PageTitle title="Дашборд" subtitle="Что происходит на сайте" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}
                className={`rounded-2xl p-6 transition-shadow hover:shadow-md ${t.accent ? "bg-brand text-white" : "border border-ink/8 bg-white"}`}>
            <p className="text-4xl font-extrabold tracking-tight">{t.value}</p>
            <p className={`mt-2 text-sm ${t.accent ? "text-white/85" : "text-ink-500"}`}>{t.label}</p>
          </Link>
        ))}
      </div>

      {data.warnings.length > 0 && (
        <div className="mt-6 space-y-2">
          {data.warnings.map((w, i) => (
            <Link key={i} href={w.link} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm font-medium ${warnTone[w.level]}`}>
              {w.text}
              <ArrowRight size={16} className="shrink-0" />
            </Link>
          ))}
        </div>
      )}

      <Card title="Последние заявки" className="mt-6"
            actions={<Link href="/admin/leads" className="text-sm font-semibold text-brand-700 hover:underline">Все заявки</Link>}>
        {data.recent_leads.length === 0 ? (
          <EmptyState text="Заявок пока нет. Они появятся здесь, когда клиенты заполнят форму на сайте." />
        ) : (
          <ul className="divide-y divide-ink/8">
            {data.recent_leads.map((l) => {
              const s = statusMeta(l.status);
              return (
                <li key={l.id}>
                  <Link href={`/admin/leads?open=${l.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-brand-700">
                    <span className="w-36 shrink-0 text-sm text-ink-500">{formatDate(l.created_at)}</span>
                    <span className="font-semibold">{l.name}</span>
                    <span className="text-sm text-ink-500">{l.phone}</span>
                    <span className="text-sm text-ink-500">{LEAD_KINDS[l.kind]}</span>
                    <span className="ml-auto"><Badge tone={s.tone}>{s.label}</Badge></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
