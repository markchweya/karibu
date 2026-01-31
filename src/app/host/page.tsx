import Link from "next/link";
import { hostCancelInvite, hostCreateInvite } from "./actions";
import { readStore, s, todayISO, fmt, initials, normKey, type Invite } from "@/lib/karibuStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
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
    case "limit":
      return { tone: "red" as const, title: "Daily limit reached", body: "You can only invite up to 4 people per day." };
    case "dup_invite":
      return { tone: "red" as const, title: "Already invited", body: "That visitor ID is already invited (pending) today." };
    case "bad_host":
      return { tone: "red" as const, title: "Missing host name", body: "Enter your name so we can apply the daily limit." };
    case "bad_name":
      return { tone: "red" as const, title: "Missing visitor name", body: "Visitor name is required." };
    case "bad_id":
      return { tone: "red" as const, title: "Invalid visitor ID", body: "Visitor ID number is required (min 4 chars)." };
    case "bad_purpose":
      return { tone: "red" as const, title: "Missing purpose", body: "Purpose of visit is required." };
    case "cant_cancel":
      return { tone: "red" as const, title: "Cannot cancel", body: "Only pending invites can be cancelled." };
    default:
      return null;
  }
}

function statusTone(i: Invite) {
  if (i.status === "checkedin") return "green" as const;
  if (i.status === "cancelled") return "slate" as const;
  return "gold" as const;
}

export default async function HostPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const store = await readStore();

  const host = s(searchParams.host);
  const flash = s(searchParams.flash);
  const toast = flash ? flashMeta(flash) : null;

  const today = todayISO();

  // If host is provided, show "my invites". If not, show all invites today.
  const hostKey = host ? normKey(host) : "";

  const invitesTodayAll = store.invites.filter((i) => i.forDate === today);

  const invitesTodayMine = hostKey
    ? invitesTodayAll.filter((i) => i.hostKey === hostKey)
    : invitesTodayAll;

  // For limit/remaining slots, only compute when host exists
  const myTodayNonCancelled = hostKey
    ? invitesTodayAll.filter((i) => i.hostKey === hostKey && i.status !== "cancelled")
    : [];

  const remaining = hostKey ? Math.max(0, 4 - myTodayNonCancelled.length) : 4;

  const pendingMine = hostKey
    ? invitesTodayAll.filter((i) => i.hostKey === hostKey && i.status === "pending")
    : invitesTodayMine.filter((i) => i.status === "pending");

  // Nice ordering: pending  checkedin  cancelled
  const ordered = invitesTodayMine.slice().sort((a, b) => {
    const rank = (x: Invite) => (x.status === "pending" ? 0 : x.status === "checkedin" ? 1 : 2);
    return rank(a) - rank(b);
  });

  return (
    <div className="relative min-h-screen bg-[#f9fafc] text-slate-900">
      {/* cinematic wash (keep same gradients) */}
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
                <div className="text-xs text-slate-500">Host Portal</div>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 ml-2">
              <Pill tone="blue">USIU</Pill>
              <Pill tone="gold">Invites</Pill>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/security"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50"
            >
              Go to Security
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
                  href={host ? `/host?host=${encodeURIComponent(host)}` : "/host"}
                  className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-white"
                >
                  Dismiss
                </Link>
              </div>
            </div>
          ) : null}

          {/* Create invite */}
          <section>
            <CardShell>
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Create an invite
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">Invite a visitor</div>
                    <p className="mt-2 text-sm text-slate-600 max-w-xl">
                      You can invite a maximum of <span className="font-semibold">4 people per day</span>. Security will
                      see your invite instantly.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {hostKey ? (
                      <Pill tone={remaining === 0 ? "red" : "gold"}>
                        <span className="h-2 w-2 rounded-full bg-[#F0C000]" />
                        {remaining} slots left today
                      </Pill>
                    ) : (
                      <Pill tone="gold">Enter host name to apply limit</Pill>
                    )}
                  </div>
                </div>

                <form action={hostCreateInvite} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Your name (Host)
                    </label>
                    <input
                      name="hostName"
                      required
                      defaultValue={host || ""}
                      placeholder="e.g. Mr. Otieno"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      After you submit once, Karibu keeps your host name in the URL.
                    </div>
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Visitor full name
                    </label>
                    <input
                      name="visitorName"
                      required
                      placeholder="e.g. Jane Wanjiku"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Visitor ID number
                    </label>
                    <input
                      name="visitorIdNumber"
                      required
                      placeholder="e.g. 12345678"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-8">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Purpose of visit
                    </label>
                    <input
                      name="purpose"
                      required
                      placeholder="e.g. Meeting / Admission / Lecture / Delivery"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[rgba(32,48,144,0.45)] focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Destination (optional)
                    </label>
                    <input
                      name="destination"
                      placeholder="e.g. Library / Admin / Auditorium"
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

          {/* Invites list */}
          <section>
            <CardShell>
              <div className="border-b border-white/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {hostKey ? "Your invites today" : "All invites today"}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight">
                      {hostKey ? host : "Hosts"}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Pending invites are what Security will check in when the visitor arrives.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Pill tone="blue">{pendingMine.length} pending</Pill>
                    <Pill tone="gold">{ordered.length} total today</Pill>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {ordered.length === 0 ? (
                    <div className="sm:col-span-2 rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                      No invites yet today.
                    </div>
                  ) : (
                    ordered.map((i) => (
                      <div
                        key={i.id}
                        className="relative overflow-hidden rounded-[26px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)] backdrop-blur-xl"
                      >
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,rgba(32,48,144,0.35),rgba(240,192,0,0.45),transparent)]" />

                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(32,48,144,0.10)] text-[#203090] font-bold">
                              {initials(i.visitorName)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{i.visitorName}</div>
                              <div className="mt-0.5 truncate text-xs text-slate-500">
                                Host: <span className="font-semibold text-slate-700">{i.hostName}</span>
                              </div>
                            </div>
                          </div>

                          <Pill tone={statusTone(i)}>
                            {i.status === "pending" ? "Pending" : i.status === "checkedin" ? "Checked in" : "Cancelled"}
                          </Pill>
                        </div>

                        <div className="mt-4 space-y-1 text-sm text-slate-700">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Code</span>
                            <span className="font-semibold text-slate-800 tracking-widest">{i.code}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Purpose</span>
                            <span className="font-semibold text-slate-800 text-right">{i.purpose}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Created</span>
                            <span className="text-right text-slate-800">{fmt(i.createdAt)}</span>
                          </div>
                          {i.checkedInAt ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500">Checked in</span>
                              <span className="text-right font-semibold text-slate-800">{fmt(i.checkedInAt)}</span>
                            </div>
                          ) : null}
                        </div>

                        {i.status === "pending" && hostKey ? (
                          <div className="mt-4 flex items-center justify-end gap-2">
                            <form action={hostCancelInvite}>
                              <input type="hidden" name="inviteId" value={i.id} />
                              <input type="hidden" name="hostName" value={host} />
                              <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50">
                                Cancel
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardShell>
          </section>
        </div>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">
          Karibu  Host Portal  MVP
        </div>
      </footer>
    </div>
  );
}
