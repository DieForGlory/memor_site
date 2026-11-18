"use client";

import { useCallback, useEffect, useState } from "react";

import { useMe } from "@/components/admin/Shell";
import { Badge, Button, Field, inputCls, Loading, Modal, PageTitle, Toggle, useConfirm, useToast } from "@/components/admin/ui";
import { api, formatDate } from "@/lib/admin-api";

interface User {
  id?: number;
  email: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  password?: string;
}

export default function UsersPage() {
  const me = useMe();
  const [rows, setRows] = useState<User[] | null>(null);
  const [edit, setEdit] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const load = useCallback(() => {
    api<User[]>("/api/admin/users").then(setRows).catch((e) => toast(e.message, "error"));
  }, [toast]);
  useEffect(load, [load]);

  async function save() {
    if (!edit) return;
    setSaving(true);
    try {
      const body = { email: edit.email, name: edit.name, is_active: edit.is_active, password: edit.password || null };
      await api(edit.id ? `/api/admin/users/${edit.id}` : "/api/admin/users", { method: edit.id ? "PUT" : "POST", json: body });
      toast("Сохранено");
      setEdit(null);
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: User) {
    if (!(await confirm(`Удалить доступ для ${u.email}?`))) return;
    await api(`/api/admin/users/${u.id}`, { method: "DELETE" }).then(load).catch((e) => toast(e.message, "error"));
  }

  return (
    <div>
      <PageTitle title="Пользователи" subtitle="Кто может входить в админку."
                 actions={<Button variant="primary" onClick={() => setEdit({ email: "", name: "", is_active: true, password: "" })}>Добавить</Button>} />
      {!rows ? <Loading /> : (
        <ul className="divide-y divide-ink/8 overflow-hidden rounded-2xl border border-ink/8 bg-white">
          {rows.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{u.name || u.email} {u.id === me?.id && <span className="text-sm font-normal text-ink-400">(вы)</span>}</p>
                <p className="text-sm text-ink-500">{u.email} · с {formatDate(u.created_at, false)}</p>
              </div>
              {!u.is_active && <Badge tone="red">Отключён</Badge>}
              <Button size="sm" onClick={() => setEdit({ ...u, password: "" })}>Изменить</Button>
              {u.id !== me?.id && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(u)}>Удалить</Button>}
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Пользователь" : "Новый пользователь"}
             footer={<><Button onClick={() => setEdit(null)}>Отмена</Button><Button variant="primary" loading={saving} onClick={save}>Сохранить</Button></>}>
        {edit && (
          <div className="space-y-5">
            <Field label="Email (логин)">
              <input type="email" className={inputCls} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
            </Field>
            <Field label="Имя">
              <input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label={edit.id ? "Новый пароль" : "Пароль"} hint={edit.id ? "Пусто — пароль не меняется. Не короче 10 символов." : "Не короче 10 символов."}>
              <input type="password" autoComplete="new-password" className={inputCls} value={edit.password ?? ""}
                     onChange={(e) => setEdit({ ...edit, password: e.target.value })} />
            </Field>
            {edit.id !== me?.id && <Toggle checked={edit.is_active} onChange={(v) => setEdit({ ...edit, is_active: v })} label="Доступ разрешён" />}
          </div>
        )}
      </Modal>
    </div>
  );
}
