"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { hostStartCheckoutLive } from "./actions";

type Tone = "slate" | "blue" | "gold" | "green" | "red";

function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<string, string> = {
    slate: "border-slate-200 bg-white text-slate-700",
    blue: "border-[rgba(32,48,144,0.22)] bg-[rgba(32,48,144,0.06)] text-[#203090]",
    gold: "border-[rgba(240,192,0,0.45)] bg-[rgba(240,192,0,0.12)] text-slate-900",
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-800",
  };
  return (
    <span className={["inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", tones[tone] ?? tones.slate].join(" ")}>
      {children}
    </span>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">{children}</div>;
}

function normKey(x: string) {
  return (x || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}
function ms(v: any) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  const s = v.toString().trim();
  const n = Number(s);
  if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  const d = Date.parse(s);
  return Number.isNaN(d) ? 0 : d;
}
function fmtTime(v: any) {
  const t = ms(v);
  if (!t) return "-";
  try {
    const d = new Date(t);
    return d.toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
}
function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const ini = parts.map((p) => p[0]?.toUpperCase() || "").join("");
  return ini || "V";
}
function mmss(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
function maskId(id?: string) {
  if (!id) return "";
  const t = id.trim();
  if (t.length <= 4) return t;
  return `${"*".repeat(Math.max(0, t.length - 4))}${t.slice(-4)}`;
}

function getInviteHostName(inv: any) {
  return (inv?.hostName || inv?.host || inv?.host_full_name || "").toString().trim();
}
function getInviteHostKey(inv: any) {
  return (inv?.hostKey || inv?.host_key || "").toString().trim();
}
function getInviteVisitorName(inv: any) {
  return (inv?.visitorName || inv?.visitorFullName || inv?.fullName || inv?.name || "").toString().trim() || "Unknown visitor";
}
function getInviteVisitorId(inv: any) {
  return (inv?.visitorIdNumber || inv?.idNumber || inv?.id_no || inv?.nationalId || "").toString().trim();
}
function getInviteCode(inv: any) {
  return (inv?.code || inv?.inviteCode || inv?.visitorCode || inv?.passCode || "").toString().trim().toUpperCase();
}
function getInvitePurpose(inv: any) {
  return (inv?.purpose || inv?.reason || inv?.visitReason || "").toString().trim();
}
function getInviteDestination(inv: any) {
  return (inv?.destination || inv?.to || inv?.office || inv?.dept || "").toString().trim();
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

function getRequestCode(r: any) {
  return (r?.inviteCode || r?.code || r?.visitorCode || "").toString().trim().toUpperCase();
}
function getRequestStartMs(r: any) {
  return ms(r?.requestedAt || r?.createdAt);
}

export default function HostLiveClient({
  host,
  hostKey,
  invitesToday,
  visitors,
  checkoutRequests,
  pollMs = 6000,
  overstayMs = 10 * 60 * 1000,
}: {
  host: string;
  hostKey: string;
  invitesToday: any[];
  visitors: any[];
  checkoutRequests: any[];
  pollMs?: number;
  overstayMs?: number;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [optimisticStarted, setOptimisticStarted] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!host) return;
    const t = setInterval(() => router.refresh(), pollMs);
    return () => clearInterval(t);
  }, [host, pollMs, router]);

  const invitesMine = useMemo(() => {
    if (!hostKey) return [];
    return (invitesToday || []).filter((i: any) => {
      const hk = getInviteHostKey(i);
      const hn = getInviteHostName(i);
      return (hk && hk === hostKey) || normKey(hn || "") === hostKey;
    });
  }, [invitesToday, hostKey]);

  // active visitors for this host
  const activeVisitsMine = useMemo(() => {
    if (!hostKey) return [];
    return (visitors || []).filter((v: any) => {
      const hk = getVisitorHostKey(v);
      const hn = getVisitorHostName(v);
      const matchesHost = (hk && hk === hostKey) || normKey(hn || "") === hostKey;
      if (!matchesHost) return false;
      if (!isInviteVisitor(v)) return false;
      if (isCheckedOut(v)) return false;
      return true;
    });
  }, [visitors, hostKey]);

  const activeCodes = useMemo(() => new Set(activeVisitsMine.map((v: any) => getVisitorCode(v)).filter(Boolean)), [activeVisitsMine]);

  // only keep requested timers for ACTIVE codes
  const requestedByCode = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of checkoutRequests || []) {
      if ((r?.status || "").toString() !== "requested") continue;
      const code = getRequestCode(r);
      if (!code) continue;
      if (!activeCodes.has(code)) continue; // key fix
      map.set(code, r);
    }
    return map;
  }, [checkoutRequests, activeCodes]);

  function isCheckoutRunning(code: string) {
    if (!code) return false;
    if (optimisticStarted[code]) return true;
    return requestedByCode.has(code);
  }

  function checkoutStartMs(code: string) {
    const opt = optimisticStarted[code];
    if (opt) return opt;
    const r = requestedByCode.get(code);
    return r ? getRequestStartMs(r) : 0;
  }

  const overdue = useMemo(() => {
    const out: any[] = [];
    for (const r of checkoutRequests || []) {
      if ((r?.status || "").toString() !== "requested") continue;
      const code = getRequestCode(r);
      if (!code) continue;
      if (!activeCodes.has(code)) continue; // key fix
      const start = getRequestStartMs(r);
      if (!start) continue;
      if (now - start >= overstayMs) out.push(r);
    }
    return out;
  }, [checkoutRequests, activeCodes, now, overstayMs]);

  function startCheckout(code: string) {
    if (!host || !code) return;
    const upper = code.toUpperCase();
    if (!activeCodes.has(upper)) return; // don’t start if visitor already checked out
    if (isCheckoutRunning(upper)) return;

    setOptimisticStarted((prev) => ({ ...prev, [upper]: Date.now() }));

    const fd = new FormData();
    fd.set("hostName", host);
    fd.set("code", upper);

    startTransition(async () => {
      try {
        await hostStartCheckoutLive(fd);
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Overstays */}
      <Shell>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live</div>
              <div className="mt-1 text-xl font-semibold">Overstay alerts</div>
              <p className="mt-1 text-sm text-slate-600">Only active visitors show here. Once checked out, it disappears.</p>
            </div>
            <Pill tone={overdue.length ? "red" : "green"}>{overdue.length} overdue</Pill>
          </div>
        </div>

        <div className="p-5">
          {!host ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">Pick your host name above to load your dashboard.</div>
          ) : overdue.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">Clean. No overstays right now.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {overdue.map((r: any) => {
                const start = getRequestStartMs(r);
                const code = getRequestCode(r);
                const overBy = start ? now - start - overstayMs : 0;
                return (
                  <div key={r.id || code} className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="text-sm font-semibold text-red-900">{r.visitorName || "Visitor"}</div>
                    <div className="mt-1 text-xs text-red-700">
                      Checkout started <span className="font-semibold">{start ? fmtTime(start) : "-"}</span>
                      {code ? <span className="ml-2 font-semibold tracking-widest">({code})</span> : null}
                    </div>
                    <div className="mt-3">
                      <Pill tone="red">Overstayed by {mmss(overBy)}</Pill>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Shell>

      {/* Invite cards */}
      <Shell>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Today</div>
              <div className="mt-1 text-xl font-semibold">Invite contact cards</div>
              <p className="mt-1 text-sm text-slate-600">Timer appears only while the visitor is still active.</p>
            </div>
            <Pill tone="blue">Live sync</Pill>
          </div>
        </div>

        <div className="p-5">
          {!host ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">Pick your host name above to load your invites.</div>
          ) : invitesMine.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              No invites found for <span className="font-semibold">{host}</span> today.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {invitesMine.map((inv: any) => {
                const code = getInviteCode(inv);
                const visitorName = getInviteVisitorName(inv);
                const idMasked = maskId(getInviteVisitorId(inv));
                const purpose = getInvitePurpose(inv);
                const destination = getInviteDestination(inv);

                const isActive = code ? activeCodes.has(code) : false;

                const running = inv?.status === "checkedin" && isActive ? isCheckoutRunning(code) : false;
                const startMs = running ? checkoutStartMs(code) : 0;
                const left = startMs ? overstayMs - (now - startMs) : overstayMs;
                const overstayed = running && startMs && now - startMs >= overstayMs;

                const frame = overstayed
                  ? "border-red-200 bg-red-50"
                  : running
                    ? "border-[rgba(240,192,0,0.45)] bg-[rgba(240,192,0,0.10)]"
                    : "border-slate-200 bg-white";

                return (
                  <div key={inv.id} className={["rounded-2xl border p-4", frame].join(" ")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[rgba(32,48,144,0.08)] text-[#203090] font-bold">
                          {initials(visitorName)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{visitorName}</div>
                          <div className="mt-0.5 truncate text-xs text-slate-500">
                            ID <span className="font-semibold text-slate-700">{idMasked || "-"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {running ? (overstayed ? <Pill tone="red">Overstayed</Pill> : <Pill tone="gold">{mmss(left)}</Pill>) : null}
                        <Pill tone={inv?.status === "checkedin" ? "green" : inv?.status === "pending" ? "gold" : inv?.status === "cancelled" ? "red" : "slate"}>
                          {(inv?.status || "unknown").toString().toUpperCase()}
                        </Pill>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="text-slate-500">Code</div>
                      <div className="font-semibold tracking-widest text-right">{code || "-"}</div>

                      <div className="text-slate-500">Purpose</div>
                      <div className="font-semibold text-right truncate">{purpose || "-"}</div>

                      <div className="text-slate-500">Destination</div>
                      <div className="font-semibold text-right truncate">{destination || "-"}</div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      {inv?.status === "checkedin" ? (
                        !isActive ? (
                          <span className="text-xs font-semibold text-slate-500">Checked out already</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startCheckout(code)}
                            disabled={!code || running || isPending}
                            className={
                              running
                                ? "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                                : "rounded-full bg-[#203090] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-[0.98] disabled:opacity-70"
                            }
                          >
                            {running ? "Checkout started" : "Start checkout"}
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-xs text-slate-500">Auto refresh every {Math.round(pollMs / 1000)}s. Timer updates every second.</div>
        </div>
      </Shell>
    </div>
  );
}
