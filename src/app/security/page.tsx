import Link from "next/link";
import ToastBar from "@/components/ToastBar";
import type { ReactNode } from "react";
import { readStore, s, todayISO, fmt, initials, ms } from "@/lib/karibuStore";
import { checkInInviteByCode, checkoutByIdNumber, checkoutByVisitorId, registerWalkin, securityFinalizeCheckout } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchMode = "name" | "id";
type Filter = "active" | "checkedout" | "today" | "all";
type Tone = "slate" | "blue" | "gold" | "green" | "red";

const DESTINATIONS = [
  "Admin",
  "Freida Brown",
  "School of Humanities and Social Sciences",
  "School of Science",
  "Wooden Block",
  "Lilian Beam",
  "Parking Lot A",
  "Parking Lot B",
  "Parking Lot C",
  "Auditorium",
  "Library",
  "Student Hostel",
];

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-white/70 text-slate-700",
    blue: "border-[rgba(32,48,144,0.22)] bg-[rgba(32,48,144,0.08)] text-[#203090]",
    gold: "border-[rgba(240,192,0,0.40)] bg-[rgba(240,192,0,0.14)] text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <span className={["inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur", tones[tone] ?? tones.slate].join(" ")}>
      {children}
    </span>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-white/40 bg-white/75 shadow-[0_26px_80px_rgba(2,6,23,0.10)] backdrop-blur-xl">
      {children}
    </div>
  );
}

function maskPhone(p?: string) {
  if (!p) return "";
  const t = p.replace(/\s+/g, "");
  if (t.length <= 4) return t;
  return " " + t.slice(-4);
}

function flashMeta(code: string) {
  switch (code) {
    case "registered":
      return { tone: "green" as const, title: "Registered", body: "Walk-in visitor registered successfully." };
    case "checked_in":
      return { tone: "green" as const, title: "Checked in", body: "Invite checked in successfully." };
    case "checked_out":
      return { tone: "green" as const, title: "Checked out", body: "Security finalized checkout." };
    case "code_missing":
      return { tone: "red" as const, title: "Missing code", body: "Enter invite code." };
    case "invite_notfound":
      return { tone: "red" as const, title: "Invite not found", body: "No invite matches that code." };
    case "invite_wrongday":
      return { tone: "red" as const, title: "Wrong day", body: "That invite is not valid for today." };
    case "invite_cancelled":
      return { tone: "red" as const, title: "Cancelled invite", body: "This invite was cancelled by the host." };
    case "invite_already":
      return { tone: "red" as const, title: "Already checked in", body: "That invite has already been checked in." };
    case "dup_id":
      return { tone: "red" as const, title: "Duplicate ID", body: "That ID is already active. Check them out first." };
    case "dup_email":
      return { tone: "red" as const, title: "Duplicate Email", body: "That email is already active." };
    case "bad_id":
      return { tone: "red" as const, title: "Invalid ID", body: "ID number is required (min 4 chars)." };
    case "bad_name":
      return { tone: "red" as const, title: "Invalid name", body: "Full name is required." };
    case "bad_dest":
      return { tone: "red" as const, title: "Missing destination", body: "Please select a destination." };
    case "checkout_missing":
      return { tone: "red" as const, title: "Missing visitor", body: "Try checkout again." };
    case "checkout_notfound":
      return { tone: "red" as const, title: "Not found", body: "No active visitor found for that ID." };
    default:
      return null;
  }
}

export default async function SecurityPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const store = await readStore();

  
  const sp = await searchParams;
const q = s(sp.q);
  const mode = (s(sp.mode) as SearchMode) || "name";
  const filter = (s(sp.filter) as Filter) || "active";
  const flash = s(sp.flash);
  const guest = s(sp.guest);
  const toast = flash ? flashMeta(flash) : null;

  const today = todayISO();

  const invitesToday = store.invites.filter((i) => i.forDate === today);
  const pendingInvites = invitesToday.filter((i) => i.status === "pending");

  const all = store.visitors.slice();
  const activeVisitors = all.filter((v) => !v.checkedOutAt);
  const activeCount = activeVisitors.length;
  const activeNames = activeVisitors.slice(0, 4).map((v) => v.fullName);

  // Checkout clocks in progress
  const now = Date.now();
  const checkoutRequested = activeVisitors.filter((v) => !!v.checkoutRequestedAt);

  const checkoutAlerts10 = checkoutRequested.filter((v) => now - ms(v.checkoutRequestedAt!) >= 10 * 60 * 1000);
  const checkoutEscalations12 = checkoutRequested.filter((v) => now - ms(v.checkoutRequestedAt!) >= 12 * 60 * 1000);

  // Filter visitors list
  let filtered = all;
  if (filter === "active") filtered = all.filter((v) => !v.checkedOutAt);
  if (filter === "checkedout") filtered = all.filter((v) => !!v.checkedOutAt);
  if (filter === "today") filtered = all.filter((v) => v.createdAt.slice(0, 10) === today);
  if (filter === "all") filtered = all;

  const needle = q.toLowerCase();
  const searched =
    needle.length === 0
      ? filtered
      : filtered.filter((v) => (mode === "id" ? v.idNumber.toLowerCase().includes(needle) : v.fullName.toLowerCase().includes(needle)));

  const buildHref = (next: Partial<{ q: string; mode: SearchMode; filter: Filter }>) => {
    const params = new URLSearchParams();
    const nq = next.q ?? q;
    const nm = next.mode ?? mode;
    const nf = next.filter ?? filter;
    if (nq) params.set("q", nq);
    if (nm) params.set("mode", nm);
    if (nf) params.set("filter", nf);
    const qs = params.toString();
    return qs ? `/security?${qs}` : "/security";
  };

  return (
    <div className="relative min-h-screen bg-[#f9fafc] text-slate-900">
      {toast ? <ToastBar tone={toast.tone} title={toast.title} body={toast.body + (guest ? ` (${guest})` : "")} ms={5000} /> : null}

      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-[-20%] h-[620px] w-[620px] rounded-full bg-[rgba(32,48,144,0.14)] blur-[120px]" />
        <div className="absolute -top-64 right-[-15%] h-[680px] w-[680px] rounded-full bg-[rgba(240,192,0,0.18)] blur-[140px]" />
        <div className="absolute bottom-[-30%] left-[20%] h-[600px] w-[600px] rounded-full bg-[rgba(32,48,144,0.12)] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_0%,rgba(2,6,23,0.05),transparent_60%)]" />
      </div>

      <header className="relative z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(32,48,144,0.12)]">
                <span className="h-3 w-3 rounded-full bg-[#F0C000] shadow-[0_8px_30px_rgba(240,192,0,0.5)]" />
              </span>
              <div className="leading-tight">
                <div className="text-[15px] font-semibold">Karibu</div>
                <div className="text-xs text-slate-500">Security Desk</div>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-2 ml-2">
              <Pill tone="blue">USIU</Pill>
              <Pill tone="gold">Gate</Pill>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/host" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
              Host Portal
            </Link>
            <Link href="/login" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
              Log out
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-8 space-y-8">

          {/* Notifications (Security) */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notifications</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Checkout clocks</div>
                    <p className="mt-2 text-sm text-slate-600">
                      Host starts checkout  visitor has 10 minutes to reach the gate. If 12 minutes pass, security escalation shows here.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Pill tone={checkoutAlerts10.length ? "gold" : "green"}>{checkoutAlerts10.length} 10-min alerts</Pill>
                    <Pill tone={checkoutEscalations12.length ? "red" : "green"}>{checkoutEscalations12.length} 12-min escalations</Pill>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {checkoutRequested.length === 0 ? (
                  <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-900 shadow-sm backdrop-blur">
                    No active checkout clocks.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {checkoutRequested.map((v) => {
                      const ageMin = Math.floor((now - ms(v.checkoutRequestedAt!)) / 60000);
                      const escalated = ageMin >= 12;
                      const warned = ageMin >= 10;
                      return (
                        <div key={v.id} className={["rounded-[26px] border p-5",
                          escalated
                            ? "border-red-200 bg-red-50"
                            : warned
                            ? "border-[rgba(240,192,0,0.45)] bg-[rgba(240,192,0,0.10)]"
                            : "border-white/40 bg-white/80 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl",
                        ].join(" ")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold">{v.fullName}</div>
                              <div className="mt-1 text-xs text-slate-700/80">
                                Host: <span className="font-semibold">{v.checkoutRequestedBy || v.hostName || "-"}</span>
                              </div>
                            </div>
                            {escalated ? <Pill tone="red">12+ mins</Pill> : warned ? <Pill tone="gold">10+ mins</Pill> : <Pill tone="blue">Clock running</Pill>}
                          </div>

                          <div className="mt-3 text-sm text-slate-800">
                            Started at <span className="font-semibold">{fmt(v.checkoutRequestedAt)}</span>  {ageMin} min ago
                          </div>

                          <div className="mt-4 flex justify-end">
                            <form action={securityFinalizeCheckout}>
                              <input type="hidden" name="visitorId" value={v.id} />
                              <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                                Finalize checkout
                              </button>
                            </form>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardShell>
          </section>

          {/* INVITE CHECK-IN */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Host invites today</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Check-in invited visitors</div>
                  </div>
                  <Pill tone="gold">{pendingInvites.length} pending</Pill>
                </div>
              </div>

              <div className="p-6">
                <form action={checkInInviteByCode} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    name="code"
                    required
                    placeholder="Invite code e.g. 7H3K2QZ"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm uppercase tracking-widest outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                  />
                  <button className="rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.22)] transition hover:shadow-[0_24px_60px_rgba(32,48,144,0.30)]">
                    Check in
                  </button>
                </form>
              </div>
            </CardShell>
          </section>

          {/* WALK-IN REGISTER */}
          <section>
            <CardShell>
              <div className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Register walk-in visitor</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">Gate Entry</div>

                <form action={registerWalkin} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">ID Number</label>
                    <input name="idNumber" required placeholder="e.g. 12345678" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]" />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Full Name</label>
                    <input name="fullName" required placeholder="e.g. Jane Wanjiku" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]" />
                  </div>

                  <div className="md:col-span-5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Destination</label>
                    <select name="destination" required className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]">
                      <option value="">Select destination</option>
                      {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-12 flex justify-end">
                    <button className="w-full md:w-auto rounded-2xl bg-[#F0C000] px-7 py-3.5 text-[15px] font-semibold text-slate-900 shadow-sm transition hover:brightness-[0.98]">
                      Register Visitor
                    </button>
                  </div>
                </form>
              </div>
            </CardShell>
          </section>

          {/* Visitors view (simple: reuse your old view later) */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">View visitors</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Active on campus</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Pill tone="blue">{activeCount} active</Pill>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <form action="/security" method="get" className="flex flex-col gap-3 sm:flex-row">
                  <input type="hidden" name="mode" value={mode} />
                  <input type="hidden" name="filter" value={filter} />
                  <input name="q" defaultValue={q} placeholder={mode === "id" ? "Search by ID" : "Search by name"} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]" />
                  <button className="rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.22)]">
                    Search
                  </button>
                </form>

                <div className="mt-4 max-h-[520px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {searched.map((v) => {
                      const isActive = !v.checkedOutAt;
                      const hasClock = !!v.checkoutRequestedAt;
                      return (
                        <div key={v.id} className="relative overflow-hidden rounded-[26px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl">
                          <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgba(32,48,144,0.35),rgba(240,192,0,0.45),transparent)]" />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{v.fullName}</div>
                              <div className="mt-0.5 text-xs text-slate-500">ID: <span className="font-semibold text-slate-700">{v.idNumber}</span></div>
                            </div>
                            {isActive ? (hasClock ? <Pill tone="gold">Host started checkout</Pill> : <Pill tone="blue">Active</Pill>) : <Pill tone="slate">Checked out</Pill>}
                          </div>

                          <div className="mt-4 space-y-1 text-sm text-slate-700">
                            {v.kind === "invite" ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Host</span>
                                <span className="font-semibold text-slate-800">{v.hostName || ""}</span>
                              </div>
                            ) : null}

                            {v.checkoutRequestedAt ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Checkout started</span>
                                <span className="font-semibold text-slate-800">{fmt(v.checkoutRequestedAt)}</span>
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Destination</span>
                              <span className="font-semibold text-slate-800">{v.destination || ""}</span>
                            </div>
                          </div>

                          {isActive ? (
                            <div className="mt-4 flex justify-end gap-2">
                              <form action={securityFinalizeCheckout}>
                                <input type="hidden" name="visitorId" value={v.id} />
                                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50">
                                  Finalize checkout
                                </button>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardShell>
          </section>

        </div>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">Karibu  Security Desk  MVP</div>
      </footer>
    </div>
  );
}

