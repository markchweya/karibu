// src/lib/karibuSession.ts
import "server-only";

import { cookies, headers } from "next/headers";
import { normKey, s } from "@/lib/karibuUi";

export type HostSession = {
  name: string;
  key: string;
  email: string;
};

function deriveNameFromEmail(email: string): string {
  const e = s(email).toLowerCase();
  if (!e.includes("@")) return "";
  const local = e.split("@")[0];
  if (!local) return "";
  return local.replace(/[._-]+/g, " ").trim() || local;
}

/**
 * Priority:
 * 1 cookies: karibu_host_name / karibu_email / karibu_user
 * 2 headers: x-user-email / x-forwarded-email / x-email
 * 3 fallback: host@usiu.app
 */
export async function getCurrentHost(): Promise<HostSession> {
  const c = await cookies();
  const h = await headers();

  const cookieHostName = s(c.get("karibu_host_name")?.value ?? "");
  const cookieEmail = s(c.get("karibu_email")?.value ?? "");

  let cookieUserEmail = "";
  let cookieUserName = "";

  const rawUser = s(c.get("karibu_user")?.value ?? "");
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser) as {
        email?: unknown;
        name?: unknown;
      };
      cookieUserEmail = s(parsed.email);
      cookieUserName = s(parsed.name);
    } catch {
      // ignore malformed cookie
    }
  }

  const headerEmail =
    s(h.get("x-user-email")) ||
    s(h.get("x-forwarded-email")) ||
    s(h.get("x-email"));

  const email =
    cookieEmail ||
    cookieUserEmail ||
    headerEmail ||
    "host@usiu.app";

  const name =
    cookieHostName ||
    cookieUserName ||
    deriveNameFromEmail(email) ||
    "host";

  return {
    name,
    key: normKey(name),
    email,
  };
}
