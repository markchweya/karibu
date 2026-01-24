"use server";

export async function loginAction(_: any, formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    return { ok: false, error: data?.error || "Login failed" };
  }

  return { ok: true };
}
