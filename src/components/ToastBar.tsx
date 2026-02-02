"use client";

import { useEffect, useState } from "react";

type Tone = "green" | "red" | "blue" | "gold" | "slate";

export default function ToastBar({
  title,
  body,
  tone = "blue",
  ms = 5000,
}: {
  title: string;
  body?: string;
  tone?: Tone;
  ms?: number;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setOpen(false), ms);
    return () => clearTimeout(t);
  }, [ms]);

  if (!open) return null;

  const tones: Record<Tone, string> = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-[rgba(32,48,144,0.22)] bg-[rgba(32,48,144,0.08)] text-[#0b1a66]",
    gold: "border-[rgba(240,192,0,0.40)] bg-[rgba(240,192,0,0.14)] text-slate-900",
    slate: "border-slate-200 bg-white/70 text-slate-800",
  };

  return (
    <div className="fixed left-0 right-0 top-3 z-[60] px-4">
      <div className={["mx-auto max-w-3xl rounded-[18px] border px-4 py-3 shadow-sm backdrop-blur", tones[tone]].join(" ")}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            {body ? <div className="mt-1 text-sm opacity-90">{body}</div> : null}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-semibold hover:bg-white"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
