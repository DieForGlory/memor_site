"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import type { I18n } from "@/lib/admin-api";

export default function EquipmentAdminPage() {
  return (
    <CrudPage
      title="Спецтехника"
      subtitle="Собственный парк техники — лента на главной и на странице «О компании»."
      endpoint="/api/admin/equipment"
      addLabel="Добавить технику"
      image={{ aspect: "aspect-[4/3]", label: "Фото" }}
      defaults={{ title: {}, description: {}, is_published: true, order: 99 }}
      fields={[
        { key: "title", label: "Название", type: "i18n", required: true },
        { key: "description", label: "Описание", type: "i18n-text", hint: "Необязательно: модель, грузоподъёмность и т. п." },
        { key: "is_published", label: "Показывать на сайте", type: "toggle" },
      ]}
      rowTitle={(r) => (r.title as I18n).ru ?? ""}
    />
  );
}
