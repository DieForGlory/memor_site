"use client";

import { CrudPage } from "@/components/admin/CrudPage";
import { Badge } from "@/components/admin/ui";
import { formatDate, type I18n } from "@/lib/admin-api";

export default function DocumentsAdminPage() {
  return (
    <CrudPage
      title="Сертификаты и лицензии"
      subtitle="Показываются на главной и в «О компании», только если опубликованы. Просроченные документы подсвечиваются."
      endpoint="/api/admin/documents"
      addLabel="Добавить документ"
      image={{ aspect: "aspect-[3/4]", label: "Скан документа" }}
      defaults={{ kind: "certificate", title: {}, valid_until: null, is_published: false, order: 99 }}
      fields={[
        { key: "title", label: "Название", type: "i18n", required: true },
        { key: "kind", label: "Тип", type: "select", options: [{ value: "certificate", label: "Сертификат" }, { value: "license", label: "Лицензия" }] },
        { key: "valid_until", label: "Действует до", type: "date", hint: "После этой даты дашборд напомнит обновить документ." },
        { key: "is_published", label: "Показывать на сайте", type: "toggle" },
      ]}
      rowTitle={(r) => (r.title as I18n).ru ?? ""}
      rowMeta={(r) => {
        const until = r.valid_until as string | null;
        const expired = until && new Date(until) < new Date();
        return (
          <>
            <span>{r.kind === "license" ? "Лицензия" : "Сертификат"}</span>
            {until && (expired ? <Badge tone="red">Просрочен с {formatDate(until, false)}</Badge> : <span>до {formatDate(until, false)}</span>)}
          </>
        );
      }}
    />
  );
}
