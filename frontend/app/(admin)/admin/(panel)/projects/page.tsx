"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge, Button, EmptyState, inputCls, Loading, PageTitle, useToast } from "@/components/admin/ui";
import { ArrowLeft } from "@/components/icons";
import { api, type I18n } from "@/lib/admin-api";

interface Row {
  id: number;
  slug: string;
  title: I18n;
  kicker: I18n;
  sector: string;
  status: string;
  is_published: boolean;
  is_featured: boolean;
  cover_thumb_url: string;
  photos_count: number;
  lat: number | null;
}

export default function ProjectsAdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const toast = useToast();

  useEffect(() => {
    api<Row[]>("/api/admin/projects").then(setRows).catch((e) => toast(e.message, "error"));
  }, [toast]);

  const visible = useMemo(
    () => (rows ?? []).filter((r) => !q.trim() || (r.title.ru ?? "").toLowerCase().includes(q.trim().toLowerCase())),
    [rows, q],
  );

  async function move(index: number, delta: number) {
    if (!rows) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setRows(next);
    await api("/api/admin/projects/reorder", { method: "POST", json: { ids: next.map((r) => r.id) } }).catch((e) =>
      toast(e.message, "error"),
    );
  }

  return (
    <div>
      <PageTitle title="Объекты" subtitle="Порядок в списке = порядок на сайте. «На главной» — объекты в подборке главной страницы."
                 actions={<Link href="/admin/projects/new"><Button variant="primary">Добавить объект</Button></Link>} />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию"
             className={`${inputCls} mb-4 sm:!w-72`} />
      {!rows ? (
        <Loading />
      ) : visible.length === 0 ? (
        <EmptyState text="Объектов нет" />
      ) : (
        <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/8 bg-white">
          {visible.map((r) => {
            const i = rows.indexOf(r);
            return (
              <li key={r.id} className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
                {!q && (
                  <div className="flex flex-col">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Выше" className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink/5 hover:text-ink disabled:opacity-20">
                      <ArrowLeft size={16} className="rotate-90" />
                    </button>
                    <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Ниже" className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink/5 hover:text-ink disabled:opacity-20">
                      <ArrowLeft size={16} className="-rotate-90" />
                    </button>
                  </div>
                )}
                <Link href={`/admin/projects/${r.id}`} className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-sand sm:h-14 sm:w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.cover_thumb_url && <img src={r.cover_thumb_url} alt="" className="h-full w-full object-cover" />}
                </Link>
                <Link href={`/admin/projects/${r.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-semibold hover:text-brand-700">{r.title.ru}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {r.kicker.ru} · {r.photos_count} фото{r.lat == null && " · нет точки на карте"}
                  </p>
                </Link>
                <div className="hidden flex-wrap justify-end gap-1.5 md:flex">
                  <Badge tone={r.sector === "state" ? "blue" : "gray"}>{r.sector === "state" ? "Гос." : "Коммерч."}</Badge>
                  <Badge tone={r.status === "completed" ? "green" : "orange"}>{r.status === "completed" ? "Завершён" : "В работе"}</Badge>
                  {r.is_featured && <Badge tone="orange">На главной</Badge>}
                  {!r.is_published && <Badge>Скрыт</Badge>}
                  {(!r.title.uz || !r.title.en) && <Badge tone="red">Нет перевода</Badge>}
                </div>
                <a href={`/ru/projects/${r.slug}`} target="_blank" rel="noopener" className="hidden text-sm font-semibold text-ink-500 hover:text-ink lg:block">
                  На сайте ↗
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
