"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function loginAction(_: any, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/login`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    }
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || "Login failed" };
  }

  return { ok: true };
}

export async function logoutAction() {
  const jar = await cookies(); // MUST await

  jar.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    expires: new Date(0),
  });

  redirect("/login");
}
