import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "../login/actions";

function minutesSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 60000);
}

export default async function HostHome() {
  const session = await requireSession();
  if (session.role !== "host") throw new Error("FORBIDDEN");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    myTotalVisits,
    myTodayVisits,
    myActiveVisits,
    myEscalations
  ] = await Promise.all([
    prisma.visit.count({ where: { hostUserId: session.email } }),
    prisma.visit.count({
      where: {
        hostUserId: session.email,
        createdAt: { gte: startOfToday }
      }
    }),
    prisma.visit.findMany({
      where: {
        hostUserId: session.email,
        checkInAt: { not: null },
        exitConfirmedAt: null
      },
      include: { visitor: true },
      orderBy: { checkInAt: "asc" }
    }),
    prisma.visit.count({
      where: {
        hostUserId: session.email,
        status: { contains: "ESCALATED" }
      }
    })
  ]);

  const avgAgg = await prisma.visit.aggregate({
    where: { hostUserId: session.email },
    _avg: { durationMinutes: true }
  });

  const avgDuration = Math.round(avgAgg._avg.durationMinutes || 0);

  return (
    <Shell
      title="Host Dashboard"
      subtitle="Manage your visitors and monitor live activity"
      right={
        <form action={logoutAction}>
          <button className="btn-ghost">Logout</button>
        </form>
      }
    >
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="glass p-4">
          <div className="text-xs text-white/60">My Total Visits</div>
          <div className="text-2xl font-semibold mt-1">{myTotalVisits}</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs text-white/60">Today</div>
          <div className="text-2xl font-semibold mt-1">{myTodayVisits}</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs text-white/60">Active Now</div>
          <div className="text-2xl font-semibold mt-1">{myActiveVisits.length}</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs text-white/60">Escalations</div>
          <div className="text-2xl font-semibold mt-1">{myEscalations}</div>
        </div>

        <div className="glass p-4">
          <div className="text-xs text-white/60">Avg Duration (min)</div>
          <div className="text-2xl font-semibold mt-1">{avgDuration}</div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold mb-3">My Active Visitors</div>
        <div className="grid gap-3">
          {myActiveVisits.map((v) => {
            const mins = v.checkInAt ? minutesSince(v.checkInAt) : 0;
            const tone = mins >= 16 ? "danger" : mins >= 13 ? "warning" : "info";

            return (
              <div key={v.id} className="glass p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-semibold text-sm">
                    {v.visitor.fullName}
                    <span className="text-white/60 ml-2">({v.visitor.idNumber})</span>
                  </div>
                  <div className="text-xs text-white/60 mt-1">{v.destination}</div>
                  <div className="text-xs text-white/50 mt-1">{mins} minutes inside</div>
                </div>
                <Badge tone={tone as any}>{mins}m</Badge>
              </div>
            );
          })}
          {myActiveVisits.length === 0 && (
            <div className="text-sm text-white/60">No active visitors.</div>
          )}
        </div>
      </div>
    </Shell>
  );
}
