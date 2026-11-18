import type { NextConfig } from "next";

// Адрес FastAPI для серверной части Next.js. Браузер ходит на /api и /media того же домена,
// Next.js проксирует их на бэкенд — так cookie админки остаются first-party и CORS не нужен.
const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const isDev = process.env.NODE_ENV !== "production";

// Счётчики из админки (Интеграции → Яндекс Метрика, GA4): их скрипты, отправка данных и служебные фреймы.
const METRIKA = ["https://mc.yandex.ru", "https://mc.yandex.uz", "https://mc.yandex.com"];
const ANALYTICS_SCRIPTS = [...METRIKA, "https://yastatic.net", "https://*.googletagmanager.com"];
const ANALYTICS_CONNECT = [
  ...METRIKA, "https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com",
];

// CSP без nonce: Next.js вставляет inline-скрипты с данными страницы, поэтому 'unsafe-inline' для скриптов
// остаётся (nonce потребовал бы рендерить каждую страницу заново). Главное здесь — запрет встраивания
// во фреймы (кликджекинг админки), <object>, чужих <base> и отправки форм на другие сайты.
// 'unsafe-eval' и ws: нужны только dev-серверу (отладка React, горячая перезагрузка).
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${ANALYTICS_SCRIPTS.join(" ")}`,
  // Inline-стили: style={{…}} в разметке, Leaflet (карты), всплывающие окна карты
  "style-src 'self' 'unsafe-inline'",
  // Картинки: свои (/media), тайлы OpenStreetMap, фото и планировки из CRM (адрес CRM задаётся в админке),
  // пиксели счётчиков. В разработке CRM обычно на http://127.0.0.1.
  `img-src 'self' data: blob: https:${isDev ? " http:" : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' ${ANALYTICS_CONNECT.join(" ")}${isDev ? " ws: wss:" : ""}`,
  `frame-src blob: ${METRIKA.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  // HSTS браузер принимает только по HTTPS; на локальном http он просто игнорируется.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    globalNotFound: true,
  },
  // Ответы /api и /media приходят с бэкенда со своими заголовками (строже: default-src 'none') —
  // при проксировании они перекрывают эти.
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
        { source: "/media/:path*", destination: `${BACKEND}/media/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
