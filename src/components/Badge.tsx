import { cn } from "@/lib/utils";

export default function Badge({ children, tone = "neutral" }: { children: any; tone?: "neutral" | "warn" | "danger" | "good" }) {
  const map = {
    neutral: "bg-white/10 border-white/10 text-white/80",
    warn: "bg-usiu-gold/20 border-usiu-gold/25 text-usiu-goldSoft",
    danger: "bg-red-500/15 border-red-500/25 text-red-200",
    good: "bg-emerald-500/15 border-emerald-500/25 text-emerald-200",
  };
  return <span className={cn("inline-flex items-center px-2.5 py-1 rounded-xl text-xs border", map[tone])}>{children}</span>;
}