"use client";

import { useState } from "react";

import { CrudPage } from "@/components/admin/CrudPage";
import type { I18n } from "@/lib/admin-api";

const TABS = [
  { key: "types", label: "Типы объектов", endpoint: "/api/admin/types", add: "Добавить тип" },
  { key: "cities", label: "Города", endpoint: "/api/admin/cities", add: "Добавить город" },
] as const;

export default function TaxonomiesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("types");
  const current = TABS.find((t) => t.key === tab)!;
  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-xl bg-white p-1 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:inline-flex">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t.key ? "bg-ink text-white" : "text-ink-700 hover:bg-ink/5"}`}>
            {t.label}
          </button>
        ))}
      </div>
      <CrudPage
        key={current.key}
        title={current.label}
        subtitle="Используются в фильтрах каталога объектов. Пустые значения в фильтрах не показываются."
        endpoint={current.endpoint}
        addLabel={current.add}
        defaults={{ title: {}, slug: "", order: 99 }}
        fields={[
          { key: "title", label: "Название", type: "i18n", required: true },
          { key: "slug", label: "Код для адреса фильтра", type: "slug" },
        ]}
        rowTitle={(r) => (r.title as I18n).ru ?? ""}
        rowMeta={(r) => <span>{String(r.slug)}</span>}
      />
    </div>
  );
}
