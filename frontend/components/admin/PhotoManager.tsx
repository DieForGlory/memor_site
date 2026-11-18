"use client";

import { useRef, useState } from "react";

import { ArrowLeft, Close } from "@/components/icons";
import { api, type I18n } from "@/lib/admin-api";

import { I18nField } from "./I18nField";
import { Badge, Button, inputCls, Modal, useConfirm, useToast } from "./ui";

export interface AdminPhoto {
  id: number;
  image: string;
  image_url: string;
  thumb_url: string;
  stage: string;
  caption: I18n;
  order: number;
  width: number;
  height: number;
}

export const STAGES = [
  { key: "", label: "Без этапа" },
  { key: "render", label: "Проект" },
  { key: "construction", label: "Строительство" },
  { key: "finished", label: "Результат" },
];

interface Props {
  projectId: number;
  photos: AdminPhoto[];
  cover: string;
  onProject: (p: { photos: AdminPhoto[]; cover: string }) => void;
}

const BATCH = 3;

export function PhotoManager({ projectId, photos, cover, onProject }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [caption, setCaption] = useState<{ photo: AdminPhoto; value: I18n } | null>(null);
  const toast = useToast();
  const confirm = useConfirm();

  async function upload(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    setProgress({ done: 0, total: images.length });
    const errors: string[] = [];
    // Пачками по несколько файлов: большие фото с телефона весят по 5–10 МБ.
    for (let i = 0; i < images.length; i += BATCH) {
      const form = new FormData();
      images.slice(i, i + BATCH).forEach((f) => form.append("files", f));
      form.append("stage", stage);
      try {
        const res = await api<{ project: { photos: AdminPhoto[]; cover: string }; errors: string[] }>(
          `/api/admin/projects/${projectId}/photos`, { method: "POST", form },
        );
        onProject(res.project);
        errors.push(...res.errors);
      } catch (e) {
        errors.push((e as Error).message);
      }
      setProgress({ done: Math.min(i + BATCH, images.length), total: images.length });
    }
    setProgress(null);
    if (errors.length) toast(`Не загрузились:\n${errors.join("\n")}`, "error");
    else toast(`Загружено фото: ${images.length}`);
  }

  async function call(path: string, method: string, json?: unknown) {
    try {
      const res = await api<{ photos: AdminPhoto[]; cover: string }>(path, { method, json });
      onProject(res);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function patchPhoto(photo: AdminPhoto, patch: Partial<Pick<AdminPhoto, "stage" | "caption">>) {
    try {
      const updated = await api<AdminPhoto>(`/api/admin/photos/${photo.id}`, { method: "PATCH", json: patch });
      onProject({ cover, photos: photos.map((p) => (p.id === photo.id ? { ...p, ...updated } : p)) });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function drop(targetId: number) {
    if (dragId === null || dragId === targetId) return;
    const ids = photos.map((p) => p.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    // Сразу показываем новый порядок, затем сохраняем.
    onProject({ cover, photos: ids.map((id) => photos.find((p) => p.id === id)!) });
    await call(`/api/admin/projects/${projectId}/photos/reorder`, "POST", { ids });
  }

  // Сдвиг кнопками — для телефонов и планшетов (перетаскивание там ненадёжно) и для клавиатуры.
  async function shift(index: number, delta: number) {
    const ids = photos.map((p) => p.id);
    const to = index + delta;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    onProject({ cover, photos: ids.map((id) => photos.find((p) => p.id === id)!) });
    await call(`/api/admin/projects/${projectId}/photos/reorder`, "POST", { ids });
  }

  return (
    <div>
      <div
        className="flex flex-col gap-4 rounded-xl border-2 border-dashed border-ink/15 bg-sand/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) e.preventDefault();
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          upload(Array.from(e.dataTransfer.files));
        }}
      >
        <div>
          <p className="font-semibold">Перетащите фото сюда или выберите файлы</p>
          <p className="mt-1 text-sm text-ink-500">JPG, PNG, WebP до 30 МБ. Фото уменьшаются и переводятся в WebP автоматически.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={`${inputCls} !w-auto`} aria-label="Этап для новых фото">
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <Button variant="primary" loading={!!progress} onClick={() => input.current?.click()}>
            {progress ? `${progress.done} / ${progress.total}` : "Выбрать фото"}
          </Button>
        </div>
        <input ref={input} type="file" accept="image/*" multiple hidden
               onChange={(e) => {
                 upload(Array.from(e.target.files ?? []));
                 e.target.value = "";
               }} />
      </div>

      {photos.length > 0 && (
        <p className="mt-4 text-xs text-ink-400">Порядок меняется перетаскиванием или стрелками на фото. Обложка показывается в карточке объекта и в шапке его страницы.</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
        {photos.map((p, index) => {
          const isCover = p.image === cover;
          return (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => {
                setDragId(p.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                if (dragId !== null) {
                  e.preventDefault();
                  setOverId(p.id);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(p.id);
                setOverId(null);
              }}
              className={`group overflow-hidden rounded-xl border bg-white transition-shadow ${
                overId === p.id && dragId !== p.id ? "border-brand ring-2 ring-brand/30" : "border-ink/10"
              } ${dragId === p.id ? "opacity-40" : ""}`}
            >
              <div className="relative aspect-[4/3] cursor-grab bg-sand active:cursor-grabbing">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb_url} alt="" loading="lazy" className="h-full w-full object-cover" draggable={false} />
                {isCover && <span className="absolute left-2 top-2"><Badge tone="orange">Обложка</Badge></span>}
                <div className="absolute bottom-2 right-2 flex gap-1">
                  {[{ d: -1, label: "Сдвинуть раньше", cls: "" }, { d: 1, label: "Сдвинуть позже", cls: "rotate-180" }].map(({ d, label, cls }) => (
                    <button key={d} type="button" aria-label={label} title={label}
                            disabled={index + d < 0 || index + d >= photos.length}
                            onClick={() => shift(index, d)}
                            className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink shadow disabled:hidden">
                      <ArrowLeft size={16} className={cls} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 p-2 sm:p-3">
                <select value={p.stage} onChange={(e) => patchPhoto(p, { stage: e.target.value })}
                        className={`${inputCls} !py-1.5 text-[13px]`} aria-label="Этап">
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <div className="flex flex-wrap items-center gap-0.5">
                  {!isCover && (
                    <Button size="sm" variant="ghost" className="!h-8 !px-2 !text-xs"
                            onClick={() => call(`/api/admin/projects/${projectId}/cover`, "POST", { photo_id: p.id })}>
                      Обложка
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="!h-8 !px-2 !text-xs" onClick={() => setCaption({ photo: p, value: p.caption ?? {} })}>
                    Подпись{p.caption?.ru ? " ✓" : ""}
                  </Button>
                  <button type="button" aria-label="Удалить фото" title="Удалить фото"
                          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                          onClick={async () => {
                            if (await confirm("Удалить это фото? Восстановить его будет нельзя.")) {
                              await call(`/api/admin/photos/${p.id}`, "DELETE");
                            }
                          }}>
                    <Close size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!caption} onClose={() => setCaption(null)} title="Подпись к фото"
             footer={<>
               <Button onClick={() => setCaption(null)}>Отмена</Button>
               <Button variant="primary" onClick={async () => {
                 if (caption) await patchPhoto(caption.photo, { caption: caption.value });
                 setCaption(null);
               }}>Сохранить</Button>
             </>}>
        {caption && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={caption.photo.thumb_url} alt="" className="max-h-60 w-full rounded-xl object-cover" />
            <I18nField label="Подпись" value={caption.value} onChange={(value) => setCaption({ ...caption, value })} />
          </div>
        )}
      </Modal>
    </div>
  );
}
