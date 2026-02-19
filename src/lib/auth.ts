import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Session = {
  email: string;
  role: "admin" | "security" | "host";
  iat?: number;
  exp?: number;
};

const COOKIE_NAME = "arrivo_session";

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return null;

    const payloadPart = parts[1];

    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(normalized, "base64").toString("utf8");

    const parsed = JSON.parse(json);

    if (!parsed?.email || !parsed?.role) return null;
    const normalizedRole = String(parsed.role).toLowerCase();

    if (!["admin", "security", "host"].includes(normalizedRole)) return null;

    return {
      email: parsed.email,
      role: normalizedRole as Session["role"],
      iat: parsed.iat,
      exp: parsed.exp,
    } as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session as Session;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
