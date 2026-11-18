import "@fontsource-variable/manrope";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "404 — MEMOR GROUP" };

export default function GlobalNotFound() {
  return (
    <html lang="ru">
      <body className="flex min-h-screen items-center bg-ink-950 text-white">
        <div className="container-x">
          <p className="stat-num text-9xl text-brand">404</p>
          <h1 className="mt-4 font-display text-4xl font-medium">Страница не найдена</h1>
          <a href="/ru" className="btn-primary mt-8">На главную</a>
        </div>
      </body>
    </html>
  );
}
