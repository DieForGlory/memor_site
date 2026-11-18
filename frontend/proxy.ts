import { NextResponse, type NextRequest } from "next/server";

const LANGS = ["ru", "uz", "en"] as const;
const DEFAULT_LANG = "ru";
const ADMIN_COOKIE = "memor_admin";

function preferredLang(request: NextRequest): string {
  const saved = request.cookies.get("lang")?.value;
  if (saved && (LANGS as readonly string[]).includes(saved)) return saved;
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if ((LANGS as readonly string[]).includes(code)) return code;
  }
  return DEFAULT_LANG;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Админка: без cookie сразу на вход. Саму cookie проверяет бэкенд на каждом запросе.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname !== "/admin/login" && !request.cookies.has(ADMIN_COOKIE)) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const hasLang = LANGS.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLang) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${preferredLang(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|media|_next|favicon.ico|icon|robots.txt|sitemap.xml|.*\\..*).*)"],
};
