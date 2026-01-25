"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function routeForEmail(email: string) {
  const e = email.toLowerCase().trim();
  if (e === "security@usiu.app") return "/security";
  if (e === "host@usiu.app") return "/host";
  if (e === "admin@usiu.app") return "/admin";
  return "/admin";
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const email = (form.email as HTMLInputElement).value;
    const password = (form.password as HTMLInputElement).value;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Login failed");
        setLoading(false);
        return;
      }

      router.push(routeForEmail(email));
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  const seeded = [
    { role: "Host", email: "host@usiu.app", pass: "Passw0rd!" },
    { role: "Security", email: "security@usiu.app", pass: "Passw0rd!" },
    { role: "Admin", email: "admin@usiu.app", pass: "Passw0rd!" },
  ];

  return (
    <div className="relative min-h-screen bg-[#f9fafc] text-slate-900">
      {/* background */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-48 left-[-20%] h-[620px] w-[620px] rounded-full bg-[rgba(32,48,144,0.14)] blur-[120px]" />
        <div className="absolute -top-64 right-[-15%] h-[680px] w-[680px] rounded-full bg-[rgba(240,192,0,0.18)] blur-[140px]" />
        <div className="absolute bottom-[-30%] left-[20%] h-[600px] w-[600px] rounded-full bg-[rgba(32,48,144,0.12)] blur-[140px]" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[rgba(32,48,144,0.12)]">
              <span className="h-3 w-3 rounded-full bg-[#F0C000]" />
            </span>
            <div>
              <div className="font-semibold">Arrivo</div>
              <div className="text-xs text-slate-500">USIU Visitor Control</div>
            </div>
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-6 pt-12 md:grid-cols-12">
          {/* left */}
          <section className="md:col-span-7">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Secure campus visitor access.
            </h1>

            <p className="mt-4 max-w-xl text-slate-600">
              Hosts invite. Security verifies. Offices check out.
              Arrivo enforces exit and escalation.
            </p>

            <div className="mt-10">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Seeded accounts
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {seeded.map(s => (
                  <button
                    key={s.email}
                    onClick={() =>
                      navigator.clipboard.writeText(`${s.email} / ${s.pass}`)
                    }
                    className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left text-sm shadow-sm hover:bg-white"
                  >
                    <div className="font-semibold">{s.role}</div>
                    <div className="text-slate-600">{s.email}</div>
                    <div className="text-slate-400">{s.pass}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* right */}
          <section className="md:col-span-5">
            <div className="rounded-[28px] border border-white/40 bg-white/80 p-7 shadow-[0_40px_90px_rgba(2,6,23,0.18)] backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="mt-1 text-sm text-slate-600">
                Staff, security & admin access
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">
                    Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  disabled={loading}
                  className="w-full rounded-2xl bg-[linear-gradient(135deg,#203090,#06124A)] px-5 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-70"
                >
                  {loading ? "Signing in" : "Sign in"}
                </button>

                <div className="text-xs text-slate-500">
                  security@usiu.app  /security  host@usiu.app  /host  admin@usiu.app  /admin
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
