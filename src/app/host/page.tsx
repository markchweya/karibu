import Link from "next/link";
import ToastBar from "@/components/ToastBar";
import type { ReactNode } from "react";
import { hostCreateInvite } from "./actions";
import { readStore, s, todayISO, ms, normKey } from "@/lib/karibuStore";
import HostLiveClient from "./HostLiveClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tone = "slate" | "blue" | "gold" | "green" | "red";

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<string, string> = {
    slate: "border-slate-200/70 bg-white/60 text-slate-700",
    blue: "border-[rgba(32,48,144,0.18)] bg-[rgba(32,48,144,0.06)] text-[#203090]",
    gold: "border-[rgba(240,192,0,0.30)] bg-[rgba(240,192,0,0.10)] text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <span className={["inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur", tones[tone] ?? tones.slate].join(" ")}>
      {children}
    </span>
  );
}

function safeArr<T>(v: any): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function flashMeta(code: string) {
  switch (code) {
    case "created":
      return { tone: "green" as const, title: "Invite created", body: "Share the visitor code with your guest." };
    case "cancelled":
      return { tone: "green" as const, title: "Invite cancelled", body: "This slot is now free again." };
    case "checkout_started":
      return { tone: "blue" as const, title: "Checkout started", body: "Timer started. Visitor has 10 minutes to reach the gate." };
    case "checkout_already":
      return { tone: "gold" as const, title: "Already started", body: "A checkout timer is already running for this visitor." };
    case "visitor_notfound":
      return { tone: "red" as const, title: "Not found", body: "That code is not an active checked-in visitor yet." };
    case "code_missing":
      return { tone: "red" as const, title: "Missing code", body: "Enter the visitor code to start checkout." };
    case "limit":
      return { tone: "red" as const, title: "Daily limit reached", body: "You can only invite up to 4 people per day." };
    default:
      return null;
  }
}

function asDateISO(x: any) {
  const n = ms(x);
  if (!n) return "";
  try {
    return new Date(n).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function getInviteHostName(inv: any) {
  return (inv?.hostName || inv?.host || inv?.host_full_name || "").toString().trim();
}
function getInviteHostKey(inv: any) {
  return (inv?.hostKey || inv?.host_key || "").toString().trim();
}

function Section({ label, title, right, children }: { label: string; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          <div className="mt-2 text-[34px] leading-[1.10] font-semibold tracking-tight text-slate-900">{title}</div>
        </div>
        {right ? <div className="pt-1">{right}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default async function HostPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await Promise.resolve(searchParams as any);

  // ✅ For now we hard-set the logged-in host identity.
  // Later you can replace this with session-derived name/email.
  const hostName = "host";
  const hostEmail = "host@usiu.app";
  const hostKey = normKey(hostName);

  const store = await readStore();
  const invites = safeArr<any>(store?.invites);
  const visitors = safeArr<any>(store?.visitors);
  const checkoutRequests = safeArr<any>(store?.checkoutRequests);

  const today = todayISO();

  const invitesToday = invites
    .filter((i: any) => {
      const forDate = (i?.forDate || "").toString().trim();
      if (forDate) return forDate === today;
      const createdIso = asDateISO(i?.createdAt);
      if (createdIso) return createdIso === today;
      const updatedIso = asDateISO(i?.updatedAt);
      if (updatedIso) return updatedIso === today;
      return true;
    })
    .slice()
    .sort((a: any, b: any) => {
      const ta = a?.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b?.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });

  const invitesTodayNormalized = invitesToday.map((i: any) => {
    const hn = getInviteHostName(i);
    const hk = getInviteHostKey(i);
    if (!hk && hn) i.hostKey = normKey(hn);
    return i;
  });

  const flash = s(sp.flash);
  const guest = s(sp.guest);
  const toast = flash ? flashMeta(flash) : null;

  return (
    <div className="relative min-h-screen text-slate-900">
      {toast ? <ToastBar tone={toast.tone} title={toast.title} body={toast.body + (guest ? ` (${guest})` : "")} ms={5000} /> : null}

      {/* Background (lighter, like Security) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#fbfaf6]" />
        <div className="absolute -top-56 -left-40 h-[760px] w-[760px] rounded-full bg-[rgba(32,48,144,0.08)] blur-[170px]" />
        <div className="absolute -top-64 -right-40 h-[820px] w-[820px] rounded-full bg-[rgba(240,192,0,0.14)] blur-[190px]" />
        <div className="absolute bottom-[-40%] left-[12%] h-[900px] w-[900px] rounded-full bg-[rgba(240,192,0,0.10)] blur-[200px]" />
        <div className="absolute bottom-[-42%] right-[8%] h-[760px] w-[760px] rounded-full bg-[rgba(32,48,144,0.07)] blur-[220px]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_0%,rgba(2,6,23,0.04),transparent_62%)]" />
      </div>

      <header className="relative z-20 border-b border-white/60 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 shadow-sm">
                <span className="h-3 w-3 rounded-full bg-[#F0C000] shadow-[0_10px_35px_rgba(240,192,0,0.40)]" />
              </span>
              <div className="leading-tight">
                <div className="text-[15px] font-semibold">Karibu</div>
                <div className="text-xs text-slate-500">Host Portal</div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 ml-3">
              <Pill tone="blue">USIU</Pill>
              <Pill tone="slate">{hostName}</Pill>
              <Pill tone="gold">{hostEmail}</Pill>
            </div>
          </div>

          <Link
            href="/security"
            className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white"
          >
            Security
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-8">
          <Section label="Create invite" title="Invite a visitor" right={<Pill tone="green">Signed in as {hostName}</Pill>}>
            <p className="max-w-3xl text-[15px] text-slate-600">This shows on Security immediately.</p>

            <form action={hostCreateInvite} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* ✅ Always pass hostName from the logged-in host, no query param, no manual typing */}
              <input type="hidden" name="hostName" value={hostName} />

              <div className="md:col-span-6">
                <Field label="Visitor full name">
                  <input
                    name="visitorName"
                    required
                    placeholder="e.g. Jane Wanjiku"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                  />
                </Field>
              </div>

              <div className="md:col-span-6">
                <Field label="Visitor ID number">
                  <input
                    name="visitorIdNumber"
                    required
                    placeholder="e.g. 12345678"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                  />
                </Field>
              </div>

              <div className="md:col-span-8">
                <Field label="Purpose">
                  <input
                    name="purpose"
                    required
                    placeholder="e.g. Meeting / Admission / Lecture / Delivery"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                  />
                </Field>
              </div>

              <div className="md:col-span-4">
                <Field label="Destination">
                  <input
                    name="destination"
                    placeholder="e.g. Admin block / ICT / Library"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                  />
                </Field>
              </div>

              <div className="md:col-span-12 flex justify-end pt-2">
                <button className="w-full md:w-auto rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.20)] transition hover:shadow-[0_24px_60px_rgba(32,48,144,0.28)]">
                  Create Invite
                </button>
              </div>
            </form>
          </Section>

          <div className="border-t border-white/70" />

          <HostLiveClient
            hostName={hostName}
            hostKey={hostKey}
            invitesToday={invitesTodayNormalized}
            visitors={visitors}
            checkoutRequests={checkoutRequests}
            pollMs={4000}
          />
        </div>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">Karibu Host Portal MVP</div>
      </footer>
    </div>
  );
}
