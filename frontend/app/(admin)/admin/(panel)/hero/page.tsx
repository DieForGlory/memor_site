"use client";

import { useEffect, useState } from "react";

import { CrudPage } from "@/components/admin/CrudPage";
import { Loading } from "@/components/admin/ui";
import { api, type I18n } from "@/lib/admin-api";

export default function HeroAdminPage() {
  const [projects, setProjects] = useState<{ id: number; title: I18n }[] | null>(null);
  useEffect(() => {
    api<{ id: number; title: I18n }[]>("/api/admin/projects").then(setProjects).catch(() => setProjects([]));
  }, []);
  if (!projects) return <Loading />;
  const titles = Object.fromEntries(projects.map((p) => [p.id, p.title.ru ?? ""]));

  return (
    <CrudPage
      title="Слайды главной"
      subtitle="Полноэкранные фото на первом экране. Лучше горизонтальные снимки от 1920 px по ширине."
      endpoint="/api/admin/hero"
      addLabel="Добавить слайд"
      image={{ aspect: "aspect-video", label: "Фото слайда" }}
      defaults={{ caption: {}, project_id: null, is_published: true, order: 99 }}
      fields={[
        { key: "project_id", label: "Ссылка на объект", type: "select", nullable: true,
          options: projects.map((p) => ({ value: p.id, label: p.title.ru ?? `#${p.id}` })) },
        { key: "caption", label: "Подпись", type: "i18n", hint: "Пусто — подставится название объекта." },
        { key: "is_published", label: "Показывать", type: "toggle" },
      ]}
      rowTitle={(r) => (r.caption as I18n).ru || titles[r.project_id as number] || `Слайд ${r.id}`}
      rowMeta={(r) => (r.project_id ? <span>→ {titles[r.project_id as number]}</span> : null)}
    />
  );
}
