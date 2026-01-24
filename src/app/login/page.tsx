"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { loginAction } from "./actions";

type State = { ok?: boolean; error?: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#203090_0%,#06124A_55%,#203090_100%)] px-5 py-3 text-[15px] font-semibold text-white shadow-[0_18px_45px_rgba(6,18,74,0.22)] ring-1 ring-[#203090]/20 transition hover:shadow-[0_24px_60px_rgba(6,18,74,0.28)] disabled:opacity-70"
      aria-busy={pending}
    >
      <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <span className="absolute -left-20 top-[-40%] h-[200%] w-40 rotate-12 bg-white/20 blur-2xl" />
      </span>
      <span className="relative inline-flex items-center justify-center gap-2">
        {pending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {pending ? "Signing in" : "Sign in"}
      </span>
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction] = useFormState<State>(loginAction as any, { ok: false });

  useEffect(() => {
    if (state?.ok) router.push("/admin"); // later: role routing
  }, [state?.ok, router]);

  const seeded = [
    { role: "Host", email: "host@usiu.app", pass: "Passw0rd!" },
    { role: "Security", email: "security@usiu.app", pass: "Passw0rd!" },
    { role: "Admin", email: "admin@usiu.app", pass: "Passw0rd!" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* soft brand wash (NOT a box) */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-[-20%] h-[520px] w-[520px] rounded-full bg-[#203090]/12 blur-3xl" />
        <div className="absolute -top-48 right-[-18%] h-[560px] w-[560px] rounded-full bg-[#F0C000]/18 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[18%] h-[520px] w-[520px] rounded-full bg-[#203090]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(1100px_500px_at_50%_0%,rgba(2,6,23,0.04),transparent_60%)]" />
      </div>

      {/* Top bar (webpage feel) */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="group inline-flex items-center gap-3">
            <span className="relative grid h-9 w-9 place-items-center">
              <span className="absolute inset-0 rounded-xl bg-[#203090] opacity-10 blur-[1px]" />
              <span className="relative h-3 w-3 rounded-full bg-[#F0C000] shadow-[0_10px_30px_rgba(240,192,0,0.35)]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-semibold tracking-tight">Arrivo</span>
              <span className="block text-xs text-slate-500">USIU Visitor Control</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 md:block">
              Secure check-in  controlled access  timed exit
            </span>
            <a
              href="#signin"
              className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur transition hover:bg-white"
            >
              Sign in
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-10 pt-2 md:grid-cols-12 md:items-start">
          {/* Left: clean hero text (no container) */}
          <section className="md:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#F0C000]" />
              Visitor lifecycle, from gate entry to exit confirmation
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
              A campus-wide visitor flow that actually closes the loop.
            </h1>

            <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-slate-600">
              Hosts pre-register visits. Security confirms at the gate. The serving office checks out the visitor,
              an exit timer starts, and escalations trigger if they overstay.
            </p>

            {/* seeded accounts (clean list, not boxed) */}
            <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Seeded accounts (MVP)
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {seeded.map((s) => (
                  <button
                    key={s.email}
                    type="button"
                    onClick={() => {
                      const text = `${s.email} / ${s.pass}`;
                      navigator.clipboard?.writeText(text);
                    }}
                    className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-left shadow-sm backdrop-blur transition hover:bg-white"
                    title="Click to copy"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{s.role}</div>
                      <div className="mt-0.5 text-xs text-slate-600">{s.email}</div>
                      <div className="mt-1 text-xs text-slate-500">{s.pass}</div>
                    </div>
                    <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700 transition group-hover:bg-slate-900/10">
                      Copy
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Right: Sign-in (floating panel, not boxy container) */}
          <section id="signin" className="md:col-span-5">
            <div className="relative">
              {/* subtle halo */}
              <div className="pointer-events-none absolute -inset-10 rounded-[36px] bg-[radial-gradient(closest-side,rgba(32,48,144,0.10),transparent)]" />

              <div className="relative rounded-[28px] border border-slate-200 bg-white/70 p-6 shadow-[0_30px_80px_rgba(2,6,23,0.10)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Use your staff/security credentials. (MVP uses seeded accounts.)
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-[#F0C000]" />
                    Arrivo
                  </span>
                </div>

                <form action={formAction} className="mt-6 space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="you@usiu.app"
                      autoComplete="email"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#203090]/40 focus:ring-4 focus:ring-[#203090]/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Password
                    </label>
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#203090]/40 focus:ring-4 focus:ring-[#203090]/10"
                      required
                    />
                  </div>

                  {state?.error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {state.error}
                    </div>
                  ) : null}

                  <SubmitButton />

                  <div className="mt-3 text-xs text-slate-500">
                    After login, we’ll route by role (Host / Security / Admin) + dashboards.
                  </div>
                </form>

                <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                  <Link
                    href="/"
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    Home
                  </Link>
                  <button
                    type="button"
                    onClick={() => location.reload()}
                    className="rounded-full bg-[#F0C000] px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:brightness-[0.98]"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* BELOW: horizontal scroll section (snap) */}
        <section className="relative z-10 border-t border-slate-200/70">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  How it works
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  Scroll the flow (invitation  gate  service  exit)
                </h3>
              </div>
              <p className="hidden text-sm text-slate-500 md:block">Swipe/scroll horizontally</p>
            </div>

            <div className="mt-6 -mx-6 overflow-x-auto px-6 pb-2 [scrollbar-width:thin]">
              <div className="flex min-w-max gap-4 snap-x snap-mandatory">
                {[
                  {
                    k: "Invite",
                    t: "Pre-registered invites",
                    d: "Host/student logs invitee ID, purpose, destination, vehicle plate, number of people, and contact.",
                    accent: "from-[#203090]/10 to-transparent",
                  },
                  {
                    k: "Gate",
                    t: "Gate verification",
                    d: "Security searches the invite, verifies identity, checks in, and issues a visitor tag.",
                    accent: "from-[#F0C000]/18 to-transparent",
                  },
                  {
                    k: "Service",
                    t: "Served at destination",
                    d: "Office/prof confirms arrival. When done, they check out the visitor and the exit timer starts.",
                    accent: "from-[#203090]/10 to-transparent",
                  },
                  {
                    k: "Exit",
                    t: "Timed exit + escalation",
                    d: "Email/SMS: You have 10 minutes to exit. Alerts at 10, 13, 15, 16 minutes (escalate).",
                    accent: "from-[#F0C000]/18 to-transparent",
                  },
                ].map((c) => (
                  <article
                    key={c.k}
                    className="snap-start w-[320px] rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className={`h-1.5 w-full rounded-full bg-gradient-to-r ${c.accent}`} />
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{c.k}</div>
                      <span className="h-2 w-2 rounded-full bg-[#F0C000]" />
                    </div>
                    <h4 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{c.t}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{c.d}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-10 text-xs text-slate-500">
          Arrivo  USIU Visitor Control  MVP UI pass (we’ll wire Supabase + Resend after flows).
        </div>
      </footer>
    </div>
  );
}
