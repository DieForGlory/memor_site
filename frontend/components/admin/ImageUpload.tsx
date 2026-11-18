"use client";

import { useRef, useState } from "react";

import { api } from "@/lib/admin-api";

import { Button, useToast } from "./ui";

interface Props {
  /** Путь API вида /api/admin/services/3/image */
  endpoint: string;
  url: string;
  onChange: (row: Record<string, unknown>) => void;
  aspect?: string;
}

export function ImageUpload({ endpoint, url, onChange, aspect = "aspect-[4/3]" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    setBusy(true);
    try {
      onChange(await api(endpoint, { method: "POST", form }));
      toast("Картинка загружена");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      onChange(await api(endpoint, { method: "DELETE" }));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div
        className={`relative grid ${aspect} w-full place-items-center overflow-hidden rounded-xl border border-dashed border-ink/20 bg-sand`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) upload(f);
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-center text-sm text-ink-400">Перетащите картинку сюда</span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" loading={busy} onClick={() => input.current?.click()}>
          {url ? "Заменить" : "Загрузить"}
        </Button>
        {url && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
            Удалить
          </Button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden
             onChange={(e) => {
               const f = e.target.files?.[0];
               if (f) upload(f);
               e.target.value = "";
             }} />
    </div>
  );
}
