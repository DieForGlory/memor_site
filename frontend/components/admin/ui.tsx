"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { Check, Close } from "@/components/icons";

/* ------------------------------------------------------------------ кнопки и поля */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

export function Button({ variant = "secondary", size = "md", loading, className = "", children, disabled, ...rest }: BtnProps) {
  const styles = {
    primary: "bg-brand text-white hover:bg-brand-600 shadow-sm",
    secondary: "bg-white text-ink border border-ink/15 hover:border-ink/35",
    ghost: "text-ink-700 hover:bg-ink/5",
    danger: "bg-white text-red-600 border border-red-200 hover:bg-red-50",
  }[variant];
  const sizes = size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-11 px-5 text-sm";
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${sizes} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const inputCls =
  "w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-400 focus:border-brand disabled:bg-sand";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex w-fit cursor-pointer select-none items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand" : "bg-ink/20"}`}
      >
        <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
      <span className="text-sm font-medium text-ink-700">{label}</span>
    </label>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-ink/8 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ tone = "gray", children }: { tone?: "gray" | "green" | "orange" | "red" | "blue"; children: React.ReactNode }) {
  const styles = {
    gray: "bg-ink/6 text-ink-700",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-brand-50 text-brand-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-700",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{children}</span>;
}

export function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-6 py-14 text-center">
      <p className="text-ink-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center gap-3 py-16 text-ink-500">
      <Spinner /> Загрузка…
    </div>
  );
}

/* ------------------------------------------------------------------ модальные окна */

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink-950/50 p-3 backdrop-blur-sm sm:p-10"
         onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
           className={`w-full rounded-2xl bg-white shadow-2xl ${wide ? "max-w-3xl" : "max-w-xl"}`}>
        <div className="flex items-center justify-between border-b border-ink/8 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Закрыть" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5">
            <Close size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink/8 px-4 py-4 max-sm:[&>*]:grow sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

type ConfirmState = { text: string; resolve: (ok: boolean) => void } | null;
const ConfirmCtx = createContext<(text: string) => Promise<boolean>>(async () => false);
type Toast = { id: number; text: string; tone: "ok" | "error" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [confirmState, setConfirm] = useState<ConfirmState>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const confirm = useCallback((text: string) => new Promise<boolean>((resolve) => setConfirm({ text, resolve })), []);
  const toast = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 3500);
  }, []);

  const close = (ok: boolean) => {
    confirmState?.resolve(ok);
    setConfirm(null);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      <ToastCtx.Provider value={toast}>
        {children}
        <Modal open={!!confirmState} onClose={() => close(false)} title="Подтвердите действие"
               footer={<><Button onClick={() => close(false)}>Отмена</Button><Button variant="danger" onClick={() => close(true)}>Да, продолжить</Button></>}>
          <p className="whitespace-pre-line text-[15px] text-ink-700">{confirmState?.text}</p>
        </Modal>
        <div className="pointer-events-none fixed bottom-5 right-5 z-[300] flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-2" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id}
                 className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${t.tone === "ok" ? "bg-ink" : "bg-red-600"}`}>
              {t.tone === "ok" ? <Check size={18} className="mt-0.5 shrink-0 text-brand-400" /> : <Close size={18} className="mt-0.5 shrink-0" />}
              <span className="whitespace-pre-line">{t.text}</span>
            </div>
          ))}
        </div>
      </ToastCtx.Provider>
    </ConfirmCtx.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmCtx);
export const useToast = () => useContext(ToastCtx);
