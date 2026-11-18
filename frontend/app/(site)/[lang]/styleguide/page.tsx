import type { Metadata } from "next";

import { ArrowRight, ArrowUpRight, Camera, Check, Clock, Close, Grid, Mail, MapIcon, Menu, Phone, Pin, ServiceIcon } from "@/components/icons";
import { Logo, LogoMark } from "@/components/Logo";
import { ProjectCard, StatusBadge } from "@/components/site/ProjectCard";
import { getHome, getSite } from "@/lib/api";
import { getDict } from "@/lib/i18n";
import { Accent, StatValue } from "@/lib/typography";
import type { Lang } from "@/lib/types";

// Служебная страница: визуальная дизайн-система сайта. Не индексируется и не стоит в меню.
export const metadata: Metadata = { title: "Дизайн-система", robots: { index: false, follow: false } };

const COLORS = [
  { name: "Brand", token: "brand", hex: "#F37F3B", cls: "bg-brand" },
  { name: "Brand 600", token: "brand-600", hex: "#E0672A", cls: "bg-brand-600" },
  { name: "Brand 50", token: "brand-50", hex: "#FEF4EC", cls: "bg-brand-50" },
  { name: "Ink", token: "ink", hex: "#242424", cls: "bg-ink" },
  { name: "Ink 950", token: "ink-950", hex: "#141414", cls: "bg-ink-950" },
  { name: "Ink 800", token: "ink-800", hex: "#2D2D2D", cls: "bg-ink-800" },
  { name: "Ink 500", token: "ink-500", hex: "#6B6B6B", cls: "bg-ink-500" },
  { name: "Ink 300", token: "ink-300", hex: "#B5B5B5", cls: "bg-ink-300" },
  { name: "Sand", token: "sand", hex: "#F4F2EF", cls: "bg-sand" },
  { name: "White", token: "white", hex: "#FFFFFF", cls: "bg-white" },
];

const UI_ICONS = [
  ["ArrowRight", ArrowRight], ["ArrowUpRight", ArrowUpRight], ["Phone", Phone], ["Mail", Mail], ["Pin", Pin],
  ["Clock", Clock], ["Check", Check], ["Close", Close], ["Menu", Menu], ["Grid", Grid], ["Map", MapIcon], ["Camera", Camera],
] as const;

function Block({ title, note, children, dark }: { title: string; note?: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section className={`rounded-[28px] p-10 ${dark ? "bg-ink text-white" : "bg-white"}`}>
      <div className="mb-8 flex items-baseline justify-between gap-6 border-b border-current/10 pb-5">
        <h2 className="text-2xl font-bold">{title}</h2>
        {note && <p className={`text-sm ${dark ? "text-white/50" : "text-ink-400"}`}>{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function StyleguidePage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const [site, home] = await Promise.all([getSite(lang), getHome(lang)]);
  const t = getDict(lang);
  const sample = home.featured.slice(0, 3);
  const service = site.services[1];

  return (
    <div className="bg-sand pb-24 pt-32">
      <div className="container-x space-y-8">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="eyebrow">MEMOR GROUP</p>
            <h1 className="display-title mt-3">Дизайн-система</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-500">
              Цвета, типографика и компоненты сайта. Заголовки — антиква Playfair Display с курсивными акцентами, текст — гротеск Manrope. Акцент — оранжевый, основа — тёмный графит и тёплый светлый фон.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-[22px] bg-ink-950 px-8 py-6"><Logo /></div>
            <div className="rounded-[22px] bg-white px-8 py-6"><Logo tone="dark" /></div>
          </div>
        </div>

        <Block title="Цвета" note="Tailwind-токены из app/globals.css">
          <div className="grid grid-cols-5 gap-5">
            {COLORS.map((c) => (
              <div key={c.token}>
                <div className={`h-28 rounded-2xl border border-ink/10 ${c.cls}`} />
                <p className="mt-3 font-semibold">{c.name}</p>
                <p className="text-sm text-ink-500">{c.hex} · {c.token}</p>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Типографика" note="Playfair Display 400–700 и курсив · Manrope 400–800">
          <div className="space-y-8">
            <div className="grid grid-cols-[220px_1fr] items-baseline gap-8">
              <p className="text-sm text-ink-400">Display · Playfair 76/79 · 500<br />мобильный 40 · акцент курсивом</p>
              <p className="display-title"><Accent text={site.hero_title} /></p>
            </div>
            <div className="grid grid-cols-[220px_1fr] items-baseline gap-8">
              <p className="text-sm text-ink-400">Section · Playfair 56/60 · 500<br />мобильный 32</p>
              <p className="section-title"><Accent text={t.home.projectsTitle} /></p>
            </div>
            <div className="grid grid-cols-[220px_1fr] items-baseline gap-8">
              <p className="text-sm text-ink-400">Card title · Playfair 23–38 · 500</p>
              <p className="card-title text-[30px]">{service?.title}</p>
            </div>
            <div className="grid grid-cols-[220px_1fr] items-baseline gap-8">
              <p className="text-sm text-ink-400">Lead · Manrope 19/31 · 400</p>
              <p className="lead-text max-w-3xl text-ink-700">{site.about_short}</p>
            </div>
            <div className="grid grid-cols-[220px_1fr] items-baseline gap-8">
              <p className="text-sm text-ink-400">Body · Manrope 15/24 · 400</p>
              <p className="max-w-3xl text-[15px] leading-relaxed text-ink-500">{service?.short}</p>
            </div>
            <div className="grid grid-cols-[220px_1fr] items-baseline gap-8">
              <p className="text-sm text-ink-400">Eyebrow · Manrope 12 · 700 · +22%<br />номер — Playfair курсив</p>
              <p className="eyebrow flex items-center gap-3"><span className="font-display text-[17px] font-medium normal-case italic tracking-normal">03</span><span className="h-px w-8 bg-current opacity-50" />{t.home.projectsEyebrow}</p>
            </div>
            <div className="grid grid-cols-[220px_1fr] items-baseline gap-8">
              <p className="text-sm text-ink-400">Цифры · Playfair 46–76 · 500</p>
              <p className="flex gap-12"><span className="stat-num text-[64px]">1996</span><span className="stat-num text-[64px]"><StatValue value="200+" /></span><span className="stat-num text-[64px] italic text-brand">21</span></p>
            </div>
          </div>
        </Block>

        <div className="grid grid-cols-2 gap-8">
          <Block title="Кнопки">
            <div className="flex flex-wrap items-center gap-3">
              <span className="btn-primary">{t.cta.discuss} <ArrowRight size={18} /></span>
              <span className="btn-ghost-dark">{t.cta.allProjects} <ArrowRight size={18} /></span>
              <span className="btn-primary !px-5 !py-2.5 text-sm">{t.cta.request}</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-ink p-6">
              <span className="btn-primary">{t.cta.discuss}</span>
              <span className="btn-ghost-light">{t.cta.viewProjects}</span>
            </div>
          </Block>
          <Block title="Чипы и статусы">
            <div className="flex flex-wrap gap-2">
              <span className="chip border-ink bg-ink text-white">{t.sector.all}</span>
              <span className="chip border-ink/15 bg-white text-ink-700">{t.sector.state}</span>
              <span className="chip border-ink/15 bg-white text-ink-700">{t.sector.commercial}</span>
              <span className="chip border-brand bg-brand text-white">{t.lead.kinds.project}</span>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-ink-800 p-6">
              <StatusBadge status="completed" label="Завершён" />
              <StatusBadge status="in_progress" label="В работе" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium text-white">
                <Camera size={14} /> 16 {t.catalog.photos}
              </span>
            </div>
          </Block>
        </div>

        <Block title="Карточки объектов" note="ProjectCard: 4:5 на десктопе и планшете, 4:3 на телефоне">
          <div className="grid grid-cols-3 gap-5">
            {sample.map((p) => <ProjectCard key={p.id} lang={lang} project={p} photosLabel={t.catalog.photos} />)}
          </div>
        </Block>

        <div className="grid grid-cols-[1fr_1fr] gap-8">
          <Block title="Карточка услуги">
            {service && (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-ink/10 bg-ink/10">
                <div className="flex min-h-[260px] flex-col bg-white p-7">
                  <div className="flex items-start justify-between">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand"><ServiceIcon name={service.icon} size={28} /></span>
                    <span className="text-sm font-semibold text-ink-300">02</span>
                  </div>
                  <h3 className="mt-auto pt-8 text-xl font-bold leading-snug">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-500">{service.short}</p>
                </div>
                <div className="flex min-h-[260px] flex-col bg-ink p-7 text-white">
                  <div className="flex items-start justify-between">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white"><ServiceIcon name={service.icon} size={28} /></span>
                    <span className="text-sm font-semibold text-white/40">hover</span>
                  </div>
                  <h3 className="mt-auto pt-8 text-xl font-bold leading-snug">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">{service.short}</p>
                </div>
              </div>
            )}
          </Block>
          <Block title="Преимущество" dark>
            {home.advantages[0] && (
              <div className="rounded-[24px] border border-white/10 bg-ink-950/50 p-8">
                <span className="text-sm font-bold text-brand">01</span>
                <h3 className="mt-6 text-xl font-bold leading-snug">{home.advantages[0].title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-white/60">{home.advantages[0].text}</p>
              </div>
            )}
          </Block>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <Block title="Поля формы">
            <div className="grid gap-5">
              <label>
                <span className="mb-2 block text-sm font-medium text-ink-500">{t.lead.name} *</span>
                <span className="field block text-ink-400">Иван Иванов</span>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-ink-500">{t.lead.phone} *</span>
                <span className="field block !border-brand">+998 90 123 45 67</span>
              </label>
            </div>
          </Block>
          <Block title="Поля формы на тёмном" dark>
            <div className="grid gap-5">
              <label>
                <span className="mb-2 block text-sm font-medium text-white/70">{t.lead.name} *</span>
                <span className="field block !border-white/10 !bg-white/5 !text-white/40">Иван Иванов</span>
              </label>
              <label>
                <span className="mb-2 block text-sm font-medium text-white/70">{t.lead.message}</span>
                <span className="field block h-24 !border-white/10 !bg-white/5" />
              </label>
            </div>
          </Block>
        </div>

        <Block title="Иконки" note="Линейные, 24×24, обводка 1.7">
          <div className="grid grid-cols-[1fr_auto] gap-10">
            <div className="grid grid-cols-6 gap-4">
              {UI_ICONS.map(([name, Icon]) => (
                <div key={name} className="flex flex-col items-center gap-3 rounded-2xl bg-sand p-5 text-ink">
                  <Icon size={28} />
                  <span className="text-xs text-ink-500">{name}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 content-start gap-4">
              {["design", "crane", "excavator", "network", "roller", "facade", "tree"].map((n) => (
                <div key={n} className="grid h-20 w-20 place-items-center rounded-2xl bg-brand-50 text-brand"><ServiceIcon name={n} size={32} /></div>
              ))}
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-ink-950 text-brand"><LogoMark className="h-10 w-10" /></div>
            </div>
          </div>
        </Block>

        <Block title="Радиусы и отступы">
          <div className="flex items-end gap-6">
            {[["Поле", "rounded-xl", "12"], ["Карточка", "rounded-[22px]", "22"], ["Блок", "rounded-[28px]", "28"], ["Кнопка, чип", "rounded-full", "∞"]].map(([n, r, v]) => (
              <div key={n} className="text-center">
                <div className={`h-24 w-36 border-2 border-brand bg-brand-50 ${r}`} />
                <p className="mt-3 text-sm font-semibold">{n}</p>
                <p className="text-xs text-ink-500">радиус {v}</p>
              </div>
            ))}
            <div className="ml-auto max-w-sm text-sm leading-relaxed text-ink-500">
              Контейнер — 1320 px, поля 32 px (на телефоне 20). Секции — 112 px сверху и снизу на десктопе, 80 на планшете, 64 на телефоне. Сетка карточек — 20 px.
            </div>
          </div>
        </Block>
      </div>
    </div>
  );
}
