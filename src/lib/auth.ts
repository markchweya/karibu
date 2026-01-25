import "server-only";
import { cookies } from "next/headers";

/* ======================================================
   Arrivo Auth (MVP)
====================================================== */

export type Session = {
  email: string;
  role: "admin" | "security" | "host";
  iat?: number;
  exp?: number;
};

const COOKIE_NAME = "arrivo_session";

/* ------------------------------------------------------
   Token verification (MVP-safe)
------------------------------------------------------ */
export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const t = token.trim();
    let json = t;

    const looksBase64 = /^[A-Za-z0-9\-_]+=*$/.test(t) && t.length > 20;
    if (looksBase64) {
      const normalized = t.replace(/-/g, "+").replace(/_/g, "/");
      json = Buffer.from(normalized, "base64").toString("utf8");
    }

    const parsed = JSON.parse(json) as Session;

    if (!parsed?.email || !parsed?.role) return null;
    if (!["admin", "security", "host"].includes(parsed.role)) return null;

    return parsed;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------
   REQUIRED by src/app/page.tsx
------------------------------------------------------ */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();          //  FIX: cookies() is async
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/* ------------------------------------------------------
   Helpers
------------------------------------------------------ */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
