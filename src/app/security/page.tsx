import Link from "next/link";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ======================================================
   TYPES
====================================================== */
type Decision = "pending" | "approved" | "rejected";
type VisitorKind = "invite" | "walkin";
type SearchMode = "name" | "id";
type Filter = "active" | "checkedout" | "today" | "all";

type Visitor = {
  id: string;
  kind: VisitorKind;
  idNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  destination?: string;

  decision: Decision;
  createdAt: string;

  checkedOutAt?: string;
};

type Store = { visitors: Visitor[] };

/* ======================================================
   STORE (MVP JSON)
====================================================== */
const DATA_DIR = path.join(process.cwd(), ".arrivo-data");
const DATA_FILE = path.join(DATA_DIR, "visitors.json");

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (!parsed?.visitors) return { visitors: [] };
    return parsed;
  } catch {
    return { visitors: [] };
  }
}

async function writeStore(store: Store) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

function s(v: unknown) {
  return String(v ?? "").trim();
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmt(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}
function maskPhone(p?: string) {
  if (!p) return "";
  const t = p.replace(/\s+/g, "");
  if (t.length <= 4) return t;
  return " " + t.slice(-4);
}

/* ======================================================
   DESTINATIONS
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
   ACTIONS
====================================================== */
async function registerGuest(formData: FormData) {
  "use server";

  const idNumber = s(formData.get("idNumber"));
  const fullName = s(formData.get("fullName"));
  const email = s(formData.get("email"));
  const phone = s(formData.get("phone"));
  const destination = s(formData.get("destination"));

  if (!idNumber || idNumber.length < 4) return;
  if (!fullName || fullName.length < 2) return;
  if (!destination) return;

  const store = await readStore();

  const v: Visitor = {
    id: randomUUID(),
    kind: "walkin",
    idNumber,
    fullName,
    email: email || undefined,
    phone: phone || undefined,
    destination,
    decision: "approved",
    createdAt: new Date().toISOString(),
  };

  store.visitors.unshift(v);
  await writeStore(store);
  revalidatePath("/security");
}

async function checkoutByIdNumber(formData: FormData) {
  "use server";

  const idNumber = s(formData.get("idNumber"));
  if (!idNumber) return;

  const store = await readStore();
  const v = store.visitors.find((x) => x.idNumber === idNumber && !x.checkedOutAt);
  if (!v) {
    revalidatePath("/security");
    return;
  }

  v.checkedOutAt = new Date().toISOString();
  await writeStore(store);
  revalidatePath("/security");
}

async function checkoutByVisitorId(formData: FormData) {
  "use server";

  const vid = s(formData.get("visitorId"));
  if (!vid) return;

  const store = await readStore();
  const v = store.visitors.find((x) => x.id === vid && !x.checkedOutAt);
  if (!v) {
    revalidatePath("/security");
    return;
  }

  v.checkedOutAt = new Date().toISOString();
  await writeStore(store);
  revalidatePath("/security");
}

/* ======================================================
   UI HELPERS (server components)
====================================================== */
function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "blue" | "gold" | "green" | "red";
}) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-white/70 text-slate-700",
    blue: "border-[rgba(32,48,144,0.20)] bg-[rgba(32,48,144,0.08)] text-[#203090]",
    gold: "border-[rgba(240,192,0,0.35)] bg-[rgba(240,192,0,0.12)] text-slate-900",
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

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[26px] border border-white/40 bg-white/75 shadow-[0_24px_70px_rgba(2,6,23,0.10)] backdrop-blur-xl">
      {children}
    </div>
  );
}

function AvatarStack({ names }: { names: string[] }) {
  const show = names.slice(0, 3);
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {show.length === 0 ? (
          <div className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-500">
            0
          </div>
        ) : (
          show.map((n, i) => (
            <div
              key={i}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-[rgba(32,48,144,0.10)] text-[11px] font-bold text-[#203090] shadow-sm"
              title={n}
            >
              {initials(n)}
            </div>
          ))
        )}
      </div>
    </div>
  );
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

  const all = store.visitors.slice();
  const today = todayISO();

  const activeVisitors = all.filter((v) => !v.checkedOutAt);
  const activeCount = activeVisitors.length;

  // For avatar stack: show first 3 active visitor names
  const activeNames = activeVisitors.slice(0, 3).map((v) => v.fullName);

  // filter
  let filtered = all;
  if (filter === "active") filtered = all.filter((v) => !v.checkedOutAt);
  if (filter === "checkedout") filtered = all.filter((v) => !!v.checkedOutAt);
  if (filter === "today") filtered = all.filter((v) => v.createdAt.slice(0, 10) === today);
  if (filter === "all") filtered = all;

  // search
  const needle = q.toLowerCase();
  const searched =
    needle.length === 0
      ? filtered
      : filtered.filter((v) => {
          if (mode === "id") return v.idNumber.toLowerCase().includes(needle);
          return v.fullName.toLowerCase().includes(needle);
        });

  const hasSearch = needle.length > 0;
  const altMode: SearchMode = mode === "id" ? "name" : "id";
  const altHits =
    hasSearch
      ? filtered.filter((v) => {
          if (altMode === "id") return v.idNumber.toLowerCase().includes(needle);
          return v.fullName.toLowerCase().includes(needle);
        }).length
      : 0;

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

  const openViewVisitors = hasSearch || filter !== "active";

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
                <div className="text-[15px] font-semibold">Arrivo</div>
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
          {/* TOP: Register (always visible, no scrolling needed) */}
          <section>
            <CardShell>
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Register walk-in visitor
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">
                      Gate Entry
                    </div>
                    <p className="mt-2 text-sm text-slate-600 max-w-xl">
                      Capture identity + destination. Walk-ins are auto-approved at the gate.
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

                <form action={registerGuest} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
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

          {/* View Visitors (collapsed; shows count on the summary) */}
          <section>
            <details className="group" open={openViewVisitors}>
              <summary className="list-none cursor-pointer">
                <div className="flex items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white/70 px-5 py-4 shadow-sm backdrop-blur transition hover:bg-white">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      View visitors
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      Active on campus
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <AvatarStack names={activeNames} />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-700">Active</span>
                      <span className="grid h-8 min-w-[32px] place-items-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-900">
                        {activeCount}
                      </span>
                    </div>
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(32,48,144,0.10)] text-[#203090] transition group-open:rotate-45">
                      +
                    </span>
                  </div>
                </div>
              </summary>

              <div className="mt-5">
                <CardShell>
                  <div className="p-6 space-y-5">
                    {/* Search + Checkout row */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
                      {/* Search */}
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

                          <div className="flex items-center gap-2">
                            <Link
                              href={buildHref({ mode: "name" })}
                              className={[
                                "rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                                mode === "name"
                                  ? "border-[rgba(32,48,144,0.25)] bg-[rgba(32,48,144,0.10)] text-[#203090]"
                                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              Name
                            </Link>
                            <Link
                              href={buildHref({ mode: "id" })}
                              className={[
                                "rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition",
                                mode === "id"
                                  ? "border-[rgba(32,48,144,0.25)] bg-[rgba(32,48,144,0.10)] text-[#203090]"
                                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              ID
                            </Link>
                          </div>
                        </div>

                        <form action="/security" method="get" className="mt-3 space-y-3">
                          <input type="hidden" name="mode" value={mode} />
                          <input type="hidden" name="filter" value={filter} />

                          <div className="relative">
                            <input
                              name="q"
                              defaultValue={q}
                              placeholder={mode === "id" ? "Search by ID number" : "Search by full name"}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                            />
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                              {mode === "id" ? "ID" : "NAME"}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.22)] transition hover:shadow-[0_24px_60px_rgba(32,48,144,0.30)]">
                              Search
                            </button>

                            <Link href={buildHref({ filter: "active" })}>
                              <span className={["rounded-full border px-3 py-2 text-xs font-semibold shadow-sm",
                                filter === "active"
                                  ? "border-[rgba(32,48,144,0.25)] bg-[rgba(32,48,144,0.10)] text-[#203090]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              ].join(" ")}>Active</span>
                            </Link>

                            <Link href={buildHref({ filter: "checkedout" })}>
                              <span className={["rounded-full border px-3 py-2 text-xs font-semibold shadow-sm",
                                filter === "checkedout"
                                  ? "border-[rgba(32,48,144,0.25)] bg-[rgba(32,48,144,0.10)] text-[#203090]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              ].join(" ")}>Checked out</span>
                            </Link>

                            <Link href={buildHref({ filter: "today" })}>
                              <span className={["rounded-full border px-3 py-2 text-xs font-semibold shadow-sm",
                                filter === "today"
                                  ? "border-[rgba(32,48,144,0.25)] bg-[rgba(32,48,144,0.10)] text-[#203090]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              ].join(" ")}>Today</span>
                            </Link>

                            <Link href={buildHref({ filter: "all" })}>
                              <span className={["rounded-full border px-3 py-2 text-xs font-semibold shadow-sm",
                                filter === "all"
                                  ? "border-[rgba(32,48,144,0.25)] bg-[rgba(32,48,144,0.10)] text-[#203090]"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              ].join(" ")}>All</span>
                            </Link>
                          </div>

                          {hasSearch && searched.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700">
                              No results for <span className="font-semibold">{q}</span> using{" "}
                              <span className="font-semibold">{mode === "id" ? "ID" : "Name"}</span>.
                              {altHits > 0 ? (
                                <div className="mt-2">
                                  Try{" "}
                                  <Link
                                    href={buildHref({ mode: altMode })}
                                    className="font-semibold text-[#203090] underline underline-offset-4"
                                  >
                                    searching by {altMode === "id" ? "ID" : "Name"}
                                  </Link>{" "}
                                  instead  we found <span className="font-semibold">{altHits}</span> match(es) there.
                                </div>
                              ) : (
                                <div className="mt-2 text-slate-500">
                                  Tip: switch search mode (Name  ID) or change the filter.
                                </div>
                              )}
                            </div>
                          ) : null}
                        </form>
                      </div>

                      {/* Checkout */}
                      <div className="lg:col-span-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Checkout
                        </div>
                        <div className="mt-1 text-lg font-semibold tracking-tight">
                          End a visit by ID
                        </div>

                        <form action={checkoutByIdNumber} className="mt-3 flex gap-2">
                          <input
                            name="idNumber"
                            placeholder="ID number"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                            required
                          />
                          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                            Checkout
                          </button>
                        </form>

                        <div className="mt-2 text-xs text-slate-500">
                          You can also checkout directly from a visitor card.
                        </div>
                      </div>
                    </div>

                    {/* Results (scroll area) */}
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Results
                        </div>
                        <Pill tone="blue">{searched.length} shown</Pill>
                      </div>

                      <div className="mt-3 max-h-[520px] overflow-y-auto pr-1 [scrollbar-width:thin]">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          {searched.map((v) => {
                            const isActive = !v.checkedOutAt;
                            return (
                              <div
                                key={v.id}
                                className="relative overflow-hidden rounded-[26px] border border-white/40 bg-white/75 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl"
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
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-500">Destination</span>
                                    <span className="font-semibold text-slate-800 text-right">{v.destination || ""}</span>
                                  </div>

                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-slate-500">Contact</span>
                                    <span className="text-right text-slate-800">
                                      {v.email || ""}{v.phone ? (v.email ? "  " : "") + maskPhone(v.phone) : ""}
                                      {!v.email && !v.phone ? "" : ""}
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
                                {hasSearch ? (
                                  <div className="mt-2 text-slate-500">
                                    Switch search mode (Name  ID) or change the filter.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardShell>
              </div>
            </details>
          </section>
        </div>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">
          Arrivo  Security Desk  MVP
        </div>
      </footer>
    </div>
  );
}
