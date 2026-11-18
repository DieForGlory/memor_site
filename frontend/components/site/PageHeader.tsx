import Link from "next/link";

import { Accent } from "@/lib/typography";

interface Crumb {
  href?: string;
  label: string;
}

export function PageHeader({
  title,
  lead,
  crumbs,
  eyebrow,
  children,
}: {
  title: string;
  lead?: string;
  crumbs?: Crumb[];
  eyebrow?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-ink-950 pb-12 pt-28 text-white sm:pb-16 sm:pt-36 lg:pb-20 lg:pt-44">
      <div aria-hidden="true"
           className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-brand/15 blur-[110px]" />
      <div className="container-x relative">
        {crumbs && (
          <nav aria-label="Breadcrumbs" className="mb-6 flex flex-wrap items-center gap-x-2 text-sm text-white/50 sm:mb-8">
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                {c.href ? (
                  <Link href={c.href} className="inline-block py-1.5 hover:text-white">{c.label}</Link>
                ) : (
                  <span className="text-white/80">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            <h1 className="display-title"><Accent text={title} tone="dark" /></h1>
            {lead && <p className="mt-5 text-base leading-relaxed text-white/65 sm:mt-6 sm:text-lg">{lead}</p>}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  index,
  title,
  tone = "light",
  action,
}: {
  eyebrow?: string;
  /** Номер раздела на странице: «01», «02»… */
  index?: string;
  title: string;
  tone?: "light" | "dark";
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <Eyebrow index={index} text={eyebrow} />}
        <h2 className={`section-title mt-5 ${tone === "dark" ? "text-white" : "text-ink"}`}>
          <Accent text={title} tone={tone} />
        </h2>
      </div>
      {action}
    </div>
  );
}

/** Надзаголовок раздела: номер курсивом антиквы, черта и подпись капителью. */
export function Eyebrow({ index, text, className = "" }: { index?: string; text: string; className?: string }) {
  return (
    <p className={`eyebrow flex items-center gap-3 ${className}`}>
      {index && (
        <>
          <span className="font-display text-[17px] font-medium normal-case italic tracking-normal">{index}</span>
          <span aria-hidden="true" className="h-px w-8 bg-current opacity-50" />
        </>
      )}
      {text}
    </p>
  );
}
