"use client";

import { useCallback, useEffect, useState } from "react";

import { CHANNEL_LABELS, type Lead, LEAD_KINDS, LEAD_STATUSES, statusMeta } from "@/components/admin/leads";
import { Badge, Button, EmptyState, Field, inputCls, Loading, Modal, PageTitle, useConfirm, useToast } from "@/components/admin/ui";
import { api, formatDate } from "@/lib/admin-api";

interface Page {
  items: Lead[];
  total: number;
  page: number;
  per_page: number;
  status_counts: Record<string, number>;
}

const PER_PAGE = 25;

export default function LeadsPage() {
  const [filters, setFilters] = useState({ status: "", kind: "", q: "", page: 1 });
  const [data, setData] = useState<Page | null>(null);
  const [open, setOpen] = useState<Lead | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const query = useCallback(
    (extra: Record<string, string> = {}) => {
      const p = new URLSearchParams();
      if (filters.status) p.set("status", filters.status);
      if (filters.kind) p.set("kind", filters.kind);
      if (filters.q.trim()) p.set("q", filters.q.trim());
      Object.entries(extra).forEach(([k, v]) => p.set(k, v));
      return p.toString();
    },
    [filters],
  );

  const load = useCallback(async () => {
    try {
      setData(await api<Page>(`/api/admin/leads?${query({ page: String(filters.page), per_page: String(PER_PAGE) })}`));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }, [query, filters.page, toast]);

  useEffect(() => {
    const t = window.setTimeout(load, filters.q ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, filters.q]);

  // Ссылка вида /admin/leads?open=12 (с дашборда) сразу открывает заявку.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("open");
    const status = params.get("status");
    if (status) setFilters((f) => ({ ...f, status }));
    if (id) api<Lead>(`/api/admin/leads/${id}`).then(openLead).catch(() => {});
  }, []);

  function openLead(lead: Lead) {
    setOpen(lead);
    setNote(lead.note);
  }

  async function patch(lead: Lead, body: Partial<Pick<Lead, "status" | "note">>) {
    setBusy(true);
    try {
      const updated = await api<Lead>(`/api/admin/leads/${lead.id}`, { method: "PATCH", json: body });
      setOpen(updated);
      toast("Сохранено");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function resend(lead: Lead) {
    setBusy(true);
    try {
      const updated = await api<Lead>(`/api/admin/leads/${lead.id}/resend`, { method: "POST" });
      setOpen(updated);
      const failed = Object.values(updated.delivery).filter((d) => !d.ok).length;
      toast(Object.keys(updated.delivery).length === 0 ? "Нет включённых каналов" : failed ? "Часть каналов с ошибкой" : "Отправлено повторно",
            failed || !Object.keys(updated.delivery).length ? "error" : "ok");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(lead: Lead) {
    if (!(await confirm(`Удалить заявку №${lead.id} от «${lead.name}»?`))) return;
    await api(`/api/admin/leads/${lead.id}`, { method: "DELETE" }).catch((e) => toast(e.message, "error"));
    setOpen(null);
    load();
  }

  const counts = data?.status_counts ?? {};
  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);
  const pages = data ? Math.max(1, Math.ceil(data.total / PER_PAGE)) : 1;

  return (
    <div>
      <PageTitle title="Заявки" subtitle="Обращения с форм сайта. Новые заявки также уходят в подключённые каналы."
                 actions={<a href={`/api/admin/leads/export.csv?${query()}`} className="inline-flex h-11 items-center rounded-xl border border-ink/15 bg-white px-5 text-sm font-semibold hover:border-ink/35">Выгрузить CSV</a>} />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-[0_1px_2px_rgb(0_0_0/0.05)] [scrollbar-width:none] sm:flex-wrap sm:self-start">
          {[{ key: "", label: "Все" }, ...LEAD_STATUSES].map((s) => {
            const n = s.key ? counts[s.key] ?? 0 : totalAll;
            return (
              <button key={s.key} type="button" onClick={() => setFilters((f) => ({ ...f, status: s.key, page: 1 }))}
                      className={`shrink-0 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${filters.status === s.key ? "bg-ink text-white" : "text-ink-700 hover:bg-ink/5"}`}>
                {s.label} <span className="ml-1 opacity-50">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-2 sm:flex">
          <select value={filters.kind} onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value, page: 1 }))} className={`${inputCls} sm:!w-auto`} aria-label="Тип">
            <option value="">Все типы</option>
            {Object.entries(LEAD_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="search" placeholder="Поиск: имя, телефон, текст" value={filters.q}
                 onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))} className={`${inputCls} sm:!w-64`} />
        </div>
      </div>

      {!data ? (
        <Loading />
      ) : data.items.length === 0 ? (
        <EmptyState text={totalAll ? "По фильтрам ничего не найдено" : "Заявок пока нет"} />
      ) : (
        <>
        <ul className="space-y-2 md:hidden">
          {data.items.map((l) => {
            const s = statusMeta(l.status);
            const channels = Object.entries(l.delivery ?? {});
            return (
              <li key={l.id}>
                <button type="button" onClick={() => openLead(l)}
                        className="w-full rounded-2xl border border-ink/8 bg-white p-4 text-left active:bg-sand/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{l.name}</p>
                      <p className="mt-0.5 text-sm text-ink-500">{l.phone}</p>
                    </div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-700">{LEAD_KINDS[l.kind] ?? l.kind}{(l.project_title || l.realty_title || l.service_title) && ` · ${l.project_title || l.realty_title || l.service_title}`}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-400">
                    <span>№{l.id} · {formatDate(l.created_at)}</span>
                    {channels.map(([ch, r]) => <Badge key={ch} tone={r.ok ? "green" : "red"}>{CHANNEL_LABELS[ch] ?? ch}</Badge>)}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto rounded-2xl border border-ink/8 bg-white md:block">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-ink/8 text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">№</th>
                <th className="px-4 py-3 font-semibold">Дата</th>
                <th className="px-4 py-3 font-semibold">Клиент</th>
                <th className="px-4 py-3 font-semibold">Тип</th>
                <th className="px-4 py-3 font-semibold">Объект / услуга</th>
                <th className="px-4 py-3 font-semibold">Доставка</th>
                <th className="px-4 py-3 font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/6">
              {data.items.map((l) => {
                const s = statusMeta(l.status);
                const channels = Object.entries(l.delivery ?? {});
                return (
                  <tr key={l.id} onClick={() => openLead(l)} className="cursor-pointer hover:bg-sand/60">
                    <td className="px-4 py-3 text-ink-400">{l.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-500">{formatDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-ink-500">{l.phone}{l.company && ` · ${l.company}`}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{LEAD_KINDS[l.kind] ?? l.kind}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-ink-500">{l.project_title || l.realty_title || l.service_title || "—"}</td>
                    <td className="px-4 py-3">
                      {channels.length === 0 ? <span className="text-ink-400">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {channels.map(([ch, r]) => <Badge key={ch} tone={r.ok ? "green" : "red"}>{CHANNEL_LABELS[ch] ?? ch}</Badge>)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {data && pages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button size="sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Назад</Button>
          <span className="px-2 text-ink-500">{filters.page} из {pages}</span>
          <Button size="sm" disabled={filters.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Вперёд</Button>
        </div>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `Заявка №${open.id}` : ""} wide
             footer={open && <>
               <Button variant="danger" onClick={() => remove(open)}>Удалить</Button>
               <Button onClick={() => resend(open)} loading={busy}>Отправить в каналы ещё раз</Button>
               <Button variant="primary" loading={busy} onClick={() => patch(open, { note })}>Сохранить комментарий</Button>
             </>}>
        {open && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <button key={s.key} type="button" onClick={() => patch(open, { status: s.key })}
                        className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${open.status === s.key ? "border-ink bg-ink text-white" : "border-ink/15 hover:border-ink/40"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:gap-x-6">
              {[
                ["Дата", formatDate(open.created_at)],
                ["Тип", LEAD_KINDS[open.kind] ?? open.kind],
                ["Имя", open.name],
                ["Телефон", open.phone],
                ["Email", open.email],
                ["Компания", open.company],
                ["Объект", open.project_title],
                ["Жилой комплекс", open.realty_title ?? ""],
                ["Услуга", open.service_title],
                ["Язык сайта", open.lang.toUpperCase()],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-400">{k}</dt>
                  <dd className="mt-1 font-medium">
                    {k === "Телефон" ? <a href={`tel:${v}`} className="text-brand-700 hover:underline">{v}</a>
                      : k === "Email" ? <a href={`mailto:${v}`} className="text-brand-700 hover:underline">{v}</a> : v}
                  </dd>
                </div>
              ))}
            </dl>
            {open.message && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Сообщение</p>
                <p className="mt-1 whitespace-pre-line rounded-xl bg-sand p-4 text-[15px]">{open.message}</p>
              </div>
            )}
            {open.page_url && <p className="break-all text-xs text-ink-400">Отправлено со страницы: {open.page_url}</p>}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Доставка</p>
              {Object.keys(open.delivery ?? {}).length === 0 ? (
                <p className="mt-1 text-sm text-ink-500">Каналы не были включены. Настройте их в разделе «Интеграции».</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {Object.entries(open.delivery).map(([ch, r]) => (
                    <li key={ch} className="flex gap-2">
                      <Badge tone={r.ok ? "green" : "red"}>{CHANNEL_LABELS[ch] ?? ch}</Badge>
                      <span className="text-ink-500">{r.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Field label="Комментарий менеджера">
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} resize-y`} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
