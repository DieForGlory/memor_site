"use client";

import { useCallback, useEffect, useState } from "react";

import { ArrowLeft } from "@/components/icons";
import { api, type I18n } from "@/lib/admin-api";

import { I18nField } from "./I18nField";
import { ImageUpload } from "./ImageUpload";
import { Badge, Button, EmptyState, Field, inputCls, Loading, Modal, PageTitle, Toggle, useConfirm, useToast } from "./ui";

export type FieldDef =
  | { key: string; label: string; type: "i18n" | "i18n-text"; required?: boolean; hint?: string }
  | { key: string; label: string; type: "text" | "slug" | "date"; hint?: string }
  | { key: string; label: string; type: "number"; hint?: string }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "select"; options: { value: string | number; label: string }[]; nullable?: boolean };

type Row = Record<string, unknown> & { id: number };

interface Props {
  title: string;
  subtitle?: string;
  endpoint: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  image?: { aspect?: string; label?: string };
  /** Подпись строки в списке. */
  rowTitle: (row: Row) => string;
  rowMeta?: (row: Row) => React.ReactNode;
  addLabel?: string;
  /** Лишние поля, которых нет в схеме API, перед отправкой убираются. */
  payloadKeys?: string[];
}

export function CrudPage({ title, subtitle, endpoint, fields, defaults, image, rowTitle, rowMeta, addLabel = "Добавить", payloadKeys }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      setRows(await api<Row[]>(endpoint));
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }, [endpoint, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const keys = payloadKeys ?? fields.map((f) => f.key).concat("order");
  const payload = (data: Record<string, unknown>) => Object.fromEntries(keys.filter((k) => k in data).map((k) => [k, data[k]]));

  async function save() {
    if (!edit) return;
    setSaving(true);
    try {
      const id = edit.id as number | undefined;
      const saved = await api<Row>(id ? `${endpoint}/${id}` : endpoint, { method: id ? "PUT" : "POST", json: payload(edit) });
      toast("Сохранено");
      await load();
      // После создания оставляем окно открытым, чтобы сразу загрузить картинку.
      if (!id && image) setEdit(saved);
      else setEdit(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!(await confirm(`Удалить «${rowTitle(row)}»?`))) return;
    try {
      await api(`${endpoint}/${row.id}`, { method: "DELETE" });
      toast("Удалено");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function move(index: number, delta: number) {
    if (!rows) return;
    const next = [...rows];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setRows(next);
    try {
      await api(`${endpoint}/reorder`, { method: "POST", json: { ids: next.map((r) => r.id) } });
    } catch (e) {
      toast((e as Error).message, "error");
      load();
    }
  }

  const set = (key: string, value: unknown) => setEdit((e) => (e ? { ...e, [key]: value } : e));

  return (
    <div>
      <PageTitle title={title} subtitle={subtitle}
                 actions={<Button variant="primary" onClick={() => setEdit({ ...defaults })}>{addLabel}</Button>} />

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState text="Пока пусто" action={<Button variant="primary" onClick={() => setEdit({ ...defaults })}>{addLabel}</Button>} />
      ) : (
        <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/8 bg-white">
          {rows.map((row, i) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap sm:gap-4 sm:px-4">
              <div className="flex flex-col">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Выше"
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink/5 hover:text-ink disabled:opacity-20">
                  <ArrowLeft size={16} className="rotate-90" />
                </button>
                <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Ниже"
                        className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink/5 hover:text-ink disabled:opacity-20">
                  <ArrowLeft size={16} className="-rotate-90" />
                </button>
              </div>
              {image && (
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-sand sm:h-14 sm:w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {row.image_thumb ? <img src={row.image_thumb as string} alt="" className="h-full w-full object-cover" /> : null}
                </div>
              )}
              <button type="button" onClick={() => setEdit(row)} className="min-w-0 flex-1 basis-[160px] text-left">
                <p className="truncate font-semibold hover:text-brand-700">{rowTitle(row) || "Без названия"}</p>
                {rowMeta && <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">{rowMeta(row)}</div>}
              </button>
              {"is_published" in row && !row.is_published && <Badge>Скрыто</Badge>}
              <Button size="sm" onClick={() => setEdit(row)}>Изменить</Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(row)}>Удалить</Button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Редактирование" : addLabel} wide={!!image}
             footer={<><Button onClick={() => setEdit(null)}>Закрыть</Button><Button variant="primary" loading={saving} onClick={save}>Сохранить</Button></>}>
        {edit && (
          <div className={image ? "grid gap-6 md:grid-cols-[1fr_240px]" : ""}>
            <div className="space-y-5">
              {fields.map((f) => (
                <FieldInput key={f.key} def={f} value={edit[f.key]} onChange={(v) => set(f.key, v)} />
              ))}
            </div>
            {image && (
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-700">{image.label ?? "Картинка"}</p>
                {edit.id ? (
                  <ImageUpload endpoint={`${endpoint}/${edit.id}/image`} url={(edit.image_url as string) ?? ""} aspect={image.aspect}
                               onChange={(row) => {
                                 setEdit((e) => (e ? { ...e, image: row.image, image_url: row.image_url, image_thumb: row.image_thumb } : e));
                                 load();
                               }} />
                ) : (
                  <p className="rounded-xl bg-sand p-4 text-sm text-ink-500">Сохраните запись — после этого можно загрузить картинку.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function FieldInput({ def, value, onChange }: { def: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  switch (def.type) {
    case "i18n":
    case "i18n-text":
      return <I18nField label={def.label} value={(value as I18n) ?? {}} onChange={onChange} multiline={def.type === "i18n-text"}
                        required={def.required} hint={def.hint} />;
    case "toggle":
      return <Toggle checked={!!value} onChange={onChange} label={def.label} />;
    case "number":
      return (
        <Field label={def.label} hint={def.hint}>
          <input type="number" className={inputCls} value={(value as number | null) ?? ""}
                 onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
      );
    case "date":
      return (
        <Field label={def.label} hint={def.hint}>
          <input type="date" className={inputCls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value || null)} />
        </Field>
      );
    case "select":
      return (
        <Field label={def.label}>
          <select className={inputCls} value={value == null ? "" : String(value)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const opt = def.options.find((o) => String(o.value) === raw);
                    onChange(raw === "" ? null : opt ? opt.value : raw);
                  }}>
            {def.nullable && <option value="">—</option>}
            {def.options.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
          </select>
        </Field>
      );
    default:
      return (
        <Field label={def.label} hint={def.hint ?? (def.type === "slug" ? "Латиницей, для адреса страницы. Пусто — сгенерируется из названия." : undefined)}>
          <input className={inputCls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </Field>
      );
  }
}
