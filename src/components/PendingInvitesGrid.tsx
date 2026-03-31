"use client";

import { useState } from "react";

type PendingInvite = {
  id: string;
  code: string;
  visitorName: string;
  visitorIdNumber: string;
  hostName: string;
  purpose: string;
  destination?: string;
  createdAt: string;
};

function initials(name: string) {
  const parts = String(name || "").split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "V";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

export default function PendingInvitesGrid({ invites }: { invites: PendingInvite[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied("fail");
      setTimeout(() => setCopied(null), 1200);
    }
  }

  if (!invites || invites.length === 0) {
    return (
      <div className="rounded-[26px] border border-slate-200 bg-white/70 px-5 py-6 text-sm text-slate-600 shadow-sm backdrop-blur">
        No pending invites right now.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {invites.map((i) => (
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
                  ID: <span className="font-semibold text-slate-700">{i.visitorIdNumber}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  Host: <span className="font-semibold text-slate-700">{i.hostName}</span>
                </div>
              </div>
            </div>

            <span className="inline-flex items-center rounded-full border border-[rgba(240,192,0,0.40)] bg-[rgba(240,192,0,0.14)] px-3 py-1 text-xs font-semibold text-slate-900">
              Pending
            </span>
          </div>

          <div className="mt-4 space-y-1 text-sm text-slate-700">
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

            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Code</span>
              <span className="font-semibold text-slate-800 tracking-widest">{i.code}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => copy(i.code, i.id)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50"
            >
              {copied === i.id ? "Copied" : "Copy code"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
