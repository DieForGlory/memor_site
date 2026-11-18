"use client";

import { useEffect, useState } from "react";

import { Badge, Button, Card, Field, inputCls, Loading, PageTitle, Toggle, useToast } from "@/components/admin/ui";
import { api } from "@/lib/admin-api";

interface Integrations {
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_bot_token_masked: string;
  telegram_chat_id: string;
  email_enabled: boolean;
  email_recipients: string;
  webhook_enabled: boolean;
  webhook_url: string;
  crm_enabled: boolean;
  crm_url: string;
  crm_api_key: string;
  crm_api_key_masked: string;
  crm_catalog_enabled: boolean;
  yandex_metrika_id: string;
  google_analytics_id: string;
  clear_telegram_token?: boolean;
  clear_crm_api_key?: boolean;
}

type Channel = "telegram" | "email" | "webhook" | "crm";

const CRM_KEY_HINT =
  "Ключ выдаётся в CRM: Настройки → API-ключи партнёров, право «Создание заявок» (CREATE_APPLICATION). " +
  "Для раздела «Квартиры» добавьте права «Просмотр проектов» и «Просмотр домов» (VIEW_PROJECTS, VIEW_BUILDINGS). " +
  "Если в ключе включён список IP — добавьте IP сервера сайта.";

const WEBHOOK_EXAMPLE = `{
  "id": 42, "kind": "project", "kind_label": "Строительство объекта",
  "name": "…", "phone": "…", "email": "…", "company": "…", "message": "…",
  "project": "…", "service": "…", "page_url": "…", "lang": "ru",
  "created_at": "2026-11-16T10:00:00+00:00"
}`;

export default function IntegrationsPage() {
  const [cfg, setCfg] = useState<Integrations | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState("");
  const toast = useToast();

  useEffect(() => {
    api<Integrations>("/api/admin/settings/integrations").then(setCfg).catch((e) => toast(e.message, "error"));
  }, [toast]);

  if (!cfg) return <Loading />;
  const set = <K extends keyof Integrations>(k: K, v: Integrations[K]) => setCfg((c) => (c ? { ...c, [k]: v } : c));

  async function save(): Promise<boolean> {
    if (!cfg) return false;
    setSaving(true);
    try {
      setCfg(await api<Integrations>("/api/admin/settings/integrations", { method: "PUT", json: cfg }));
      toast("Интеграции сохранены");
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function test(channel: Channel) {
    setTesting(channel);
    try {
      // Сначала сохраняем, чтобы проверка шла на актуальных настройках.
      if (!(await save())) return;
      const r = await api<{ ok: boolean; detail: string }>("/api/admin/settings/integrations/test", { method: "POST", json: { channel } });
      // CRM проверяется без отправки заявки, поэтому показываем ответ как есть.
      const okText = channel === "crm" ? r.detail : "Тестовое сообщение отправлено";
      toast(r.ok ? okText : `Ошибка: ${r.detail}`, r.ok ? "ok" : "error");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setTesting("");
    }
  }

  // Раздел «Квартиры»: забрать каталог из CRM заново и показать, сколько пришло
  async function checkCatalog() {
    setTesting("catalog");
    try {
      if (!(await save())) return;
      const r = await api<{ ok: boolean; detail: string }>("/api/admin/settings/integrations/catalog", { method: "POST" });
      toast(r.ok ? r.detail : `Ошибка: ${r.detail}`, r.ok ? "ok" : "error");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setTesting("");
    }
  }

  const status = (on: boolean) => <Badge tone={on ? "green" : "gray"}>{on ? "Включено" : "Выключено"}</Badge>;

  return (
    <div>
      <PageTitle title="Интеграции" subtitle="Куда пересылать заявки с сайта и какие счётчики подключить."
                 actions={<Button variant="primary" loading={saving} onClick={save}>Сохранить</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Telegram" actions={status(cfg.telegram_enabled)}>
          <div className="space-y-5">
            <Toggle checked={cfg.telegram_enabled} onChange={(v) => set("telegram_enabled", v)} label="Отправлять заявки в Telegram" />
            <Field label="Токен бота" hint={cfg.telegram_bot_token_masked ? `Сохранён: ${cfg.telegram_bot_token_masked}. Оставьте поле пустым, чтобы не менять.` : "Создайте бота у @BotFather и вставьте токен."}>
              <input type="password" autoComplete="off" className={inputCls} value={cfg.telegram_bot_token}
                     onChange={(e) => set("telegram_bot_token", e.target.value)} placeholder={cfg.telegram_bot_token_masked || "123456:ABC…"} />
            </Field>
            <Field label="Chat ID" hint="ID чата или группы, куда бот будет писать. Добавьте бота в группу и узнайте ID, например, через @userinfobot.">
              <input className={inputCls} value={cfg.telegram_chat_id} onChange={(e) => set("telegram_chat_id", e.target.value)} placeholder="-100…" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={testing === "telegram"} onClick={() => test("telegram")}>Отправить тест</Button>
              {cfg.telegram_bot_token_masked && (
                <Button size="sm" variant="ghost" onClick={() => setCfg({ ...cfg, telegram_bot_token: "", clear_telegram_token: true, telegram_bot_token_masked: "" })}>
                  Удалить токен
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card title="Почта" actions={status(cfg.email_enabled)}>
          <div className="space-y-5">
            <Toggle checked={cfg.email_enabled} onChange={(v) => set("email_enabled", v)} label="Отправлять заявки на почту" />
            <Field label="Получатели" hint="Через запятую. SMTP-сервер задаётся в backend/.env (SMTP_HOST, SMTP_USER, SMTP_PASSWORD).">
              <input className={inputCls} value={cfg.email_recipients} onChange={(e) => set("email_recipients", e.target.value)} placeholder="sales@memor.uz, director@memor.uz" />
            </Field>
            <Button size="sm" loading={testing === "email"} onClick={() => test("email")}>Отправить тест</Button>
          </div>
        </Card>

        <Card title="CRM MEMOR" actions={status(cfg.crm_enabled || cfg.crm_catalog_enabled)}>
          <div className="space-y-5">
            <Toggle checked={cfg.crm_enabled} onChange={(v) => set("crm_enabled", v)} label="Создавать обращения в CRM" />
            <Field label="Адрес CRM" hint="Адрес, по которому открывается CRM, без /api в конце. Только https:// и публичный адрес: внутренние адреса (127.0.0.1, 10.x, 192.168.x) разрешаются лишь в backend/.env.">
              <input className={inputCls} value={cfg.crm_url} onChange={(e) => set("crm_url", e.target.value.trim())} placeholder="https://crm.…" />
            </Field>
            <Field label="API-ключ" hint={cfg.crm_api_key_masked ? `Сохранён: ${cfg.crm_api_key_masked}. Оставьте поле пустым, чтобы не менять.` : "Ключ партнёра из CRM."}>
              <input type="password" autoComplete="off" className={inputCls} value={cfg.crm_api_key}
                     onChange={(e) => set("crm_api_key", e.target.value)} placeholder={cfg.crm_api_key_masked || "Вставьте ключ"} />
            </Field>
            <p className="rounded-xl bg-sand p-4 text-sm text-ink-700">{CRM_KEY_HINT}</p>
            <div className="border-t border-ink/10 pt-5">
              <Toggle checked={cfg.crm_catalog_enabled} onChange={(v) => set("crm_catalog_enabled", v)}
                      label="Показывать квартиры из CRM на сайте" />
              <p className="mt-2 text-sm text-ink-500">
                Раздел «Квартиры» в меню сайта: жилые комплексы, планировки и свободные квартиры с ценами. Наличие обновляется раз в 5 минут.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" loading={testing === "crm"} onClick={() => test("crm")}>Проверить подключение</Button>
              <Button size="sm" loading={testing === "catalog"} onClick={checkCatalog}>Проверить каталог</Button>
              {cfg.crm_api_key_masked && (
                <Button size="sm" variant="ghost" onClick={() => setCfg({ ...cfg, crm_api_key: "", clear_crm_api_key: true, crm_api_key_masked: "" })}>
                  Удалить ключ
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card title="Вебхук" actions={status(cfg.webhook_enabled)}>
          <div className="space-y-5">
            <Toggle checked={cfg.webhook_enabled} onChange={(v) => set("webhook_enabled", v)} label="Отправлять заявки POST-запросом" />
            <Field label="URL вебхука" hint="Входящий вебхук Bitrix24, amoCRM (через коннектор), Make, n8n или свой сервер. Только https:// и публичный адрес, без перенаправлений.">
              <input className={inputCls} value={cfg.webhook_url} onChange={(e) => set("webhook_url", e.target.value)} placeholder="https://…" />
            </Field>
            <details className="rounded-xl bg-sand p-4 text-sm">
              <summary className="cursor-pointer font-semibold">Формат данных (JSON)</summary>
              <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-ink-700">{WEBHOOK_EXAMPLE}</pre>
            </details>
            <Button size="sm" loading={testing === "webhook"} onClick={() => test("webhook")}>Отправить тест</Button>
          </div>
        </Card>

        <Card title="Аналитика">
          <div className="space-y-5">
            <Field label="Яндекс Метрика — номер счётчика" hint="Только цифры, например 98765432.">
              <input className={inputCls} value={cfg.yandex_metrika_id} onChange={(e) => set("yandex_metrika_id", e.target.value.trim())} />
            </Field>
            <Field label="Google Analytics 4 — Measurement ID" hint="Формат G-XXXXXXXXXX.">
              <input className={inputCls} value={cfg.google_analytics_id} onChange={(e) => set("google_analytics_id", e.target.value.trim())} />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}
