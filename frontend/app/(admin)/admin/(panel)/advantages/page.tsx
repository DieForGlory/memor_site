"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import type { I18n } from "@/lib/admin-api";

export default function AdvantagesAdminPage() {
  return (
    <CrudPage
      title="Преимущества"
      subtitle="Блок «Почему нам доверяют»."
      endpoint="/api/admin/advantages"
      addLabel="Добавить пункт"
      defaults={{ title: {}, text: {}, order: 99 }}
      fields={[
        { key: "title", label: "Заголовок", type: "i18n", required: true },
        { key: "text", label: "Пояснение", type: "i18n-text" },
      ]}
      rowTitle={(r) => (r.title as I18n).ru ?? ""}
      rowMeta={(r) => <span className="line-clamp-1">{(r.text as I18n).ru}</span>}
    />
  );
}
