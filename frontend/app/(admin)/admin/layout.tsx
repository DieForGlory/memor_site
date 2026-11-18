import "@fontsource-variable/manrope";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/playfair-display/wght-italic.css";
import "../../globals.css";

import type { Metadata } from "next";

import { AdminProviders } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: { default: "Админка — MEMOR GROUP", template: "%s — админка MEMOR GROUP" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#f6f5f3]">
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  );
}
