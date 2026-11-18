"use client";

import { useEffect, useState } from "react";

import { Button, Field, inputCls } from "@/components/admin/ui";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/admin-api";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get("expired") === "1");
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", json: { email: form.get("email"), password: form.get("password") } });
      const next = new URLSearchParams(window.location.search).get("next");
      // Только внутренние адреса админки — защита от открытого редиректа.
      window.location.href = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(243_127_59/0.35),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo />
          <div>
            <p className="font-display text-5xl font-medium leading-tight">Управление <em className="italic text-brand">сайтом</em></p>
            <p className="mt-4 max-w-md text-white/60">Объекты и фотографии, услуги, заявки клиентов, интеграции и настройки — в одном месте.</p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden"><Logo tone="dark" /></div>
          <div>
            <h1 className="text-2xl font-bold">Вход в админку</h1>
            <p className="mt-1 text-sm text-ink-500">Используйте email и пароль администратора.</p>
          </div>
          <Field label="Email">
            <input name="email" type="email" required autoComplete="username" className={inputCls} />
          </Field>
          <Field label="Пароль">
            <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
          </Field>
          {expired && !error && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
              Сессия истекла — войдите снова, и откроется та же страница.
            </p>
          )}
          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
          <Button type="submit" variant="primary" loading={busy} className="w-full">Войти</Button>
        </form>
      </div>
    </div>
  );
}
