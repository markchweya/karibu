import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "../login/actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function minutesSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 60000);
}

async function getData() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    totalVisits,
    visitsToday,
    activeVisits,
    escalatedVisits,
    walkIns
  ] = await Promise.all([
    prisma.visit.count(),
    prisma.visit.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.visit.findMany({
      where: {
        checkInAt: { not: null },
        exitConfirmedAt: null
      },
      include: { visitor: true, host: true },
      orderBy: { checkInAt: "asc" }
    }),
    prisma.visit.count({
      where: {
        OR: [
          { status: { contains: "ESCALATED" } },
          { checkoutStartAt: { not: null }, exitConfirmedAt: null }
        ]
      }
    }),
    prisma.visit.count({ where: { isWalkIn: true } })
  ]);

  const avgDurationAgg = await prisma.visit.aggregate({
    _avg: { durationMinutes: true }
  });

  return {
    totalVisits,
    visitsToday,
    activeVisits,
    escalatedVisits,
    walkIns,
    avgDuration: Math.round(avgDurationAgg._avg.durationMinutes || 0)
  };
}

export default async function AdminHome() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/login");

  const data = await getData();

  return (
    <Shell
      title="Admin Control Center"
      subtitle="System intelligence & live visitor monitoring"
      right={
        <form action={logoutAction}>
          <button className="btn-ghost">Logout</button>
        </form>
      }
    >
      <meta httpEquiv="refresh" content="5" />

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "Total Visits", value: data.totalVisits },
          { label: "Today", value: data.visitsToday },
          { label: "Active Now", value: data.activeVisits.length },
          { label: "Escalated", value: data.escalatedVisits },
          { label: "Walk-ins", value: data.walkIns },
          { label: "Avg Duration (min)", value: data.avgDuration }
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-6 bg-black/40 backdrop-blur-md border border-black/30 shadow-lg"
          >
            <div className="text-sm font-semibold text-white/80 tracking-wide">
              {item.label}
            </div>
            <div className="text-4xl font-bold mt-3 text-white">
              {item.value}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="text-xl font-semibold mb-5 text-black">
          Currently Checked-In Visitors
        </div>

        <div className="grid gap-4">
          {data.activeVisits.map((v) => {
            const mins = v.checkInAt ? minutesSince(v.checkInAt) : 0;
            const tone = mins >= 16 ? "danger" : mins >= 13 ? "warning" : "info";

            return (
              <div
                key={v.id}
                className="rounded-xl p-5 bg-black/40 backdrop-blur-md border border-black/30 flex items-center justify-between flex-wrap gap-4 shadow-md"
              >
                <div>
                  <div className="font-semibold text-white text-lg">
                    {v.visitor.fullName}
                    <span className="ml-2 text-white/70 text-sm">
                      ({v.visitor.idNumber})
                    </span>
                  </div>

                  <div className="text-sm text-white/80 mt-1">
                    Host: {v.host?.fullName || "—"} • {v.destination}
                  </div>

                  <div className="text-sm text-white/70 mt-1">
                    {mins} minutes inside
                  </div>
                </div>

                <Badge tone={tone as any}>{mins}m</Badge>
              </div>
            );
          })}

          {data.activeVisits.length === 0 && (
            <div className="text-black/70 text-sm">
              No active visitors.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
