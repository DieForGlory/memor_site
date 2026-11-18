"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import type { I18n } from "@/lib/admin-api";

const ICONS = [
  { value: "design", label: "Проектирование (здание)" },
  { value: "crane", label: "Кран" },
  { value: "excavator", label: "Экскаватор" },
  { value: "network", label: "Сети" },
  { value: "roller", label: "Отделка (валик)" },
  { value: "facade", label: "Фасад" },
  { value: "tree", label: "Ландшафт" },
];

export default function ServicesAdminPage() {
  return (
    <CrudPage
      title="Услуги"
      subtitle="Карточки на главной и отдельные страницы услуг. Порядок — стрелками."
      endpoint="/api/admin/services"
      addLabel="Добавить услугу"
      image={{ aspect: "aspect-[4/3]", label: "Картинка (необязательно)" }}
      defaults={{ title: {}, short: {}, description: {}, slug: "", icon: "crane", is_published: true, order: 99 }}
      fields={[
        { key: "title", label: "Название", type: "i18n", required: true },
        { key: "short", label: "Кратко (карточка)", type: "i18n-text" },
        { key: "description", label: "Описание (страница услуги)", type: "i18n-text", hint: "Абзацы разделяйте пустой строкой." },
        { key: "icon", label: "Иконка", type: "select", options: ICONS },
        { key: "slug", label: "Адрес страницы", type: "slug" },
        { key: "is_published", label: "Показывать на сайте", type: "toggle" },
      ]}
      rowTitle={(r) => (r.title as I18n).ru ?? ""}
      rowMeta={(r) => <span>/services/{String(r.slug)}</span>}
    />
  );
}
