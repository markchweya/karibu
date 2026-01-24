"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const USIU_BLUE = "#203090";
const USIU_NAVY = "#06124A";
const USIU_GOLD = "#F0C000";

type Invite = {
  id: string;
  visitorName: string;
  idNumber: string;
  purpose: string;
  office: string;
  eta: string;
  status: "Pending" | "Checked in" | "Completed" | "Flagged";
};

const demoInvites: Invite[] = [
  {
    id: "INV-1029",
    visitorName: "Grace Wanjiru",
    idNumber: "ID 29XXXXXX",
    purpose: "Meeting: Faculty Office",
    office: "School of Business",
    eta: "Today  11:20",
    status: "Pending",
  },
  {
    id: "INV-1031",
    visitorName: "Paul Otieno",
    idNumber: "ID 18XXXXXX",
    purpose: "Deliveries",
    office: "Admin Block",
    eta: "Today  12:10",
    status: "Checked in",
  },
  {
    id: "INV-1036",
    visitorName: "Zeinab Ali",
    idNumber: "Passport",
    purpose: "Student visit",
    office: "Admissions",
    eta: "Tomorrow  09:40",
    status: "Pending",
  },
  {
    id: "INV-1042",
    visitorName: "David Mwangi",
    idNumber: "DL",
    purpose: "Maintenance",
    office: "Facilities",
    eta: "Today  14:05",
    status: "Flagged",
  },
];

function cn(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function StatusPill({ s }: { s: Invite["status"] }) {
  const map: Record<Invite["status"], string> = {
    Pending: "bg-slate-900/5 text-slate-700 ring-slate-900/10",
    "Checked in": "bg-blue-50 text-blue-700 ring-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Flagged: "bg-amber-50 text-amber-800 ring-amber-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
        map[s]
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background:
            s === "Pending"
              ? "rgba(15,23,42,0.45)"
              : s === "Checked in"
              ? USIU_BLUE
              : s === "Completed"
              ? "rgb(16 185 129)"
              : USIU_GOLD,
        }}
      />
      {s}
    </span>
  );
}

export default function HostPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Invite["status"] | "All">("All");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return demoInvites
      .filter((r) => (filter === "All" ? true : r.status === filter))
      .filter((r) => {
        if (!s) return true;
        const blob = `${r.id} ${r.visitorName} ${r.idNumber} ${r.purpose} ${r.office} ${r.eta} ${r.status}`.toLowerCase();
        return blob.includes(s);
      });
  }, [q, filter]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Light, modern brand atmosphere (not box UI) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-52 left-[-18%] h-[560px] w-[560px] rounded-full blur-3xl"
             style={{ background: `${USIU_BLUE}14` }} />
        <div className="absolute -top-56 right-[-22%] h-[620px] w-[620px] rounded-full blur-3xl"
             style={{ background: `${USIU_GOLD}20` }} />
        <div className="absolute bottom-[-30%] left-[18%] h-[560px] w-[560px] rounded-full blur-3xl"
             style={{ background: `${USIU_BLUE}12` }} />
        <div className="absolute inset-0 bg-[radial-gradient(1100px_500px_at_50%_0%,rgba(2,6,23,0.05),transparent_65%)]" />
      </div>

      {/* Top nav */}
      <header className="relative z-10 border-b border-slate-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center">
              <span className="absolute inset-0 rounded-xl opacity-10" style={{ background: USIU_BLUE }} />
              <span className="relative h-3 w-3 rounded-full shadow-[0_10px_30px_rgba(240,192,0,0.35)]"
                    style={{ background: USIU_GOLD }} />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Arrivo</span>
              <span className="block text-xs text-slate-500">Host Dashboard</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              New invite
            </button>
            <button
              className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-[0.98]"
              style={{ background: `linear-gradient(135deg, ${USIU_BLUE}, ${USIU_NAVY})` }}
            >
              Quick check
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Header row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full" style={{ background: USIU_GOLD }} />
                Host view  create invites  monitor check-ins
              </div>
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                Today’s visitors, at a glance.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Keep the UI clean: search fast, create invites, and track status without containery boxes.
              </p>
            </div>

            {/* Search + filter */}
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
              <div className="relative w-full md:w-[320px]">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search invite, name, office, status"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition focus:ring-4"
                  style={{ boxShadow: "0 0 0 0 rgba(32,48,144,0)", outline: "none" }}
                />
              </div>

              <div className="inline-flex w-full overflow-hidden rounded-2xl border border-slate-200 bg-white md:w-auto">
                {(["All", "Pending", "Checked in", "Completed", "Flagged"] as const).map((s) => {
                  const active = filter === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setFilter(s)}
                      className={cn(
                        "px-4 py-3 text-sm font-semibold transition",
                        active ? "text-white" : "text-slate-700 hover:bg-slate-50"
                      )}
                      style={
                        active
                          ? { background: `linear-gradient(135deg, ${USIU_BLUE}, ${USIU_NAVY})` }
                          : undefined
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Metrics (light, minimal, not chunky cards) */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              { k: "Invites", v: "12", sub: "Created today" },
              { k: "Pending", v: "5", sub: "Awaiting gate check" },
              { k: "Checked in", v: "4", sub: "On campus" },
              { k: "Alerts", v: "1", sub: "Needs attention" },
            ].map((m) => (
              <div
                key={m.k}
                className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {m.k}
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-tight">{m.v}</div>
                <div className="mt-1 text-sm text-slate-600">{m.sub}</div>
              </div>
            ))}
          </div>

          {/* Table (clean webpage feel) */}
          <div className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold tracking-tight">Invites</h2>
              <button
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:brightness-[0.98]"
                style={{ background: `${USIU_GOLD}` }}
              >
                Export
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white/70 shadow-sm backdrop-blur">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Invite</th>
                      <th className="px-5 py-4">Visitor</th>
                      <th className="px-5 py-4">Purpose</th>
                      <th className="px-5 py-4">Office</th>
                      <th className="px-5 py-4">ETA</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200/70">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold text-slate-900">{r.id}</div>
                          <div className="text-xs text-slate-500">{r.idNumber}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-semibold">{r.visitorName}</div>
                          <div className="text-xs text-slate-500">ID captured</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-slate-800">{r.purpose}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-slate-800">{r.office}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-slate-800">{r.eta}</div>
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill s={r.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}

                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-600">
                          No results. Try another search or switch filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {/* bottom hint */}
              <div className="flex items-center justify-between border-t border-slate-200/70 px-5 py-4 text-xs text-slate-500">
                <span>Tip: click New invite to start the flow.</span>
                <span className="font-semibold" style={{ color: USIU_BLUE }}>
                  USIU palette  clean white UI
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-slate-200/70">
        <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-slate-500">
          Arrivo  Host dashboard (MVP)  next: real data + role routing
        </div>
      </footer>
    </div>
  );
}
