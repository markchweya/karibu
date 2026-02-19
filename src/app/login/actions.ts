"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function signToken(payload: Record<string, unknown>) {
  const secret = process.env.SESSION_SECRET || "dev_super_secret_change_me";
  const header = { alg: "HS256", typ: "JWT" };

  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();

  return `${data}.${base64url(sig)}`;
}

export async function loginAction(_: any, formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { ok: false, error: "Email and password required" };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    return { ok: false, error: "Invalid credentials" };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid credentials" };
  }

  const now = Math.floor(Date.now() / 1000);
  const role = String(user.role).toLowerCase();

  const token = signToken({
    sub: user.id,
    email: user.email,
    role,
    iat: now,
    exp: now + 60 * 60 * 24 * 7,
  });

  const jar = await cookies();

  jar.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  if (role === "admin") redirect("/admin");
  if (role === "security") redirect("/security");
  if (role === "host") redirect("/host");

  redirect("/login");
}

export async function logoutAction() {
  const jar = await cookies();

  jar.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    expires: new Date(0),
  });

  redirect("/login");
}
