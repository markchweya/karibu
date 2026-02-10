"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { hostStartCheckout, hostCancelInvite } from "./actions";

type Props = {
  hostName: string;
  hostKey: string;
  invitesToday: any[];
  visitors: any[];
  checkoutRequests: any[];
  pollMs?: number;
};

/** Client-safe helpers (no fs, no server imports) */
function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function normKey(v: unknown): string {
  return s(v).toLowerCase().replace(/\s+/g, " ").trim();
}
function ms(x: any): number {
  if (!x) return 0;
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  if (x instanceof Date) return x.getTime();
  const t = Date.parse(String(x));
  return Number.isFinite(t) ? t : 0;
}
function initials(name: string): string {
  const parts = s(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (a + b).toUpperCase();
}
function fmt(ts: any): string {
  const n = ms(ts);
  if (!n) return "";
  try {
    const d = new Date(n);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}
function fmtMMSS(totalMs: number): string {
  const t = Math.max(0, Math.floor(totalMs / 1000));
  const m = Math.floor(t / 60);
  const s2 = t % 60;
  return `${String(m).padStart(2, "0")}:${String(s2).padStart(2, "0")}`;
}

function getInviteCode(inv: any) {
  return (inv?.code || inv?.inviteCode || inv?.visitorCode || inv?.passCode || "").toString().trim().toUpperCase();
}
function getInviteVisitorName(inv: any) {
  return (
    (inv?.visitorName ||
      inv?.visitorFullName ||
      inv?.fullName ||
      inv?.full_name ||
      inv?.name ||
      inv?.visitor ||
      "").toString().trim() || "Unknown visitor"
  );
}
function getInviteVisitorId(inv: any) {
  return (inv?.visitorIdNumber || inv?.idNumber || inv?.id_no || inv?.nationalId || inv?.id || "").toString().trim();
}
function maskId(id?: string) {
  const t = s(id);
  if (!t) return "";
  if (t.length <= 4) return t;
  return `${"*".repeat(Math.max(0, t.length - 4))}${t.slice(-4)}`;
}
function getVisitorName(v: any) {
  return (v?.fullName || v?.visitorName || v?.name || v?.visitor || v?.guestName || "").toString().trim() || "Unknown visitor";
}
function getVisitorCode(v: any) {
  return (v?.inviteCode || v?.code || v?.visitorCode || v?.passCode || "").toString().trim().toUpperCase();
}
function getVisitorPurpose(v: any) {
  return (v?.purpose || v?.reason || v?.visitReason || "").toString().trim();
}

function isCheckedOut(v: any) {
  return Boolean(v?.checkedOutAt || v?.checkoutAt || v?.checked_out_at || v?.checkedOut);
}

function pillClass(tone: "green" | "gold" | "red" | "slate" | "blue") {
  const tones: Record<string, string> = {
    slate: "border-slate-200/70 bg-white/60 text-slate-700",
    blue: "border-[rgba(32,48,144,0.18)] bg-[rgba(32,48,144,0.06)] text-[#203090]",
    gold: "border-[rgba(240,192,0,0.30)] bg-[rgba(240,192,0,0.10)] text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-800",
  };
  return ["inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur", tones[tone]].join(" ");
}

export default function HostLiveClient({ hostName, hostKey, invitesToday, visitors, checkoutRequests, pollMs = 5000 }: Props) {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [pendingCheckout, setPendingCheckout] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  // Per-second tick for timers (does NOT refresh server, just updates UI timers)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Background refresh for live sync
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh();
    }, pollMs);
    return () => clearInterval(id);
  }, [router, pollMs]);

  const now = Date.now();

  const myInvites = useMemo(() => {
    return (invitesToday || []).filter((i: any) => {
      const hk = (i?.hostKey || i?.host_key || "").toString().trim();
      const hn = (i?.hostName || i?.host || "").toString().trim();
      const key = hk || normKey(hn);
      return key && key === hostKey;
    });
  }, [invitesToday, hostKey]);

  const activeVisitors = useMemo(() => {
    return (visitors || []).filter((v: any) => {
      if (isCheckedOut(v)) return false;
      const hk = (v?.hostKey || v?.host_key || "").toString().trim();
      const hn = (v?.hostName || v?.host || "").toString().trim();
      const key = hk || normKey(hn);
      return key && key === hostKey;
    });
  }, [visitors, hostKey]);

  const overdueVisitors = useMemo(() => {
    return activeVisitors
      .filter((v: any) => v?.checkoutRequestedAt)
      .map((v: any) => {
        const started = ms(v?.checkoutRequestedAt);
        const elapsed = started ? now - started : 0;
        const overdue = elapsed >= 10 * 60 * 1000;
        return { v, started, elapsed, overdue };
      })
      .filter((x) => x.overdue)
      .sort((a, b) => b.elapsed - a.elapsed);
  }, [activeVisitors, now, tick]);

  const myOverdueCount = overdueVisitors.length;

  const myCheckoutReminders = useMemo(() => {
    const n = Date.now();
    return (checkoutRequests || [])
      .filter((r: any) => r?.status === "requested")
      .filter((r: any) => {
        const hk = (r?.hostKey || "").toString().trim();
        const hn = (r?.hostName || "").toString().trim();
        const key = hk || normKey(hn);
        return key && key === hostKey;
      })
      .filter((r: any) => n - ms(r?.requestedAt) >= 10 * 60 * 1000);
  }, [checkoutRequests, hostKey, tick]);

  function handleStartCheckout(code: string) {
    const c = s(code).toUpperCase().replace(/\s+/g, "");
    if (!c) return;

    setPendingCheckout((m) => ({ ...m, [c]: true }));

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("hostName", hostName);
        fd.set("code", c);
        // Server action redirects; if it doesn't (edge cases), we refresh anyway
        await hostStartCheckout(fd);
      } finally {
        setPendingCheckout((m) => ({ ...m, [c]: false }));
        router.refresh();
      }
    });
  }

  function handleCancelInvite(inviteId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("inviteId", inviteId);
      fd.set("hostName", hostName);
      await hostCancelInvite(fd);
      router.refresh();
    });
  }

  return (
    <div className="py-10">
      {/* LIVE: Overstay alerts */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live</div>
          <div className="mt-2 text-[34px] leading-[1.10] font-semibold tracking-tight text-slate-900">Overstay alerts</div>
          <p className="mt-2 max-w-3xl text-[15px] text-slate-600">Only active visitors show here. Once checked out, they disappear.</p>
        </div>
        <div className={pillClass(myOverdueCount ? "red" : "green")}>{myOverdueCount} overdue</div>
      </div>

      <div className="mt-6">
        {myOverdueCount === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            Clean. No overstays right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {overdueVisitors.map(({ v, elapsed }) => {
              const name = getVisitorName(v);
              const code = getVisitorCode(v);
              const startedAt = fmt(v?.checkoutRequestedAt);
              const overBy = fmtMMSS(elapsed - 10 * 60 * 1000);

              return (
                <div key={v.id || code} className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-900">
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="mt-1 text-xs opacity-80">Checkout started {startedAt || "-"}</div>
                  <div className="mt-3 text-sm">
                    Overstayed by <span className="font-semibold">{overBy}</span> <span className="font-semibold">({code || "-"})</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-white/70" />

      {/* TODAY: Invite contact cards */}
      <div className="mt-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Today</div>
          <div className="mt-2 text-[34px] leading-[1.10] font-semibold tracking-tight text-slate-900">Invite contact cards</div>
          <p className="mt-2 max-w-3xl text-[15px] text-slate-600">Timer appears only while the visitor is still active.</p>
          <div className="mt-3 text-xs text-slate-500">Auto refresh every {Math.round(pollMs / 1000)}s. Timer updates every second.</div>
        </div>

        <button
          onClick={() => router.refresh()}
          className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white"
        >
          Live sync
        </button>
      </div>

      <div className="mt-6">
        {myInvites.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white/50 px-5 py-4 text-sm text-slate-700">
            No invites found for <span className="font-semibold">{hostName}</span> today.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {myInvites.map((inv: any) => {
              const code = getInviteCode(inv);
              const visitorName = getInviteVisitorName(inv);
              const idMasked = maskId(getInviteVisitorId(inv));
              const status = (inv?.status || "").toString();

              // If invite is checked in and checkout clock started, compute overdue live
              const checkoutStarted = ms(inv?.checkoutRequestedAt);
              const elapsed = checkoutStarted ? now - checkoutStarted : 0;
              const isOverdue = checkoutStarted ? elapsed >= 10 * 60 * 1000 : false;

              const cardTone =
                status === "cancelled" ? "border-red-200 bg-white/55" : isOverdue ? "border-red-200 bg-red-50" : "border-white/70 bg-white/55";

              return (
                <div key={inv.id || code} className={`rounded-2xl border ${cardTone} px-5 py-4 backdrop-blur`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-[#203090] font-bold">
                        {initials(visitorName)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{visitorName}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          ID <span className="font-semibold text-slate-700">{idMasked || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className={pillClass(status === "checkedin" ? (isOverdue ? "red" : "green") : status === "pending" ? "gold" : status === "cancelled" ? "red" : "slate")}>
                      {status || "unknown"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">Code</div>
                    <div className="text-right font-semibold tracking-widest">{code || "-"}</div>

                    <div className="text-slate-500">Purpose</div>
                    <div className="text-right font-semibold text-slate-800 truncate">{s(inv?.purpose) || "-"}</div>

                    {inv?.destination ? (
                      <>
                        <div className="text-slate-500">Destination</div>
                        <div className="text-right font-semibold text-slate-800 truncate">{s(inv?.destination)}</div>
                      </>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    {status === "pending" ? (
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-white"
                        disabled={isPending}
                      >
                        Cancel invite
                      </button>
                    ) : null}

                    {status === "checkedin" ? (
                      <button
                        onClick={() => handleStartCheckout(code)}
                        disabled={Boolean(pendingCheckout[code])}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
                          pendingCheckout[code]
                            ? "bg-slate-400 cursor-not-allowed"
                            : "bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] hover:brightness-[1.02]",
                        ].join(" ")}
                      >
                        {pendingCheckout[code] ? "Starting..." : "Start checkout"}
                      </button>
                    ) : null}
                  </div>

                  {/* Live timer when checkout started */}
                  {inv?.checkoutRequestedAt && !isOverdue ? (
                    <div className="mt-3 text-xs text-slate-600">
                      Checkout timer: <span className="font-semibold">{fmtMMSS(elapsed)}</span>
                    </div>
                  ) : null}

                  {inv?.checkoutRequestedAt && isOverdue ? (
                    <div className="mt-3 text-xs text-red-800">
                      Overstayed by{" "}
                      <span className="font-semibold">{fmtMMSS(elapsed - 10 * 60 * 1000)}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-10 border-t border-white/70" />

      {/* Checkout section: Active visitors */}
      <div className="mt-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Checkout</div>
          <div className="mt-2 text-[34px] leading-[1.10] font-semibold tracking-tight text-slate-900">Active visitors</div>
          <p className="mt-2 max-w-3xl text-[15px] text-slate-600">These are checked-in visitors only. Start checkout to begin the 10-minute clock.</p>
        </div>
        <div className={pillClass(activeVisitors.length ? "blue" : "slate")}>{activeVisitors.length} active</div>
      </div>

      <div className="mt-6">
        {activeVisitors.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white/50 px-5 py-4 text-sm text-slate-700">No active visitors right now.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {activeVisitors.map((v: any) => {
              const name = getVisitorName(v);
              const code = getVisitorCode(v);
              const purpose = getVisitorPurpose(v);

              const started = ms(v?.checkoutRequestedAt);
              const elapsed = started ? now - started : 0;
              const overdue = started ? elapsed >= 10 * 60 * 1000 : false;

              return (
                <div
                  key={v.id || code}
                  className={[
                    "rounded-2xl border px-5 py-4 backdrop-blur",
                    overdue ? "border-red-200 bg-red-50" : "border-white/70 bg-white/55",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-[#203090] font-bold">
                        {initials(name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{name}</div>
                        <div className="mt-0.5 truncate text-xs text-slate-500">
                          Code <span className="font-semibold text-slate-700 tracking-widest">{code || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className={pillClass(started ? (overdue ? "red" : "gold") : "blue")}>
                      {started ? (overdue ? "Overstayed" : "Checkout started") : "Active"}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-700">
                    Purpose <span className="font-semibold">{purpose || "-"}</span>
                  </div>

                  {started ? (
                    <div className={["mt-3 text-xs", overdue ? "text-red-800" : "text-slate-600"].join(" ")}>
                      Timer: <span className="font-semibold">{fmtMMSS(elapsed)}</span>
                      {overdue ? (
                        <>
                          {" "}
                          · Over by <span className="font-semibold">{fmtMMSS(elapsed - 10 * 60 * 1000)}</span>
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => handleStartCheckout(code)}
                      disabled={Boolean(pendingCheckout[code])}
                      className={[
                        "rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
                        pendingCheckout[code]
                          ? "bg-slate-400 cursor-not-allowed"
                          : "bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)] hover:brightness-[1.02]",
                      ].join(" ")}
                    >
                      {pendingCheckout[code] ? "Starting..." : "Start checkout"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Host reminders */}
      <div className="mt-10 border-t border-white/70" />

      <div className="mt-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notifications</div>
          <div className="mt-2 text-[34px] leading-[1.10] font-semibold tracking-tight text-slate-900">Host reminders</div>
          <p className="mt-2 max-w-3xl text-[15px] text-slate-600">If 10 minutes pass and Security has not finalized checkout, you’ll see it here.</p>
        </div>

        <div className={pillClass(myCheckoutReminders.length ? "gold" : "green")}>{myCheckoutReminders.length} pending</div>
      </div>

      <div className="mt-6">
        {myCheckoutReminders.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            All good. No overdue checkouts.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {myCheckoutReminders.map((r: any) => (
              <div key={r.id} className="rounded-2xl border border-[rgba(240,192,0,0.35)] bg-[rgba(240,192,0,0.10)] px-5 py-4 text-slate-900">
                <div className="text-sm font-semibold">{r.visitorName}</div>
                <div className="mt-1 text-xs text-slate-700/80">
                  Checkout clock started at <span className="font-semibold">{fmt(r.requestedAt) || "-"}</span>
                </div>
                <div className="mt-3 text-sm text-slate-800">Security hasn’t confirmed checkout yet. Please check up on the visitor.</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
