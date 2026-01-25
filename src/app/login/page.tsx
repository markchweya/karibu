"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";

/* ======================================================
   BRAND
====================================================== */
const BRAND_BLUE = "#203090";   // USIU deep blue
const BRAND_GOLD = "#F0C000";   // USIU gold

type State = { ok?: boolean; error?: string };

/* ======================================================
   SUBMIT BUTTON
====================================================== */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="
        relative w-full overflow-hidden rounded-2xl
        bg-[linear-gradient(135deg,#203090_0%,#0b1a66_55%,#203090_100%)]
        px-5 py-3.5 text-[15px] font-semibold text-white
        shadow-[0_24px_60px_rgba(32,48,144,0.35)]
        ring-1 ring-white/10
        transition hover:shadow-[0_30px_80px_rgba(32,48,144,0.45)]
        disabled:opacity-70
      "
    >
      <span className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <span className="absolute -left-24 top-[-50%] h-[220%] w-48 rotate-12 bg-white/20 blur-2xl" />
      </span>
      <span className="relative inline-flex items-center justify-center gap-2">
        {pending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {pending ? "Signing in…" : "Sign in"}
      </span>
    </button>
  );
}

/* ======================================================
   PAGE
====================================================== */
export default function LoginPage() {
  const router = useRouter();
  const [state, formAction] = useFormState<State>(loginAction as any, { ok: false });

  useEffect(() => {
    if (state?.ok) router.push("/admin");
  }, [state?.ok, router]);

  const seeded = [
    { role: "Host", email: "host@usiu.app", pass: "Passw0rd!" },
    { role: "Security", email: "security@usiu.app", pass: "Passw0rd!" },
    { role: "Admin", email: "admin@usiu.app", pass: "Passw0rd!" },
  ];

  return (
    <div className="relative min-h-screen bg-[#f9fafc] text-slate-900">
      {/* ==================================================
          CINEMATIC BACKDROP (full-page, not boxed)
      ================================================== */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-[-20%] h-[620px] w-[620px] rounded-full bg-[rgba(32,48,144,0.14)] blur-[120px]" />
        <div className="absolute -top-64 right-[-15%] h-[680px] w-[680px] rounded-full bg-[rgba(240,192,0,0.18)] blur-[140px]" />
        <div className="absolute bottom-[-30%] left-[20%] h-[600px] w-[600px] rounded-full bg-[rgba(32,48,144,0.12)] blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_0%,rgba(2,6,23,0.05),transparent_60%)]" />
      </div>

      {/* ==================================================
          HEADER
      ================================================== */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(32,48,144,0.12)]">
              <span className="h-3 w-3 rounded-full bg-[#F0C000] shadow-[0_8px_30px_rgba(240,192,0,0.5)]" />
            </span>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold">Arrivo</div>
              <div className="text-xs text-slate-500">USIU Visitor Control</div>
            </div>
          </Link>

          <div className="hidden md:block text-sm text-slate-500">
            Controlled access · Timed exit · Escalations
          </div>
        </div>
      </header>

      {/* ==================================================
          MAIN
      ================================================== */}
      <main className="relative z-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-6 pt-10 md:grid-cols-12 md:items-start">
          {/* LEFT — MESSAGE */}
          <section className="md:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#F0C000]" />
              Campus-wide visitor lifecycle
            </span>

            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
              Visitor management that actually enforces exit.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Arrivo connects hosts, security, and service offices into one
              continuous flow — from invitation to gate verification, service,
              timed exit, and escalation.
            </p>

            {/* SEEDED ACCOUNTS */}
            <div className="mt-10">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Seeded demo accounts
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {seeded.map((s) => (
                  <button
                    key={s.email}
                    type="button"
                    onClick={() =>
                      navigator.clipboard?.writeText(`${s.email} / ${s.pass}`)
                    }
                    className="
                      flex flex-col items-start gap-1 rounded-2xl
                      border border-slate-200 bg-white/80
                      px-4 py-3 text-left
                      shadow-sm backdrop-blur
                      transition hover:bg-white
                    "
                  >
                    <div className="text-sm font-semibold">{s.role}</div>
                    <div className="text-xs text-slate-600">{s.email}</div>
                    <div className="text-xs text-slate-400">{s.pass}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT — SIGN IN */}
          <section className="md:col-span-5">
            <div className="relative">
              <div className="pointer-events-none absolute -inset-10 rounded-[40px] bg-[radial-gradient(closest-side,rgba(32,48,144,0.12),transparent)]" />

              <div className="relative rounded-[28px] border border-white/40 bg-white/80 p-7 shadow-[0_40px_90px_rgba(2,6,23,0.18)] backdrop-blur-xl">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Sign in
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Staff, security & admin access
                </p>

                <form action={formAction} className="mt-6 space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      required
                      className="
                        mt-2 w-full rounded-2xl
                        border border-slate-200 bg-white
                        px-4 py-3 text-sm
                        outline-none transition
                        focus:border-[rgba(32,48,144,0.45)]
                        focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]
                      "
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      className="
                        mt-2 w-full rounded-2xl
                        border border-slate-200 bg-white
                        px-4 py-3 text-sm
                        outline-none transition
                        focus:border-[rgba(32,48,144,0.45)]
                        focus:ring-4 focus:ring-[rgba(32,48,144,0.12)]
                      "
                    />
                  </div>

                  {state?.error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {state.error}
                    </div>
                  )}

                  <SubmitButton />
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ==================================================
          FOOTER
      ================================================== */}
      <footer className="relative z-10 mt-20">
        <div className="mx-auto max-w-7xl px-6 py-10 text-xs text-slate-500">
          Arrivo · USIU Visitor Control · MVP interface
        </div>
      </footer>
    </div>
  );
}
