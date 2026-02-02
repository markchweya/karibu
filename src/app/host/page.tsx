import Link from "next/link";
import ToastBar from "@/components/ToastBar";
import { hostCancelInvite, hostCreateInvite, hostStartCheckout } from "./actions";
import { readStore, s, todayISO, fmt, initials, normKey, ms } from "@/lib/karibuStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tone = "slate" | "blue" | "gold" | "green" | "red";

function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
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

function CardShell({ children }: { children: React.ReactNode }) {
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
      return { tone: "red" as const, title: "Not found", body: "That code is not an active checked-in visitor." };
    case "code_missing":
      return { tone: "red" as const, title: "Missing code", body: "Enter the visitor code to start checkout." };
    case "limit":
      return { tone: "red" as const, title: "Daily limit reached", body: "You can only invite up to 4 people per day." };
    default:
      return null;
  }
}

export default async function HostPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const store = await readStore();

  const host = s(searchParams.host);
  const flash = s(searchParams.flash);
  const guest = s(searchParams.guest);
  const toast = flash ? flashMeta(flash) : null;

  const today = todayISO();
  const hostKey = host ? normKey(host) : "";

  const invitesTodayMine = hostKey ? store.invites.filter((i) => i.forDate === today && i.hostKey === hostKey) : [];
  const activeVisitsMine = hostKey
    ? store.visitors.filter((v) => !v.checkedOutAt && v.kind === "invite" && normKey(v.hostName || "") === hostKey)
    : [];

  // Notifications (Host): checkout requests older than 10 min and not finalized
  const now = Date.now();
  const hostReminders = hostKey
    ? store.checkoutRequests
        .filter((r) => r.status === "requested" && r.hostKey === hostKey)
        .filter((r) => now - ms(r.requestedAt) >= 10 * 60 * 1000)
    : [];

  return (
    <div className="relative min-h-screen bg-[#f9fafc] text-slate-900">
      {toast ? (
        <ToastBar
          tone={toast.tone}
          title={toast.title}
          body={toast.body + (guest ? ` (${guest})` : "")}
          ms={5000}
        />
      ) : null}

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
                    Enter your name below to activate host reminders.
                  </div>
                ) : hostReminders.length === 0 ? (
                  <div className="rounded-[26px] border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-900 shadow-sm backdrop-blur">
                    All good  no overdue checkouts.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {hostReminders.map((r) => (
                      <div key={r.id} className="rounded-[26px] border border-[rgba(240,192,0,0.45)] bg-[rgba(240,192,0,0.10)] p-5">
                        <div className="text-sm font-semibold">{r.visitorName}</div>
                        <div className="mt-1 text-xs text-slate-700/80">
                          Checkout clock started at <span className="font-semibold">{fmt(r.requestedAt)}</span>
                        </div>
                        <div className="mt-3 text-sm text-slate-800">
                          Security hasn’t confirmed checkout yet. Please check up on the visitor.
                        </div>
                      </div>
                    ))}
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

          {/* Start checkout clock (Host) */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Start the 10-minute exit clock</div>
                    <p className="mt-2 text-sm text-slate-600">
                      Enter the visitor code (the same code used at the gate). Security will see it instantly.
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
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your active visitors</div>
                    <Pill tone="gold">{activeVisitsMine.length} active</Pill>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {!hostKey ? (
                      <div className="sm:col-span-2 rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                        Enter your name at the top (use <span className="font-semibold">/host?host=YourName</span>) to see your active visitors.
                      </div>
                    ) : activeVisitsMine.length === 0 ? (
                      <div className="sm:col-span-2 rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                        No active visitors right now.
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
