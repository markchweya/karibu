import Link from "next/link";
import ToastBar from "@/components/ToastBar";
import type { ReactNode } from "react";
import { hostCancelInvite, hostCreateInvite, hostStartCheckout } from "./actions";
import { readStore, s, todayISO, fmt, initials, normKey, ms } from "@/lib/karibuStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tone = "slate" | "blue" | "gold" | "green" | "red";

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

function flashMeta(code: string) {
  switch (code) {
    case "created":
      return { tone: "green" as const, title: "Invite created", body: "Share the visitor code with your guest." };
    case "cancelled":
      return { tone: "green" as const, title: "Invite cancelled", body: "This slot is now free again." };
    case "checkout_started":
      return { tone: "blue" as const, title: "Checkout clock started", body: "Security has been notified. Visitor has 10 minutes to reach the gate." };
    case "checkout_already":
      return { tone: "gold" as const, title: "Already started", body: "A checkout clock is already running for this visitor." };
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

function statusTone(status?: string): Tone {
  if (status === "pending") return "gold";
  if (status === "checkedin") return "green";
  if (status === "cancelled") return "red";
  return "slate";
}

function statusLabel(status?: string) {
  if (status === "pending") return "Pending";
  if (status === "checkedin") return "Checked in";
  if (status === "cancelled") return "Cancelled";
  return status || "Unknown";
}

function maskId(id?: string) {
  if (!id) return "";
  const t = id.trim();
  if (t.length <= 4) return t;
  return `${"*".repeat(Math.max(0, t.length - 4))}${t.slice(-4)}`;
}

export default async function HostPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const store = await readStore();

  const host = s(searchParams.host);
  const flash = s(searchParams.flash);
  const guest = s(searchParams.guest);
  const toast = flash ? flashMeta(flash) : null;

  const today = todayISO();
  const hostKey = host ? normKey(host) : "";

  const invitesTodayMine = hostKey
    ? store.invites
        .filter((i) => i.forDate === today && i.hostKey === hostKey)
        .slice()
        .sort((a: any, b: any) => {
          const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
          const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
          return tb - ta;
        })
    : [];

  const pendingMine = invitesTodayMine.filter((i) => i.status === "pending");
  const checkedInMine = invitesTodayMine.filter((i) => i.status === "checkedin");
  const cancelledMine = invitesTodayMine.filter((i) => i.status === "cancelled");

  const activeVisitsMine = hostKey
    ? store.visitors.filter((v) => !v.checkedOutAt && v.kind === "invite" && normKey(v.hostName || "") === hostKey)
    : [];

  const now = Date.now();
  const hostReminders = hostKey
    ? (store.checkoutRequests || [])
        .filter((r: any) => r.status === "requested" && r.hostKey === hostKey)
        .filter((r: any) => now - ms(r.requestedAt) >= 10 * 60 * 1000)
    : [];

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
                <div className="text-xs text-slate-500">Host Portal</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-2">
              <Pill tone="blue">USIU</Pill>
              <Pill tone="gold">Invites</Pill>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/security" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
              Security
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 pb-12 pt-8 space-y-8">
          {/* Notifications (Host) */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notifications</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Host reminders</div>
                    <p className="mt-2 text-sm text-slate-600">If 10 minutes pass and Security has not finalized checkout, you’ll see it here.</p>
                  </div>
                  <Pill tone={hostReminders.length ? "gold" : "green"}>{hostReminders.length} pending</Pill>
                </div>
              </div>

              <div className="p-6">
                {!hostKey ? (
                  <div className="rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                    Open with <span className="font-semibold">/host?host=YourName</span> so we can load your invites.
                  </div>
                ) : hostReminders.length === 0 ? (
                  <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-900 shadow-sm backdrop-blur">
                    All good  no overdue checkouts.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {hostReminders.map((r: any) => (
                      <div key={r.id} className="rounded-[26px] border border-[rgba(240,192,0,0.45)] bg-[rgba(240,192,0,0.10)] p-5">
                        <div className="text-sm font-semibold">{r.visitorName}</div>
                        <div className="mt-1 text-xs text-slate-700/80">
                          Checkout clock started at <span className="font-semibold">{fmt(r.requestedAt)}</span>
                        </div>
                        <div className="mt-3 text-sm text-slate-800">Security hasn’t confirmed checkout yet. Please check up on the visitor.</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardShell>
          </section>

          {/* Invite contact cards (THIS is what you were missing) */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Today</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Your invite contact cards</div>
                    <p className="mt-2 text-sm text-slate-600">
                      Pending shows immediately after you create invite. Once Security checks them in, it changes to Checked in and they also show under Active visitors.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={pendingMine.length ? "gold" : "green"}>{pendingMine.length} pending</Pill>
                    <Pill tone={checkedInMine.length ? "green" : "slate"}>{checkedInMine.length} checked in</Pill>
                    <Pill tone={cancelledMine.length ? "red" : "slate"}>{cancelledMine.length} cancelled</Pill>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {!hostKey ? (
                  <div className="rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                    Open with <span className="font-semibold">/host?host=YourName</span> so we can load your invites.
                  </div>
                ) : invitesTodayMine.length === 0 ? (
                  <div className="rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                    No invites created yet for today.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {invitesTodayMine.map((inv: any) => {
                      const code = (inv.code || "").toUpperCase();
                      const visitorName = inv.visitorName || "Unknown visitor";
                      const idMasked = maskId(inv.visitorIdNumber || "");
                      const checkedInAt = inv.checkedInAt ? fmt(inv.checkedInAt) : "";

                      return (
                        <div key={inv.id} className="relative overflow-hidden rounded-[26px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl">
                          <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgba(240,192,0,0.55),rgba(32,48,144,0.35),transparent)]" />

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(32,48,144,0.10)] text-[#203090] font-bold">
                                {initials(visitorName)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{visitorName}</div>
                                <div className="mt-0.5 truncate text-xs text-slate-500">
                                  ID: <span className="font-semibold text-slate-700">{idMasked || "-"}</span>
                                </div>
                              </div>
                            </div>

                            <Pill tone={statusTone(inv.status)}>{statusLabel(inv.status)}</Pill>
                          </div>

                          <div className="mt-3 space-y-1 text-sm text-slate-700">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Code</span>
                              <span className="font-semibold text-slate-900 uppercase tracking-widest">{code || "-"}</span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Purpose</span>
                              <span className="font-semibold text-slate-800 truncate">{inv.purpose || "-"}</span>
                            </div>

                            {inv.destination ? (
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-slate-500">Destination</span>
                                <span className="font-semibold text-slate-800 truncate">{inv.destination}</span>
                              </div>
                            ) : null}

                            {inv.status === "checkedin" ? (
                              <div className="flex items-center justify-between gap-3 pt-1">
                                <span className="text-slate-500">Checked in at</span>
                                <span className="font-semibold text-slate-800">{checkedInAt || "-"}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-4 flex items-center justify-end gap-2">
                            {inv.status === "pending" ? (
                              <form action={hostCancelInvite}>
                                <input type="hidden" name="hostName" value={host || ""} />
                                <input type="hidden" name="inviteId" value={inv.id} />
                                <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                                  Cancel invite
                                </button>
                              </form>
                            ) : null}

                            {inv.status === "checkedin" ? (
                              <form action={hostStartCheckout}>
                                <input type="hidden" name="hostName" value={host || ""} />
                                <input type="hidden" name="code" value={code} />
                                <button className="rounded-full bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(32,48,144,0.20)] transition hover:shadow-[0_20px_45px_rgba(32,48,144,0.26)]">
                                  Start checkout
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardShell>
          </section>

          {/* Create invite */}
          <section>
            <CardShell>
              <div className="p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Create an invite</div>
                <div className="mt-1 text-2xl font-semibold tracking-tight">Invite a visitor</div>

                <form action={hostCreateInvite} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Your name (Host)</label>
                    <input
                      name="hostName"
                      required
                      defaultValue={host || ""}
                      placeholder="e.g. Mr. Otieno"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visitor full name</label>
                    <input
                      name="visitorName"
                      required
                      placeholder="e.g. Jane Wanjiku"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visitor ID number</label>
                    <input
                      name="visitorIdNumber"
                      required
                      placeholder="e.g. 12345678"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-12">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Purpose</label>
                    <input
                      name="purpose"
                      required
                      placeholder="e.g. Meeting / Admission / Lecture / Delivery"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-12 flex justify-end">
                    <button className="w-full md:w-auto rounded-2xl bg-[#F0C000] px-7 py-3.5 text-[15px] font-semibold text-slate-900 shadow-sm transition hover:brightness-[0.98]">
                      Create Invite
                    </button>
                  </div>
                </form>
              </div>
            </CardShell>
          </section>

          {/* Start checkout + Active visitors (checked in) */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Start the 10-minute exit clock</div>
                    <p className="mt-2 text-sm text-slate-600">
                      Active visitors here are only the ones Security has already checked in.
                    </p>
                  </div>
                  <Pill tone="blue">Host  Security</Pill>
                </div>

                <form action={hostStartCheckout} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <input type="hidden" name="hostName" value={host} />
                  <div className="sm:col-span-8">
                    <input
                      name="code"
                      required
                      placeholder="Visitor code e.g. 7H3K2QZ"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm uppercase tracking-widest outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <button className="w-full rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(32,48,144,0.22)] transition hover:shadow-[0_24px_60px_rgba(32,48,144,0.30)]">
                      Start checkout
                    </button>
                  </div>
                </form>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your active visitors (checked in)</div>
                    <Pill tone="gold">{activeVisitsMine.length} active</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {!hostKey ? (
                      <div className="sm:col-span-2 rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                        Open with <span className="font-semibold">/host?host=YourName</span> to see your active visitors.
                      </div>
                    ) : activeVisitsMine.length === 0 ? (
                      <div className="sm:col-span-2 rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                        No active visitors yet. If you already created an invite, it will show above as Pending until Security checks them in.
                      </div>
                    ) : (
                      activeVisitsMine.map((v) => (
                        <div key={v.id} className="rounded-[26px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(32,48,144,0.10)] text-[#203090] font-bold">
                                {initials(v.fullName)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{v.fullName}</div>
                                <div className="mt-0.5 truncate text-xs text-slate-500">
                                  Code: <span className="font-semibold text-slate-700 tracking-widest">{v.inviteCode}</span>
                                </div>
                              </div>
                            </div>

                            {v.checkoutRequestedAt ? <Pill tone="gold">Checkout started</Pill> : <Pill tone="blue">Active</Pill>}
                          </div>

                          <div className="mt-3 text-sm text-slate-700">
                            Purpose: <span className="font-semibold">{v.purpose || "-"}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardShell>
          </section>
        </div>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">Karibu  Host Portal  MVP</div>
      </footer>
    </div>
  );
}
