import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "../login/actions";
import { runEscalationSweep } from "@/lib/escalation";

export default async function AdminHome() {
  const s = await requireSession();
  if (s.role !== "ADMIN") throw new Error("FORBIDDEN");

  await runEscalationSweep();

  const escalated = await prisma.visit.findMany({
    where: { status: "ESCALATED_16", exitConfirmedAt: null },
    orderBy: { checkoutStartAt: "asc" },
    include: { visitor: true },
    take: 20,
  });

  const notifs = await prisma.notification.findMany({
    where: { role: "ADMIN", readAt: null },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <Shell
      title="Admin  Head Security"
      subtitle="Escalations at +16 minutes and high-priority alerts."
      right={
        <form action={logoutAction}>
          <button className="btn-ghost">Logout</button>
        </form>
      }
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="text-sm font-semibold mb-3">Escalated visits</div>
          <div className="grid gap-3">
            {escalated.map(v => (
              <div key={v.id} className="glass p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">{v.visitor.fullName} <span className="text-white/55">({v.visitor.idNumber})</span></div>
                  <div className="text-xs text-white/60 mt-1">
                    Code: <span className="text-white/85 font-semibold">{v.code}</span>  {v.destination}
                  </div>
                </div>
                <Badge tone="danger">{v.status}</Badge>
              </div>
            ))}
            {escalated.length === 0 ? <div className="text-sm text-white/60">No escalations.</div> : null}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold mb-3">Unread admin alerts</div>
          <div className="grid gap-3">
            {notifs.map(n => (
              <div key={n.id} className="glass p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <Badge tone="danger">{n.level}</Badge>
                </div>
                <div className="text-xs text-white/65 mt-1">{n.body}</div>
                {n.visitCode ? <div className="text-xs text-white/60 mt-2">Visit: <span className="font-semibold text-white/85">{n.visitCode}</span></div> : null}
              </div>
            ))}
            {notifs.length === 0 ? <div className="text-sm text-white/60">No alerts.</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 text-xs text-white/55">
        Thresholds are currently hard-coded to 10/13/15 notify Security and 16 escalate Admin. We’ll make them configurable next.
      </div>
    </Shell>
  );
}