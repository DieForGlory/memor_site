import Link from "next/link";

import { LogoMark } from "@/components/Logo";

// not-found не получает params, поэтому текст на трёх языках сразу.
export default function NotFound() {
  return (
    <section className="flex min-h-[80svh] items-center bg-ink-950 pt-24 text-white">
      <div className="container-x flex flex-col items-start gap-6">
        <LogoMark className="h-16 w-16 text-brand" />
        <p className="stat-num text-[120px] italic text-brand">404</p>
        <h1 className="font-display text-3xl font-medium sm:text-4xl">Страница не найдена · Sahifa topilmadi · Page not found</h1>
        <div className="flex flex-wrap gap-3">
          <Link href="/ru" className="btn-primary">На главную</Link>
          <Link href="/uz" className="btn-ghost-light">Bosh sahifa</Link>
          <Link href="/en" className="btn-ghost-light">Home</Link>
        </div>
      </div>
    </section>
  );
}
