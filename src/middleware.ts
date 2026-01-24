import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const isPublic = url.pathname.startsWith("/login") || url.pathname.startsWith("/_next") || url.pathname.startsWith("/favicon");
  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get("arrivo_session")?.value;
  if (!cookie) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};