"use client";

import { useState } from "react";

import { Button, Card, Field, inputCls, PageTitle, useToast } from "@/components/admin/ui";
import { api } from "@/lib/admin-api";

export default function AccountPage() {
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    if (data.get("new_password") !== data.get("repeat")) {
      toast("Новые пароли не совпадают", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/password", {
        method: "POST",
        json: { current_password: data.get("current_password"), new_password: data.get("new_password") },
      });
      toast("Пароль изменён");
      form.reset();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <PageTitle title="Смена пароля" />
      <Card>
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Текущий пароль">
            <input name="current_password" type="password" required autoComplete="current-password" className={inputCls} />
          </Field>
          <Field label="Новый пароль" hint="Не короче 10 символов.">
            <input name="new_password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
          </Field>
          <Field label="Повторите новый пароль">
            <input name="repeat" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
          </Field>
          <Button type="submit" variant="primary" loading={busy}>Сменить пароль</Button>
        </form>
      </Card>
    </div>
  );
}
