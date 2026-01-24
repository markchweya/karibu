import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import Link from "next/link";
import { logoutAction } from "../login/actions";
import { securityPulse } from "./actions";

export default async function SecurityHome() {
  const s = await requireSession();
  if (s.role !== "SECURITY") throw new Error("FORBIDDEN");

  await securityPulse();

  const overdue = await prisma.visit.findMany({
    where: { checkoutStartAt: { not: null }, exitConfirmedAt: null },
    orderBy: [{ checkoutStartAt: "asc" }],
    take: 12,
    include: { visitor: true },
  });

  const notifs = await prisma.notification.findMany({
    where: { role: "SECURITY", readAt: null },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <Shell
      title="Security Portal"
      subtitle="Check in, capture walk-ins, confirm exit, and monitor overstays."
      right={
        <div className="flex items-center gap-2">
          <Link href="/security/checkin" className="btn-primary">Check-in</Link>
          <Link href="/security/walkin" className="btn-ghost">Walk-in</Link>
          <Link href="/security/exit" className="btn-ghost">Exit</Link>
          <form action={logoutAction}><button className="btn-ghost">Logout</button></form>
        </div>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-3">Active overstays</div>
          <div className="grid gap-3">
            {overdue.map(v => (
              <div key={v.id} className="glass p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">{v.visitor.fullName} <span className="text-white/55">({v.visitor.idNumber})</span></div>
                  <div className="text-xs text-white/60 mt-1">
                    Code: <span className="text-white/85 font-semibold">{v.code}</span>  {v.destination}
                  </div>
                </div>
                <Badge tone={v.status.includes("ESCALATED") || v.status.includes("OVERDUE_15") ? "danger" : "warn"}>{v.status}</Badge>
              </div>
            ))}
            {overdue.length === 0 ? <div className="text-sm text-white/60">No active overstays.</div> : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Unread alerts</div>
          <div className="grid gap-3">
            {notifs.map(n => (
              <div key={n.id} className="glass p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <Badge tone={n.level === "danger" ? "danger" : "warn"}>{n.level}</Badge>
                </div>
                <div className="text-xs text-white/65 mt-1">{n.body}</div>
                {n.visitCode ? <div className="text-xs text-white/60 mt-2">Visit: <span className="font-semibold text-white/85">{n.visitCode}</span></div> : null}
              </div>
            ))}
            {notifs.length === 0 ? <div className="text-sm text-white/60">No alerts.</div> : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}