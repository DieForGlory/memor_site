/**
 * Знак MEMOR GROUP: контур городской застройки из оригинального логотипа, перерисованный в вектор.
 * Цвет контура — текущий (currentColor), поэтому знак работает и на тёмном, и на светлом фоне.
 * TODO: заменить на векторный логотип от заказчика, когда он будет.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 184 172" className={className} aria-hidden="true" fill="none" stroke="currentColor"
         strokeWidth={9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 168h11V84h17V34h10v75h20" />
      <path d="M68 108V57h32l1 51" />
      <path d="M112 108V23l23-21 28 26v94h10v46h8" />
      <path d="M62 168h56" />
    </svg>
  );
}

export function Logo({ tone = "light", className = "" }: { tone?: "light" | "dark"; className?: string }) {
  const text = tone === "light" ? "text-white" : "text-ink";
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark className="h-9 w-9 text-brand" />
      <span className={`flex flex-col leading-none ${text}`}>
        <span className="font-display text-[22px] font-bold tracking-[0.05em]">MEMOR</span>
        <span className="mt-0.5 text-[9.5px] font-semibold tracking-[0.5em] opacity-70">GROUP</span>
      </span>
    </span>
  );
}
