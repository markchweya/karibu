import Link from "next/link";
import type { ReactNode } from "react";
import { readStore, s, todayISO, fmt, initials, type Invite, type Visitor } from "@/lib/karibuStore";
import { checkInInviteByCode, checkoutByIdNumber, checkoutByVisitorId, registerWalkin } from "./actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ======================================================
   TYPES (UI)
====================================================== */
type SearchMode = "name" | "id";
type Filter = "active" | "checkedout" | "today" | "all";

/* ======================================================
   DESTINATIONS (same)
====================================================== */
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

/* ======================================================
   UI HELPERS
====================================================== */
function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "blue" | "gold" | "green" | "red";
}) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-white/70 text-slate-700",
    blue: "border-[rgba(32,48,144,0.22)] bg-[rgba(32,48,144,0.08)] text-[#203090]",
    gold: "border-[rgba(240,192,0,0.40)] bg-[rgba(240,192,0,0.14)] text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-700",
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
    <div className="rounded-[28px] border border-white/40 bg-white/75 shadow-[0_26px_80px_rgba(2,6,23,0.10)] backdrop-blur-xl">
      {children}
    </div>
  );
}

function AvatarStack({ names }: { names: string[] }) {
  const show = names.slice(0, 4);
  return (
    <div className="flex -space-x-2">
      {show.length === 0 ? (
        <div className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500">
          0
        </div>
      ) : (
        show.map((n, i) => (
          <div
            key={i}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-[rgba(32,48,144,0.10)] text-[11px] font-bold text-[#203090] shadow-sm"
            title={n}
          >
            {initials(n)}
          </div>
        ))
      )}
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
      return { tone: "green" as const, title: "Checked out", body: "Visitor checkout completed." };

    case "dup_id":
      return { tone: "red" as const, title: "Duplicate ID", body: "That ID is already active. Check them out first." };
    case "dup_email":
      return { tone: "red" as const, title: "Duplicate Email", body: "That email is already active. Try search by name or ID." };

    case "bad_id":
      return { tone: "red" as const, title: "Invalid ID", body: "ID number is required (min 4 chars)." };
    case "bad_name":
      return { tone: "red" as const, title: "Invalid name", body: "Full name is required." };
    case "bad_dest":
      return { tone: "red" as const, title: "Missing destination", body: "Please select a destination." };

    case "code_missing":
      return { tone: "red" as const, title: "Missing code", body: "Enter the invite code from the visitor." };
    case "invite_notfound":
      return { tone: "red" as const, title: "Invite not found", body: "No invite matches that code." };
    case "invite_wrongday":
      return { tone: "red" as const, title: "Wrong day", body: "That invite is not valid for today." };
    case "invite_cancelled":
      return { tone: "red" as const, title: "Cancelled invite", body: "This invite was cancelled by the host." };
    case "invite_already":
      return { tone: "red" as const, title: "Already checked in", body: "That invite has already been checked in." };

    case "checkout_missing":
      return { tone: "red" as const, title: "Missing ID", body: "Please enter an ID number to checkout." };
    case "checkout_notfound":
      return { tone: "red" as const, title: "Not found", body: "No active visitor found for that ID. Try searching by name." };

    default:
      return null;
  }
}

function inviteTone(i: Invite) {
  if (i.status === "checkedin") return "green" as const;
  if (i.status === "cancelled") return "slate" as const;
  return "gold" as const;
}

/* ======================================================
   PAGE
====================================================== */
export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const store = await readStore();

  const q = s(searchParams.q);
  const mode = (s(searchParams.mode) as SearchMode) || "name";
  const filter = (s(searchParams.filter) as Filter) || "active";
  const flash = s(searchParams.flash);

  const today = todayISO();

  // Invites today (pending first)
  const invitesToday = store.invites
    .filter((i) => i.forDate === today)
    .sort((a, b) => {
      const rank = (x: Invite) => (x.status === "pending" ? 0 : x.status === "checkedin" ? 1 : 2);
      return rank(a) - rank(b);
    });

  const pendingInvites = invitesToday.filter((i) => i.status === "pending");
  const checkedInInvites = invitesToday.filter((i) => i.status === "checkedin");

  // Visitors list
  const all = store.visitors.slice();

  const activeVisitors = all.filter((v) => !v.checkedOutAt);
  const activeCount = activeVisitors.length;
  const activeNames = activeVisitors.slice(0, 4).map((v) => v.fullName);

  // Filter
  let filtered: Visitor[] = all;
  if (filter === "active") filtered = all.filter((v) => !v.checkedOutAt);
  if (filter === "checkedout") filtered = all.filter((v) => !!v.checkedOutAt);
  if (filter === "today") filtered = all.filter((v) => v.createdAt.slice(0, 10) === today);
  if (filter === "all") filtered = all;

  // Search
  const needle = q.toLowerCase();
  const searched =
    needle.length === 0
      ? filtered
      : filtered.filter((v) => {
          if (mode === "id") return v.idNumber.toLowerCase().includes(needle);
          return v.fullName.toLowerCase().includes(needle);
        });

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

  const toast = flash ? flashMeta(flash) : null;

  return (
    <div className="relative min-h-screen bg-[#f9fafc] text-slate-900">
      {/* cinematic wash */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-[-20%] h-[620px] w-[620px] rounded-full bg-[rgba(32,48,144,0.14)] blur-[120px]" />
        <div className="absolute -top-64 right-[-15%] h-[680px] w-[680px] rounded-full bg-[rgba(240,192,0,0.18)] blur-[140px]" />
        <div className="absolute bottom-[-30%] left-[20%] h-[600px] w-[600px] rounded-full bg-[rgba(32,48,144,0.12)] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_0%,rgba(2,6,23,0.05),transparent_60%)]" />
      </div>

      {/* header */}
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
            <Link
              href="/host"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50"
            >
              Host Portal
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50"
            >
              Log out
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-8 space-y-8">
          {/* TOAST */}
          {toast ? (
            <div
              className={[
                "rounded-[22px] border px-5 py-4 shadow-sm backdrop-blur",
                toast.tone === "green"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{toast.title}</div>
                  <div className="mt-1 text-sm opacity-90">{toast.body}</div>
                </div>
                <Link
                  href="/security"
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-white"
                >
                  Dismiss
                </Link>
              </div>
            </div>
          ) : null}

          {/* INVITES TODAY */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Host invites today
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Check-in invited visitors</div>
                    <p className="mt-2 text-sm text-slate-600">
                      Visitor arrives  Security checks them in using the invite code.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Pill tone="gold">{pendingInvites.length} pending</Pill>
                    <Pill tone="green">{checkedInInvites.length} checked in</Pill>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Check-in by code */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
                  <div className="lg:col-span-8">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Check-in</div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">Enter invite code</div>

                    <form action={checkInInviteByCode} className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        name="code"
                        required
                        placeholder="e.g. 7H3K2QZ"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm uppercase tracking-widest outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                      />
                      <button className="rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.22)] transition hover:shadow-[0_24px_60px_rgba(32,48,144,0.30)]">
                        Check in
                      </button>
                    </form>

                    <div className="mt-2 text-xs text-slate-600">
                      The visitor should show the code that the host shared with them.
                    </div>
                  </div>

                  <div className="lg:col-span-4">
                    <div className="rounded-[22px] border border-[rgba(240,192,0,0.45)] bg-[rgba(240,192,0,0.10)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700/80">
                        Quick stats
                      </div>
                      <div className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Today</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill tone="gold">{invitesToday.length} invites</Pill>
                        <Pill tone="blue">{pendingInvites.length} pending</Pill>
                        <Pill tone="green">{checkedInInvites.length} checked in</Pill>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Invite list */}
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Invites</div>
                    <Pill tone="blue">{invitesToday.length} shown</Pill>
                  </div>

                  <div className="mt-3 max-h-[420px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {invitesToday.length === 0 ? (
                        <div className="sm:col-span-2 rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                          No host invites yet today.
                        </div>
                      ) : (
                        invitesToday.map((i) => (
                          <div
                            key={i.id}
                            className="relative overflow-hidden rounded-[26px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl"
                          >
                            <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgba(32,48,144,0.35),rgba(240,192,0,0.45),transparent)]" />

                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{i.visitorName}</div>
                                <div className="mt-0.5 truncate text-xs text-slate-500">
                                  Host: <span className="font-semibold text-slate-700">{i.hostName}</span>
                                </div>
                              </div>
                              <Pill tone={inviteTone(i)}>
                                {i.status === "pending" ? "Pending" : i.status === "checkedin" ? "Checked in" : "Cancelled"}
                              </Pill>
                            </div>

                            <div className="mt-4 space-y-1 text-sm text-slate-700">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Code</span>
                                <span className="font-semibold text-slate-800 tracking-widest">{i.code}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">ID</span>
                                <span className="font-semibold text-slate-800">{i.visitorIdNumber}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Purpose</span>
                                <span className="font-semibold text-slate-800 text-right">{i.purpose}</span>
                              </div>
                              {i.destination ? (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-slate-500">Destination</span>
                                  <span className="font-semibold text-slate-800 text-right">{i.destination}</span>
                                </div>
                              ) : null}
                            </div>

                            {i.status === "pending" ? (
                              <div className="mt-4 flex items-center justify-end gap-2">
                                <form action={checkInInviteByCode}>
                                  <input type="hidden" name="code" value={i.code} />
                                  <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                                    Check in
                                  </button>
                                </form>
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardShell>
          </section>

          {/* WALK-IN REGISTER (same as your UI) */}
          <section>
            <CardShell>
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Register walk-in visitor
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Gate Entry</div>
                    <p className="mt-2 text-sm text-slate-600 max-w-xl">
                      Walk-ins are auto-approved at the gate. Duplicate ID or email (active) is blocked.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Pill tone="gold">
                      <span className="h-2 w-2 rounded-full bg-[#F0C000]" />
                      Auto-approved
                    </Pill>
                    <Pill tone="blue">USIU</Pill>
                  </div>
                </div>

                <form action={registerWalkin} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      ID Number
                    </label>
                    <input
                      name="idNumber"
                      required
                      placeholder="e.g. 12345678"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Full Name
                    </label>
                    <input
                      name="fullName"
                      required
                      placeholder="e.g. Jane Wanjiku"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Destination
                    </label>
                    <select
                      name="destination"
                      required
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    >
                      <option value="">Select destination</option>
                      {DESTINATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-6">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Email (optional)
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="name@email.com"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-6">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Phone (optional)
                    </label>
                    <input
                      name="phone"
                      placeholder="+2547"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
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

          {/* View Visitors (your existing section kept) */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">View visitors</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Active on campus</div>
                    <p className="mt-2 text-sm text-slate-600">Search inside this section. Checkout is also here.</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <AvatarStack names={activeNames} />
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-2 shadow-sm backdrop-blur">
                      <span className="text-sm font-semibold text-slate-700">Active</span>
                      <span className="grid h-8 min-w-[36px] place-items-center rounded-full bg-[#203090] text-sm font-bold text-white shadow-[0_12px_30px_rgba(32,48,144,0.28)]">
                        {activeCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
                  {/* SEARCH */}
                  <div className="lg:col-span-8">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Search visitor
                        </div>
                        <div className="mt-1 text-lg font-semibold tracking-tight">
                          Find by {mode === "id" ? "ID" : "Name"}
                        </div>
                      </div>

                      <div className="rounded-full border border-slate-200 bg-white/70 p-1 shadow-sm backdrop-blur">
                        <Link
                          href={buildHref({ mode: "name" })}
                          className={[
                            "inline-flex rounded-full px-4 py-2 text-sm font-semibold transition",
                            mode === "name" ? "bg-[#203090] text-white shadow-sm" : "text-slate-700 hover:bg-white",
                          ].join(" ")}
                        >
                          Name
                        </Link>
                        <Link
                          href={buildHref({ mode: "id" })}
                          className={[
                            "inline-flex rounded-full px-4 py-2 text-sm font-semibold transition",
                            mode === "id" ? "bg-[#203090] text-white shadow-sm" : "text-slate-700 hover:bg-white",
                          ].join(" ")}
                        >
                          ID
                        </Link>
                      </div>
                    </div>

                    <form action="/security" method="get" className="mt-4 space-y-3">
                      <input type="hidden" name="mode" value={mode} />
                      <input type="hidden" name="filter" value={filter} />

                      <div className="relative">
                        <input
                          name="q"
                          defaultValue={q}
                          placeholder={mode === "id" ? "Search by ID number" : "Search by full name"}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                        />
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          {mode === "id" ? "ID" : "NAME"}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.22)] transition hover:shadow-[0_24px_60px_rgba(32,48,144,0.30)]">
                          Search
                        </button>

                        {(["active", "checkedout", "today", "all"] as Filter[]).map((f) => (
                          <Link key={f} href={buildHref({ filter: f })}>
                            <span
                              className={[
                                "rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition",
                                filter === f
                                  ? "border-[rgba(32,48,144,0.25)] bg-[rgba(32,48,144,0.10)] text-[#203090]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              {f === "checkedout" ? "Checked out" : f[0].toUpperCase() + f.slice(1)}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </form>
                  </div>

                  {/* CHECKOUT */}
                  <div className="lg:col-span-4">
                    <div className="rounded-[22px] border border-[rgba(240,192,0,0.45)] bg-[rgba(240,192,0,0.10)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700/80">Checkout</div>
                      <div className="mt-1 text-lg font-semibold tracking-tight text-slate-900">End a visit by ID</div>

                      <form action={checkoutByIdNumber} className="mt-3 flex gap-2">
                        <input
                          name="idNumber"
                          placeholder="ID number"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                          required
                        />
                        <button className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                          Checkout
                        </button>
                      </form>

                      <div className="mt-2 text-xs text-slate-700/70">If not found, search by name.</div>
                    </div>
                  </div>
                </div>

                {/* Results grid */}
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Results</div>
                    <Pill tone="blue">{searched.length} shown</Pill>
                  </div>

                  <div className="mt-3 max-h-[520px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {searched.map((v) => {
                        const isActive = !v.checkedOutAt;
                        return (
                          <div
                            key={v.id}
                            className="relative overflow-hidden rounded-[26px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl"
                          >
                            <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgba(32,48,144,0.35),rgba(240,192,0,0.45),transparent)]" />

                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(32,48,144,0.10)] text-[#203090] font-bold">
                                  {initials(v.fullName)}
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold">{v.fullName}</div>
                                  <div className="mt-0.5 truncate text-xs text-slate-500">
                                    ID: <span className="font-semibold text-slate-700">{v.idNumber}</span>
                                  </div>
                                </div>
                              </div>

                              {isActive ? <Pill tone="gold">Active</Pill> : <Pill tone="slate">Checked out</Pill>}
                            </div>

                            <div className="mt-4 space-y-1 text-sm text-slate-700">
                              {v.kind === "invite" ? (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-slate-500">Host</span>
                                  <span className="font-semibold text-slate-800 text-right">{v.hostName || ""}</span>
                                </div>
                              ) : null}

                              {v.purpose ? (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-slate-500">Purpose</span>
                                  <span className="font-semibold text-slate-800 text-right">{v.purpose}</span>
                                </div>
                              ) : null}

                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Destination</span>
                                <span className="font-semibold text-slate-800 text-right">{v.destination || ""}</span>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Contact</span>
                                <span className="text-right text-slate-800">
                                  {v.email || ""}
                                  {v.phone ? (v.email ? "  " : "") + maskPhone(v.phone) : ""}
                                </span>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Created</span>
                                <span className="text-right text-slate-800">{fmt(v.createdAt)}</span>
                              </div>

                              {v.checkedOutAt ? (
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-slate-500">Checked out</span>
                                  <span className="text-right font-semibold text-slate-800">{fmt(v.checkedOutAt)}</span>
                                </div>
                              ) : null}
                            </div>

                            {isActive ? (
                              <div className="mt-4 flex items-center justify-end gap-2">
                                <form action={checkoutByVisitorId}>
                                  <input type="hidden" name="visitorId" value={v.id} />
                                  <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                                    Checkout
                                  </button>
                                </form>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}

                      {searched.length === 0 ? (
                        <div className="sm:col-span-2">
                          <div className="rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                            No visitors to show for this filter.
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </CardShell>
          </section>
        </div>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">
          Karibu  Security Desk  MVP
        </div>
      </footer>
    </div>
  );
}
