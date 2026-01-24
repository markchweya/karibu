# bootstrap.ps1  (Run from repo root)
$ErrorActionPreference = "Stop"

function WriteFile($path, $content) {
  $dir = Split-Path $path
  if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [IO.File]::WriteAllText($path, $content, (New-Object Text.UTF8Encoding($false)))
  Write-Host "Wrote $path"
}

# ---------------- Dependencies ----------------
npm i prisma @prisma/client zod bcryptjs lucide-react clsx tailwind-merge
npm i -D ts-node @types/bcryptjs

# ---------------- Prisma ----------------
if (!(Test-Path ".\prisma")) { New-Item -ItemType Directory -Force -Path ".\prisma" | Out-Null }

WriteFile ".\prisma\schema.prisma" @"
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  HOST
  SECURITY
  ADMIN
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  fullName     String
  role         Role
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  hostedVisits Visit[]  @relation("HostVisits")
}

model Visitor {
  id        String   @id @default(cuid())
  fullName  String
  idNumber  String
  email     String?
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  visits    Visit[]
  @@index([idNumber])
}

model Visit {
  id               String   @id @default(cuid())
  code             String   @unique
  status           String
  purpose          String
  destination      String
  numPeople        Int      @default(1)
  vehiclePlate     String?
  questionnaire    Json     @default("{}")
  checkInAt        DateTime?
  checkoutStartAt  DateTime?
  exitConfirmedAt  DateTime?

  visitorId        String
  visitor          Visitor  @relation(fields: [visitorId], references: [id], onDelete: Cascade)

  hostUserId       String?
  host             User?    @relation("HostVisits", fields: [hostUserId], references: [id], onDelete: SetNull)

  createdByUserId  String?
  createdBy        User?    @relation(fields: [createdByUserId], references: [id], onDelete: SetNull)

  events           Event[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([status])
  @@index([checkInAt])
  @@index([checkoutStartAt])
}

model Event {
  id        String   @id @default(cuid())
  type      String
  note      String?
  meta      Json     @default("{}")
  createdAt DateTime @default(now())

  visitId   String
  visit     Visit    @relation(fields: [visitId], references: [id], onDelete: Cascade)

  actorUserId String?
  actorUser   User?    @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([type])
  @@index([createdAt])
}

model Notification {
  id        String   @id @default(cuid())
  role      Role
  title     String
  body      String
  level     String   @default("info")  // info|warn|danger
  visitCode String?
  readAt    DateTime?
  createdAt DateTime @default(now())

  @@index([role, readAt])
  @@index([createdAt])
}
"@

WriteFile ".\prisma\seed.ts" @"
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = "Passw0rd!";
  const hash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: "host@usiu.app" },
    update: {},
    create: { email: "host@usiu.app", fullName: "Host User", role: Role.HOST, passwordHash: hash },
  });

  await prisma.user.upsert({
    where: { email: "security@usiu.app" },
    update: {},
    create: { email: "security@usiu.app", fullName: "Gate Security", role: Role.SECURITY, passwordHash: hash },
  });

  await prisma.user.upsert({
    where: { email: "admin@usiu.app" },
    update: {},
    create: { email: "admin@usiu.app", fullName: "Head of Security", role: Role.ADMIN, passwordHash: hash },
  });

  console.log("Seeded users:");
  console.log("host@usiu.app / Passw0rd!");
  console.log("security@usiu.app / Passw0rd!");
  console.log("admin@usiu.app / Passw0rd!");
}

main()
  .finally(async () => prisma.$disconnect());
"@

WriteFile ".\.env.example" @"
DATABASE_URL="file:./dev.db"
SESSION_SECRET="dev_super_secret_change_me"
"@

if (!(Test-Path ".\.env")) { Copy-Item ".\.env.example" ".\.env" -Force }

# ---------------- App theme + UI ----------------
WriteFile ".\tailwind.config.ts" @"
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        usiu: {
          blue: "#203090",
          navy: "#06124A",
          gold: "#F0C000",
          goldSoft: "#F7D45C",
          ink: "#0B1024",
          glass: "rgba(255,255,255,0.08)",
          stroke: "rgba(255,255,255,0.14)",
        },
      },
      boxShadow: {
        glass: "0 10px 40px rgba(0,0,0,0.35)",
      },
      backdropBlur: { glass: "18px" },
    },
  },
  plugins: [],
};
export default config;
"@

WriteFile ".\src\app\globals.css" @"
@tailwind base;
@tailwind components;
@tailwind utilities;

:root{
  --usiu-blue:#203090;
  --usiu-navy:#06124A;
  --usiu-gold:#F0C000;
  --usiu-ink:#0B1024;
}

html,body{ height:100%; }

body{
  color: rgba(255,255,255,0.92);
  background:
    radial-gradient(1100px 700px at 20% 10%, rgba(32,48,144,0.75), transparent 55%),
    radial-gradient(900px 600px at 85% 20%, rgba(240,192,0,0.35), transparent 55%),
    radial-gradient(900px 700px at 55% 90%, rgba(32,48,144,0.35), transparent 60%),
    linear-gradient(180deg, #050818 0%, #070A1A 40%, #050818 100%);
}

::selection{
  background: rgba(240,192,0,0.32);
}

@layer components{
  .glass{
    @apply bg-usiu-glass border border-usiu-stroke shadow-glass backdrop-blur-glass rounded-2xl;
  }
  .btn{
    @apply inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition;
  }
  .btn-primary{
    background: linear-gradient(135deg, rgba(240,192,0,0.95), rgba(32,48,144,0.95));
    @apply btn text-white shadow-glass hover:opacity-95 active:opacity-90;
  }
  .btn-ghost{
    @apply btn bg-white/5 border border-white/10 hover:bg-white/10;
  }
  .field{
    @apply w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/25;
  }
  .label{
    @apply text-xs uppercase tracking-wider text-white/70;
  }
}
"@

# ---------------- Core libs ----------------
WriteFile ".\src\lib\db.ts" @"
import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
"@

WriteFile ".\src\lib\utils.ts" @"
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export function safeCode(n = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
"@

WriteFile ".\src\lib\auth.ts" @"
import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE = "arrivo_session";
const SECRET = process.env.SESSION_SECRET || "dev_secret_change_me";

type SessionPayload = { uid: string; role: string; email: string; name: string; iat: number };

function sign(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + sig;
}

function verify(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function getSession() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  return verify(t);
}

export async function requireSession() {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}

export async function createSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const payload: SessionPayload = {
    uid: user.id,
    role: user.role,
    email: user.email,
    name: user.fullName,
    iat: Date.now(),
  };
  const token = sign(payload);
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function destroySession() {
  cookies().set(COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
}
"@

WriteFile ".\src\lib\questionnaire.ts" @"
export const inviteQuestionnaire = [
  { key: "itemsCarried", label: "Items carried (brief)", required: true, type: "text" as const },
  { key: "hasLaptop", label: "Carrying a laptop?", required: true, type: "select" as const, options: ["Yes","No"] },
  { key: "meetingType", label: "Meeting type", required: true, type: "select" as const, options: ["Admin","Professor","Staff","Student","Other"] },
  { key: "officeRoom", label: "Office / Room", required: true, type: "text" as const },
  { key: "notes", label: "Notes for security (optional)", required: false, type: "text" as const },
];
"@

# ---------------- Escalation Engine ----------------
WriteFile ".\src\lib\escalation.ts" @"
import { prisma } from "./db";

/**
 * Thresholds in minutes after checkoutStartAt.
 * 10: notify SECURITY
 * 13: notify SECURITY
 * 15: notify SECURITY
 * 16: escalate ADMIN
 */
const thresholds = [
  { min: 10, role: "SECURITY" as const, type: "OVERDUE_10", level: "warn", title: "Visitor overdue (10m)" },
  { min: 13, role: "SECURITY" as const, type: "OVERDUE_13", level: "warn", title: "Visitor overdue (13m)" },
  { min: 15, role: "SECURITY" as const, type: "OVERDUE_15", level: "danger", title: "Visitor overdue (15m)" },
  { min: 16, role: "ADMIN" as const, type: "ESCALATED_16", level: "danger", title: "Escalation: visitor overstayed" },
];

export async function runEscalationSweep() {
  const open = await prisma.visit.findMany({
    where: {
      checkoutStartAt: { not: null },
      exitConfirmedAt: null,
      status: { in: ["HOST_CHECKOUT_STARTED", "OVERDUE_10", "OVERDUE_13", "OVERDUE_15", "ESCALATED_16"] },
    },
    select: { id: true, code: true, checkoutStartAt: true, status: true },
  });

  const now = Date.now();

  for (const v of open) {
    const start = v.checkoutStartAt?.getTime();
    if (!start) continue;
    const elapsedMin = (now - start) / 60000;

    for (const th of thresholds) {
      if (elapsedMin < th.min) continue;

      const already = await prisma.event.findFirst({
        where: { visitId: v.id, type: th.type },
        select: { id: true },
      });
      if (already) continue;

      await prisma.$transaction([
        prisma.event.create({
          data: {
            visitId: v.id,
            type: th.type,
            note: `Elapsed: ${Math.floor(elapsedMin)}m`,
            meta: { elapsedMin },
          },
        }),
        prisma.notification.create({
          data: {
            role: th.role,
            title: th.title,
            body: `Visit ${v.code} has exceeded exit grace period.`,
            level: th.level,
            visitCode: v.code,
          },
        }),
        prisma.visit.update({
          where: { id: v.id },
          data: { status: th.type },
        }),
      ]);
    }
  }
}
"@

# ---------------- UI components ----------------
WriteFile ".\src\components\Shell.tsx" @"
import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Shell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="px-6 pt-7 pb-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-2xl glass grid place-items-center")}>
              <span className="font-black tracking-tight">A</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white/90">Arrivo</div>
              <div className="text-xs text-white/55">USIU Visitor Control</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>

      <main className="px-6 pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="glass p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
              </div>
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
"@

WriteFile ".\src\components\Badge.tsx" @"
import { cn } from "@/lib/utils";

export default function Badge({ children, tone = "neutral" }: { children: any; tone?: "neutral" | "warn" | "danger" | "good" }) {
  const map = {
    neutral: "bg-white/10 border-white/10 text-white/80",
    warn: "bg-usiu-gold/20 border-usiu-gold/25 text-usiu-goldSoft",
    danger: "bg-red-500/15 border-red-500/25 text-red-200",
    good: "bg-emerald-500/15 border-emerald-500/25 text-emerald-200",
  };
  return <span className={cn("inline-flex items-center px-2.5 py-1 rounded-xl text-xs border", map[tone])}>{children}</span>;
}
"@

# ---------------- App router ----------------
WriteFile ".\src\middleware.ts" @"
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
"@

WriteFile ".\src\app\layout.tsx" @"
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arrivo  USIU Visitor Control",
  description: "Invite, check-in, check-out, and overstay escalation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
"@

WriteFile ".\src\app\page.tsx" @"
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const s = await getSession();
  if (!s) redirect("/login");

  if (s.role === "SECURITY") redirect("/security");
  if (s.role === "ADMIN") redirect("/admin");
  redirect("/host");
}
"@

# ---------------- Login ----------------
WriteFile ".\src\app\login\actions.ts" @"
'use server';

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession, destroySession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "Invalid credentials" };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { ok: false, error: "Invalid credentials" };

  await createSession(user.id);
  return { ok: true };
}

export async function logoutAction() {
  destroySession();
  redirect("/login");
}
"@

WriteFile ".\src\app\login\page.tsx" @"
import Shell from "@/components/Shell";
import { loginAction } from "./actions";

export default async function LoginPage() {
  return (
    <Shell
      title="Sign in"
      subtitle="Use the seeded accounts to start. Change auth later when you plug in Supabase."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-5">
          <div className="text-sm text-white/80">
            <div className="font-semibold mb-2">Seeded accounts</div>
            <ul className="space-y-1 text-white/70">
              <li><span className="text-white/85">host@usiu.app</span> / Passw0rd!</li>
              <li><span className="text-white/85">security@usiu.app</span> / Passw0rd!</li>
              <li><span className="text-white/85">admin@usiu.app</span> / Passw0rd!</li>
            </ul>
          </div>
          <div className="mt-4 text-xs text-white/55">
            Theme uses USIU palette (Blue #203090, Gold #F0C000) with glass + gradients.
          </div>
        </div>

        <form action={loginAction} className="glass p-5 space-y-4">
          <div>
            <div className="label">Email</div>
            <input name="email" className="field mt-1" placeholder="you@usiu.app" required />
          </div>
          <div>
            <div className="label">Password</div>
            <input name="password" type="password" className="field mt-1" placeholder="" required />
          </div>

          <button className="btn-primary w-full">Sign in</button>

          <div className="text-xs text-white/60">
            If you mistype, just resubmit. (This MVP keeps it minimal.)
          </div>
        </form>
      </div>
    </Shell>
  );
}
"@

# ---------------- Host: invite + checkout ----------------
WriteFile ".\src\app\host\actions.ts" @"
'use server';

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { safeCode } from "@/lib/utils";
import { runEscalationSweep } from "@/lib/escalation";
import { inviteQuestionnaire } from "@/lib/questionnaire";

function getQ(formData: FormData) {
  const q: Record<string, any> = {};
  for (const item of inviteQuestionnaire) {
    const v = String(formData.get(item.key) || "").trim();
    if (item.required && !v) throw new Error(\`Missing: \${item.label}\`);
    q[item.key] = v;
  }
  return q;
}

export async function hostCreateInvite(formData: FormData) {
  const s = await requireSession();
  if (s.role !== "HOST") throw new Error("FORBIDDEN");

  const fullName = String(formData.get("fullName") || "").trim();
  const idNumber = String(formData.get("idNumber") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const vehiclePlate = String(formData.get("vehiclePlate") || "").trim();
  const numPeople = Number(formData.get("numPeople") || 1);
  const purpose = String(formData.get("purpose") || "").trim();
  const destination = String(formData.get("destination") || "").trim();

  if (!fullName || !idNumber || !purpose || !destination) {
    return { ok: false, error: "Missing required fields." };
  }

  const questionnaire = getQ(formData);

  const code = safeCode(7);

  const visitor = await prisma.visitor.upsert({
    where: { idNumber },
    update: { fullName, email: email || null, phone: phone || null },
    create: { fullName, idNumber, email: email || null, phone: phone || null },
  });

  const visit = await prisma.visit.create({
    data: {
      code,
      status: "PENDING_ARRIVAL",
      purpose,
      destination,
      numPeople: Number.isFinite(numPeople) ? numPeople : 1,
      vehiclePlate: vehiclePlate || null,
      questionnaire,
      visitorId: visitor.id,
      hostUserId: s.uid,
      createdByUserId: s.uid,
      events: { create: [{ type: "INVITE_CREATED", note: "Invite created by host" }] },
    },
    select: { code: true },
  });

  // Email stub (Resend later): store as event for now
  await prisma.event.create({
    data: { visitId: (await prisma.visit.findUnique({ where: { code: visit.code }, select: { id: true } }))!.id, type: "INVITE_SENT", note: "Email stub: visitor invited" },
  });

  return { ok: true, code: visit.code };
}

export async function hostStartCheckout(formData: FormData) {
  const s = await requireSession();
  if (s.role !== "HOST") throw new Error("FORBIDDEN");

  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a visitor code." };

  const visit = await prisma.visit.findUnique({ where: { code } });
  if (!visit) return { ok: false, error: "Visitor not found." };

  // Claim if gate-created without host
  const canClaim = !visit.hostUserId;
  if (visit.hostUserId && visit.hostUserId !== s.uid) return { ok: false, error: "This visit is assigned to a different host." };

  if (!visit.checkInAt) return { ok: false, error: "Visitor has not been checked in by security yet." };
  if (visit.exitConfirmedAt) return { ok: false, error: "Already checked out at gate." };

  await prisma.$transaction([
    prisma.visit.update({
      where: { code },
      data: {
        hostUserId: canClaim ? s.uid : undefined,
        checkoutStartAt: visit.checkoutStartAt ?? new Date(),
        status: "HOST_CHECKOUT_STARTED",
      },
    }),
    prisma.event.create({
      data: { visitId: visit.id, type: "HOST_CHECKOUT", note: "Host initiated checkout (10-min exit clock started)", actorUserId: s.uid },
    }),
  ]);

  // Email stub (Resend later): create event
  await prisma.event.create({
    data: { visitId: visit.id, type: "EXIT_WINDOW_EMAIL", note: "Email stub: 'You have 10 minutes to exit premises'" },
  });

  await runEscalationSweep();
  return { ok: true };
}

export async function hostPulse() {
  await runEscalationSweep();
  return { ok: true };
}
"@

WriteFile ".\src\app\host\page.tsx" @"
import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import Link from "next/link";
import { logoutAction } from "../login/actions";
import { hostPulse } from "./actions";

export default async function HostHome() {
  const s = await requireSession();
  if (s.role !== "HOST") throw new Error("FORBIDDEN");

  await hostPulse();

  const visits = await prisma.visit.findMany({
    where: { OR: [{ hostUserId: s.uid }, { hostUserId: null }] },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { visitor: true },
  });

  return (
    <Shell
      title="Host Portal"
      subtitle="Invite visitors, then start checkout when the meeting ends."
      right={
        <form action={logoutAction}>
          <button className="btn-ghost">Logout</button>
        </form>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Link className="btn-primary" href="/host/invite">Invite visitor</Link>
        <Link className="btn-ghost" href="/host/checkout">Start checkout</Link>
      </div>

      <div className="mt-6 grid gap-3">
        {visits.map(v => (
          <div key={v.id} className="glass p-4 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold">{v.visitor.fullName} <span className="text-white/55">({v.visitor.idNumber})</span></div>
              <div className="text-xs text-white/60 mt-1">
                Code: <span className="text-white/85 font-semibold">{v.code}</span>  {v.destination}  {v.purpose}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={v.exitConfirmedAt ? "good" : v.status.includes("OVERDUE") || v.status.includes("ESCALATED") ? "danger" : v.status === "HOST_CHECKOUT_STARTED" ? "warn" : "neutral"}>
                {v.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs text-white/55">
        Gate-created visits (host not assigned yet) can be claimed by starting checkout using the visitor code.
      </div>
    </Shell>
  );
}
"@

WriteFile ".\src\app\host\invite\page.tsx" @"
import Shell from "@/components/Shell";
import { hostCreateInvite } from "../actions";
import { inviteQuestionnaire } from "@/lib/questionnaire";
import Link from "next/link";

export default function InvitePage() {
  return (
    <Shell
      title="Invite visitor"
      subtitle="Pre-register a visitor. Security will see it instantly on check-in."
      right={<Link href="/host" className="btn-ghost">Back</Link>}
    >
      <form action={hostCreateInvite} className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Invitee details</div>

          <div>
            <div className="label">Full name</div>
            <input name="fullName" className="field mt-1" required />
          </div>

          <div>
            <div className="label">ID / Passport number</div>
            <input name="idNumber" className="field mt-1" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Email (optional)</div>
              <input name="email" className="field mt-1" />
            </div>
            <div>
              <div className="label">Phone (optional)</div>
              <input name="phone" className="field mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Vehicle plate (optional)</div>
              <input name="vehiclePlate" className="field mt-1" />
            </div>
            <div>
              <div className="label">How many people?</div>
              <input name="numPeople" type="number" min="1" defaultValue={1} className="field mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Destination (office)</div>
              <input name="destination" className="field mt-1" placeholder="e.g., Admin Block" required />
            </div>
            <div>
              <div className="label">Purpose</div>
              <input name="purpose" className="field mt-1" placeholder="e.g., Meeting" required />
            </div>
          </div>
        </div>

        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Security questionnaire</div>
          <div className="text-xs text-white/60">This is stored on the visit record so gate + office can see it.</div>

          {inviteQuestionnaire.map((q) => (
            <div key={q.key}>
              <div className="label">
                {q.label}{q.required ? " *" : ""}
              </div>
              {"options" in q ? (
                <select name={q.key} className="field mt-1" required={q.required} defaultValue="">
                  <option value="" disabled>Select</option>
                  {q.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input name={q.key} className="field mt-1" required={q.required} />
              )}
            </div>
          ))}

          <button className="btn-primary w-full mt-2">Create invite</button>

          <div className="text-xs text-white/55">
            After creation, use the host dashboard to see the generated visitor code.
          </div>
        </div>
      </form>
    </Shell>
  );
}
"@

WriteFile ".\src\app\host\checkout\page.tsx" @"
import Shell from "@/components/Shell";
import Link from "next/link";
import { hostStartCheckout } from "../actions";

export default function HostCheckout() {
  return (
    <Shell
      title="Start checkout"
      subtitle="Enter visitor code to start the 10-minute exit clock."
      right={<Link href="/host" className="btn-ghost">Back</Link>}
    >
      <form action={hostStartCheckout} className="glass p-5 max-w-xl">
        <div>
          <div className="label">Visitor code</div>
          <input name="code" className="field mt-1 uppercase tracking-widest" placeholder="e.g., 7H3K2QZ" required />
        </div>
        <button className="btn-primary w-full mt-4">Start checkout clock</button>
        <div className="mt-3 text-xs text-white/60">
          If the gate created this visitor (walk-in), starting checkout will automatically assign the visit to you.
        </div>
      </form>
    </Shell>
  );
}
"@

# ---------------- Security: check-in + check-out + walk-in ----------------
WriteFile ".\src\app\security\actions.ts" @"
'use server';

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { safeCode } from "@/lib/utils";
import { runEscalationSweep } from "@/lib/escalation";

export async function securityCheckIn(formData: FormData) {
  const s = await requireSession();
  if (s.role !== "SECURITY") throw new Error("FORBIDDEN");

  const code = String(formData.get(\"code\") || \"\").trim().toUpperCase();
  const idNumber = String(formData.get(\"idNumber\") || \"\").trim();

  if (!code && !idNumber) return { ok: false, error: \"Enter code or ID number.\" };

  let visit = null;
  if (code) visit = await prisma.visit.findUnique({ where: { code }, include: { visitor: true } });

  if (!visit && idNumber) {
    // if visitor exists, pick most recent pending invite
    const visitor = await prisma.visitor.findFirst({ where: { idNumber } });
    if (visitor) {
      visit = await prisma.visit.findFirst({
        where: { visitorId: visitor.id, status: \"PENDING_ARRIVAL\" },
        orderBy: { createdAt: \"desc\" },
        include: { visitor: true },
      });
    }
  }

  if (!visit) return { ok: false, error: \"No matching invite found. Use Walk-in capture.\" };
  if (visit.checkInAt) return { ok: false, error: \"Already checked in.\" };

  await prisma.$transaction([
    prisma.visit.update({
      where: { id: visit.id },
      data: { checkInAt: new Date(), status: \"CHECKED_IN\" },
    }),
    prisma.event.create({
      data: { visitId: visit.id, type: \"CHECKIN\", note: \"Checked in at gate\", actorUserId: s.uid },
    }),
  ]);

  return { ok: true };
}

export async function securityWalkIn(formData: FormData) {
  const s = await requireSession();
  if (s.role !== \"SECURITY\") throw new Error(\"FORBIDDEN\");

  const fullName = String(formData.get(\"fullName\") || \"\").trim();
  const idNumber = String(formData.get(\"idNumber\") || \"\").trim();
  const email = String(formData.get(\"email\") || \"\").trim();
  const phone = String(formData.get(\"phone\") || \"\").trim();
  const vehiclePlate = String(formData.get(\"vehiclePlate\") || \"\").trim();
  const numPeople = Number(formData.get(\"numPeople\") || 1);
  const purpose = String(formData.get(\"purpose\") || \"\").trim();
  const destination = String(formData.get(\"destination\") || \"\").trim();

  if (!fullName || !idNumber || !purpose || !destination) return { ok: false, error: \"Missing required fields.\" };

  const visitor = await prisma.visitor.upsert({
    where: { idNumber },
    update: { fullName, email: email || null, phone: phone || null },
    create: { fullName, idNumber, email: email || null, phone: phone || null },
  });

  const code = safeCode(7);

  await prisma.visit.create({
    data: {
      code,
      status: \"CHECKED_IN\",
      purpose,
      destination,
      numPeople: Number.isFinite(numPeople) ? numPeople : 1,
      vehiclePlate: vehiclePlate || null,
      visitorId: visitor.id,
      createdByUserId: s.uid,
      checkInAt: new Date(),
      events: { create: [{ type: \"WALKIN_CREATED\", note: \"Captured at gate (walk-in)\", actorUserId: s.uid }] },
    },
  });

  return { ok: true, code };
}

export async function securityConfirmExit(formData: FormData) {
  const s = await requireSession();
  if (s.role !== \"SECURITY\") throw new Error(\"FORBIDDEN\");

  const code = String(formData.get(\"code\") || \"\").trim().toUpperCase();
  if (!code) return { ok: false, error: \"Enter visitor code.\" };

  const visit = await prisma.visit.findUnique({ where: { code } });
  if (!visit) return { ok: false, error: \"Visitor not found.\" };
  if (visit.exitConfirmedAt) return { ok: false, error: \"Already exit-confirmed.\" };

  await prisma.$transaction([
    prisma.visit.update({
      where: { code },
      data: { exitConfirmedAt: new Date(), status: \"EXIT_CONFIRMED\" },
    }),
    prisma.event.create({
      data: { visitId: visit.id, type: \"EXIT_CONFIRMED\", note: \"Exit confirmed at gate\", actorUserId: s.uid },
    }),
  ]);

  return { ok: true };
}

export async function securityPulse() {
  await runEscalationSweep();
  return { ok: true };
}
"@

WriteFile ".\src\app\security\page.tsx" @"
import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import Link from "next/link";
import { logoutAction } from "../login/actions";
import { securityPulse } from "./actions";

export default async function SecurityHome() {
  const s = await requireSession();
  if (s.role !== "SECURITY") throw new Error("FORBIDDEN");

  await securityPulse();

  const overdue = await prisma.visit.findMany({
    where: { checkoutStartAt: { not: null }, exitConfirmedAt: null },
    orderBy: [{ checkoutStartAt: "asc" }],
    take: 12,
    include: { visitor: true },
  });

  const notifs = await prisma.notification.findMany({
    where: { role: "SECURITY", readAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <Shell
      title="Security Portal"
      subtitle="Check in, capture walk-ins, confirm exit, and monitor overstays."
      right={
        <div className="flex items-center gap-2">
          <Link href="/security/checkin" className="btn-primary">Check-in</Link>
          <Link href="/security/walkin" className="btn-ghost">Walk-in</Link>
          <Link href="/security/exit" className="btn-ghost">Exit</Link>
          <form action={logoutAction}><button className="btn-ghost">Logout</button></form>
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-3">Active overstays</div>
          <div className="grid gap-3">
            {overdue.map(v => (
              <div key={v.id} className="glass p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">{v.visitor.fullName} <span className="text-white/55">({v.visitor.idNumber})</span></div>
                  <div className="text-xs text-white/60 mt-1">
                    Code: <span className="text-white/85 font-semibold">{v.code}</span>  {v.destination}
                  </div>
                </div>
                <Badge tone={v.status.includes("ESCALATED") || v.status.includes("OVERDUE_15") ? "danger" : "warn"}>{v.status}</Badge>
              </div>
            ))}
            {overdue.length === 0 ? <div className="text-sm text-white/60">No active overstays.</div> : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Unread alerts</div>
          <div className="grid gap-3">
            {notifs.map(n => (
              <div key={n.id} className="glass p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <Badge tone={n.level === "danger" ? "danger" : "warn"}>{n.level}</Badge>
                </div>
                <div className="text-xs text-white/65 mt-1">{n.body}</div>
                {n.visitCode ? <div className="text-xs text-white/60 mt-2">Visit: <span className="font-semibold text-white/85">{n.visitCode}</span></div> : null}
              </div>
            ))}
            {notifs.length === 0 ? <div className="text-sm text-white/60">No alerts.</div> : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}
"@

WriteFile ".\src\app\security\checkin\page.tsx" @"
import Shell from "@/components/Shell";
import Link from "next/link";
import { securityCheckIn } from "../actions";

export default function CheckInPage() {
  return (
    <Shell title="Gate check-in" subtitle="Verify invite by code or ID number, then check in." right={<Link href="/security" className="btn-ghost">Back</Link>}>
      <form action={securityCheckIn} className="glass p-5 max-w-xl space-y-4">
        <div>
          <div className="label">Visitor code (preferred)</div>
          <input name="code" className="field mt-1 uppercase tracking-widest" placeholder="e.g., 7H3K2QZ" />
        </div>
        <div>
          <div className="label">OR ID / Passport number</div>
          <input name="idNumber" className="field mt-1" placeholder="e.g., A1234567" />
        </div>
        <button className="btn-primary w-full">Confirm check-in</button>
        <div className="text-xs text-white/60">If no invite exists, use Walk-in capture.</div>
      </form>
    </Shell>
  );
}
"@

WriteFile ".\src\app\security\walkin\page.tsx" @"
import Shell from "@/components/Shell";
import Link from "next/link";
import { securityWalkIn } from "../actions";

export default function WalkInPage() {
  return (
    <Shell title="Walk-in capture" subtitle="Create a visitor record at the gate when not pre-invited." right={<Link href="/security" className="btn-ghost">Back</Link>}>
      <form action={securityWalkIn} className="grid lg:grid-cols-2 gap-6">
        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Visitor details</div>
          <div>
            <div className="label">Full name</div>
            <input name="fullName" className="field mt-1" required />
          </div>
          <div>
            <div className="label">ID / Passport number</div>
            <input name="idNumber" className="field mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Email (optional)</div>
              <input name="email" className="field mt-1" />
            </div>
            <div>
              <div className="label">Phone (optional)</div>
              <input name="phone" className="field mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="label">Vehicle plate (optional)</div>
              <input name="vehiclePlate" className="field mt-1" />
            </div>
            <div>
              <div className="label">How many people?</div>
              <input name="numPeople" type="number" min="1" defaultValue={1} className="field mt-1" />
            </div>
          </div>
        </div>

        <div className="glass p-5 space-y-4">
          <div className="text-sm font-semibold">Purpose + destination</div>
          <div>
            <div className="label">Destination (office)</div>
            <input name="destination" className="field mt-1" placeholder="e.g., Admin Block" required />
          </div>
          <div>
            <div className="label">Purpose</div>
            <input name="purpose" className="field mt-1" placeholder="e.g., Meeting / Delivery / Appointment" required />
          </div>

          <button className="btn-primary w-full mt-2">Create + auto check-in</button>

          <div className="text-xs text-white/60">
            This immediately marks the visitor as checked-in and generates a visitor code to be used at the office for checkout start.
          </div>
        </div>
      </form>
    </Shell>
  );
}
"@

WriteFile ".\src\app\security\exit\page.tsx" @"
import Shell from "@/components/Shell";
import Link from "next/link";
import { securityConfirmExit } from "../actions";

export default function ExitPage() {
  return (
    <Shell title="Gate exit confirmation" subtitle="Confirm the visitor has left campus." right={<Link href="/security" className="btn-ghost">Back</Link>}>
      <form action={securityConfirmExit} className="glass p-5 max-w-xl space-y-4">
        <div>
          <div className="label">Visitor code</div>
          <input name="code" className="field mt-1 uppercase tracking-widest" placeholder="e.g., 7H3K2QZ" required />
        </div>
        <button className="btn-primary w-full">Confirm exit</button>
        <div className="text-xs text-white/60">This stops all overstay notifications and closes the visit.</div>
      </form>
    </Shell>
  );
}
"@

# ---------------- Admin ----------------
WriteFile ".\src\app\admin\page.tsx" @"
import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "../login/actions";
import { runEscalationSweep } from "@/lib/escalation";

export default async function AdminHome() {
  const s = await requireSession();
  if (s.role !== "ADMIN") throw new Error("FORBIDDEN");

  await runEscalationSweep();

  const escalated = await prisma.visit.findMany({
    where: { status: "ESCALATED_16", exitConfirmedAt: null },
    orderBy: { checkoutStartAt: "asc" },
    include: { visitor: true },
    take: 20,
  });

  const notifs = await prisma.notification.findMany({
    where: { role: "ADMIN", readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <Shell
      title="Admin  Head Security"
      subtitle="Escalations at +16 minutes and high-priority alerts."
      right={
        <form action={logoutAction}>
          <button className="btn-ghost">Logout</button>
        </form>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-3">Escalated visits</div>
          <div className="grid gap-3">
            {escalated.map(v => (
              <div key={v.id} className="glass p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">{v.visitor.fullName} <span className="text-white/55">({v.visitor.idNumber})</span></div>
                  <div className="text-xs text-white/60 mt-1">
                    Code: <span className="text-white/85 font-semibold">{v.code}</span>  {v.destination}
                  </div>
                </div>
                <Badge tone="danger">{v.status}</Badge>
              </div>
            ))}
            {escalated.length === 0 ? <div className="text-sm text-white/60">No escalations.</div> : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Unread admin alerts</div>
          <div className="grid gap-3">
            {notifs.map(n => (
              <div key={n.id} className="glass p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <Badge tone="danger">{n.level}</Badge>
                </div>
                <div className="text-xs text-white/65 mt-1">{n.body}</div>
                {n.visitCode ? <div className="text-xs text-white/60 mt-2">Visit: <span className="font-semibold text-white/85">{n.visitCode}</span></div> : null}
              </div>
            ))}
            {notifs.length === 0 ? <div className="text-sm text-white/60">No alerts.</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-white/55">
        Thresholds are currently hard-coded to 10/13/15 notify Security and 16 escalate Admin. We’ll make them configurable next.
      </div>
    </Shell>
  );
}
"@

# ---------------- Prisma migrate + seed ----------------
# Ensure DATABASE_URL points to prisma/dev.db relative to prisma folder
# Our .env uses file:./dev.db which Prisma interprets relative to schema.prisma directory, so it becomes prisma/dev.db
npx prisma migrate dev --name init
npx prisma db seed --schema prisma/schema.prisma

Write-Host ""
Write-Host " Arrivo MVP installed."
Write-Host "Run: npm run dev"
