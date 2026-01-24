import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function Shell({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="px-6 pt-7 pb-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-2xl glass grid place-items-center")}>
              <span className="font-black tracking-tight">A</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white/90">Arrivo</div>
              <div className="text-xs text-white/55">USIU Visitor Control</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">{right}</div>
        </div>
      </header>

      <main className="px-6 pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="glass p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-white/70">{subtitle}</p> : null}
              </div>
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}