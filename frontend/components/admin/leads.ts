export const LEAD_KINDS: Record<string, string> = {
  project: "Строительство объекта",
  tender: "Тендер",
  subcontract: "Субподряд и поставки",
  apartment: "Покупка квартиры",
  other: "Другое",
};

export const LEAD_STATUSES: { key: string; label: string; tone: "orange" | "blue" | "green" | "gray" }[] = [
  { key: "new", label: "Новая", tone: "orange" },
  { key: "in_progress", label: "В работе", tone: "blue" },
  { key: "done", label: "Закрыта", tone: "green" },
  { key: "spam", label: "Спам", tone: "gray" },
];

export const statusMeta = (key: string) => LEAD_STATUSES.find((s) => s.key === key) ?? LEAD_STATUSES[0];

export const CHANNEL_LABELS: Record<string, string> = { telegram: "Telegram", email: "Почта", webhook: "Вебхук", crm: "CRM" };

export interface Lead {
  id: number;
  kind: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  message: string;
  project_title: string;
  realty_title?: string;
  service_title: string;
  page_url: string;
  lang: string;
  status: string;
  note: string;
  delivery: Record<string, { ok: boolean; detail: string }>;
  created_at: string;
}
