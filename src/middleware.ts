import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Routes that must not require an active session — the login page itself
// plus the auth API endpoints that create/destroy sessions.
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/signup", "/api/auth/logout", "/api/auth/me"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) return NextResponse.next();

  // API routes get a 401; page navigations get a redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals and static files — only run on real routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
