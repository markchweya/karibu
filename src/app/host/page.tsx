import Link from "next/link";
import ToastBar from "@/components/ToastBar";
import type { ReactNode } from "react";
import { hostCreateInvite } from "./actions";
import { readStore, s, todayISO, normKey, ms } from "@/lib/karibuStore";
import HostLiveClient from "./HostLiveClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tone = "slate" | "blue" | "gold" | "green" | "red";

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<string, string> = {
    slate: "border-white/50 bg-white/70 text-slate-700",
    blue: "border-[rgba(32,48,144,0.18)] bg-[rgba(32,48,144,0.07)] text-[#203090]",
    gold: "border-[rgba(240,192,0,0.35)] bg-[rgba(240,192,0,0.13)] text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur",
        tones[tone] ?? tones.slate,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-white/40 bg-white/70 shadow-[0_26px_80px_rgba(2,6,23,0.10)] backdrop-blur-xl">
      {children}
    </div>
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

function hrefHost(host: string) {
  return host ? `/host?host=${encodeURIComponent(host)}` : "/host";
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

function getVisitorHostName(v: any) {
  return (v?.hostName || v?.host || v?.host_full_name || "").toString().trim();
}

function getVisitorHostKey(v: any) {
  return (v?.hostKey || v?.host_key || "").toString().trim();
}

function getVisitorCode(v: any) {
  return (v?.inviteCode || v?.code || v?.visitorCode || v?.passCode || "").toString().trim().toUpperCase();
}

function isCheckedOut(v: any) {
  return Boolean(v?.checkedOutAt || v?.checkoutAt || v?.checked_out_at || v?.checkedOut);
}

function isInviteVisitor(v: any) {
  const k = (v?.kind || v?.type || "").toString().toLowerCase();
  if (!k) return true;
  return k === "invite" || k === "invited" || k === "invitation";
}

function getReqHostKey(r: any) {
  return (r?.hostKey || "").toString().trim();
}

function getReqHostName(r: any) {
  return (r?.hostName || "").toString().trim();
}

function getReqCode(r: any) {
  return (r?.inviteCode || r?.code || r?.visitorCode || "").toString().trim().toUpperCase();
}

export default async function HostPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await Promise.resolve(searchParams as any);

  const store = await readStore();
  const invites = safeArr<any>(store?.invites);
  const visitors = safeArr<any>(store?.visitors);
  const checkoutRequests = safeArr<any>(store?.checkoutRequests);

  const rawHost = s(sp.host);
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

  const hostsToday = Array.from(
    new Map(
      invitesToday
        .map((i: any) => getInviteHostName(i))
        .filter(Boolean)
        .map((name: string) => [normKey(name), name] as const)
    ).values()
  );

  const host = rawHost || (hostsToday.length === 1 ? hostsToday[0] : "");
  const hostKey = host ? normKey(host) : "";

  const flash = s(sp.flash);
  const guest = s(sp.guest);
  const toast = flash ? flashMeta(flash) : null;

  const activeVisitsMine = hostKey
    ? visitors.filter((v: any) => {
        const hk = getVisitorHostKey(v);
        const hn = getVisitorHostName(v);
        const matchesHost = (hk && hk === hostKey) || normKey(hn || "") === hostKey;
        if (!matchesHost) return false;
        if (!isInviteVisitor(v)) return false;
        if (isCheckedOut(v)) return false;
        return true;
      })
    : [];

  const activeCodes = new Set<string>(activeVisitsMine.map((v: any) => getVisitorCode(v)).filter(Boolean));

  const now = Date.now();
  const hostReminders = hostKey
    ? checkoutRequests
        .filter(
          (r: any) =>
            r?.status === "requested" &&
            ((getReqHostKey(r) && getReqHostKey(r) === hostKey) || normKey(getReqHostName(r)) === hostKey)
        )
        .filter((r: any) => activeCodes.has(getReqCode(r)))
        .filter((r: any) => now - ms(r?.requestedAt) >= 10 * 60 * 1000)
    : [];

  return (
    <div className="relative min-h-screen text-slate-900">
      {toast ? <ToastBar tone={toast.tone} title={toast.title} body={toast.body + (guest ? ` (${guest})` : "")} ms={5000} /> : null}

      {/* Background like Security (soft cream + gold + blue) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[#f8f6f1]" />
        <div className="absolute -top-52 -left-24 h-[620px] w-[620px] rounded-full bg-[rgba(32,48,144,0.12)] blur-[120px]" />
        <div className="absolute -top-56 -right-32 h-[720px] w-[720px] rounded-full bg-[rgba(240,192,0,0.18)] blur-[140px]" />
        <div className="absolute bottom-[-35%] left-[18%] h-[720px] w-[720px] rounded-full bg-[rgba(240,192,0,0.12)] blur-[160px]" />
        <div className="absolute bottom-[-40%] right-[10%] h-[640px] w-[640px] rounded-full bg-[rgba(32,48,144,0.10)] blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_0%,rgba(2,6,23,0.06),transparent_60%)]" />
      </div>

      <header className="relative z-20 border-b border-white/40 bg-white/65 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Link href={hrefHost(host)} className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/70 shadow-sm">
                <span className="h-3 w-3 rounded-full bg-[#F0C000] shadow-[0_10px_35px_rgba(240,192,0,0.45)]" />
              </span>
              <div className="leading-tight">
                <div className="text-[15px] font-semibold">Karibu</div>
                <div className="text-xs text-slate-500">Host Portal</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-3">
              <Pill tone="blue">USIU</Pill>
              <Pill tone="gold">{host ? "Host" : "Pick host"}</Pill>
              {host ? <Pill tone="slate">{host}</Pill> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={host ? `/security?host=${encodeURIComponent(host)}` : "/security"}
              className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white"
            >
              Security
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-8 space-y-8">
          {/* Host picker */}
          {!host ? (
            <section>
              <CardShell>
                <div className="p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Select host</div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">Who are you</div>
                  <p className="mt-2 text-sm text-slate-600">
                    Your invites are already saved and Security can see them. To load your contact cards, pick your host name below.
                  </p>

                  {hostsToday.length === 0 ? (
                    <div className="mt-5 rounded-[26px] border border-white/50 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                      No invites exist yet today.
                    </div>
                  ) : (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {hostsToday.map((h) => (
                        <Link
                          key={h}
                          href={`/host?host=${encodeURIComponent(h)}`}
                          className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-white"
                        >
                          {h}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </CardShell>
            </section>
          ) : null}

          {/* Create invite (kept) */}
          <section>
            <CardShell>
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Create invite</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Invite a visitor</div>
                    <div className="mt-2 text-sm text-slate-600">This shows on Security immediately.</div>
                  </div>
                  <div className="mt-1">{host ? <Pill tone="green">Active host: {host}</Pill> : <Pill tone="gold">No host selected</Pill>}</div>
                </div>

                <form action={hostCreateInvite} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Host name</label>
                    <input
                      name="hostName"
                      required
                      defaultValue={host || ""}
                      placeholder="e.g. Mr. Otieno"
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visitor full name</label>
                    <input
                      name="visitorName"
                      required
                      placeholder="e.g. Jane Wanjiku"
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visitor ID number</label>
                    <input
                      name="visitorIdNumber"
                      required
                      placeholder="e.g. 12345678"
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                    />
                  </div>

                  <div className="md:col-span-8">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Purpose</label>
                    <input
                      name="purpose"
                      required
                      placeholder="e.g. Meeting / Admission / Lecture / Delivery"
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Destination</label>
                    <input
                      name="destination"
                      placeholder="e.g. Admin block / ICT / Library"
                      className="mt-2 w-full rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.35)] focus:ring-4 focus:ring-[rgba(32,48,144,0.10)]"
                    />
                  </div>

                  <div className="md:col-span-12 flex justify-end">
                    <button className="w-full md:w-auto rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.20)] transition hover:shadow-[0_24px_60px_rgba(32,48,144,0.28)]">
                      Create Invite
                    </button>
                  </div>
                </form>
              </div>
            </CardShell>
          </section>

          {/* Live client section */}
          <HostLiveClient
            host={host}
            hostKey={hostKey}
            invitesToday={invitesToday}
            visitors={visitors}
            checkoutRequests={checkoutRequests}
            pollMs={6000}
          />

          {/* Reminders count stays available for UI (if you use it inside HostLiveClient later) */}
          <div className="hidden">{hostReminders.length}</div>
        </div>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">Karibu Host Portal MVP</div>
      </footer>
    </div>
  );
}
