import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Force Node runtime (needed for crypto + Prisma)
export const runtime = "nodejs";

// Cookie name used for the session
const COOKIE = "arrivo_session";

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Verify password
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Create signed session token (7 days)
    const now = Math.floor(Date.now() / 1000);
    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + 60 * 60 * 24 * 7,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });

    // Set cookie using NextResponse cookie API (works in route handlers)
    res.cookies.set({
      name: COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Login failed." },
      { status: 500 }
    );
  }
}

// Optional: allow quick health check
export async function GET() {
  return NextResponse.json({ ok: true, route: "/api/auth/login" });
}
