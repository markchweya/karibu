import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "../login/actions";

function minutesSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 60000);
}

export default async function SecurityHome() {
  const session = await requireSession();
  if (session.role !== "security") {
    throw new Error("FORBIDDEN");
  }

  const [arrivals, activeVisits, escalated] = await Promise.all([
    prisma.visit.findMany({
      where: { checkInAt: null },
      include: { visitor: true, host: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.visit.findMany({
      where: {
        checkInAt: { not: null },
        exitConfirmedAt: null,
      },
      include: { visitor: true, host: true },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.visit.count({
      where: { status: { contains: "ESCALATED" } },
    }),
  ]);

  return (
    <Shell
      title="Security Dashboard"
      subtitle="Manage arrivals, live visitors and exits"
      right={
        <form action={logoutAction}>
          <button className="btn-ghost">Logout</button>
        </form>
      }
    >
      {/* ACTION BUTTONS */}
      <div className="flex gap-4 mb-8">
        <Link
          href="/security/checkin"
          className="px-5 py-3 rounded-lg bg-black/60 text-white font-medium hover:bg-black/70 transition"
        >
          Check In Visitor
        </Link>
        <Link
          href="/security/walkin"
          className="px-5 py-3 rounded-lg bg-black/60 text-white font-medium hover:bg-black/70 transition"
        >
          Register Walk-in
        </Link>
        <Link
          href="/security/exit"
          className="px-5 py-3 rounded-lg bg-black/60 text-white font-medium hover:bg-black/70 transition"
        >
          Confirm Exit
        </Link>
      </div>

      {/* METRICS */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "Pending Arrivals", value: arrivals.length },
          { label: "Active Visitors", value: activeVisits.length },
          { label: "Escalated", value: escalated },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-6 bg-black/50 backdrop-blur-md border border-black/30 shadow-lg"
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

      {/* ARRIVALS QUEUE */}
      <div className="mb-10">
        <div className="text-xl font-semibold mb-4 text-black">
          Arrivals Queue
        </div>

        <div className="grid gap-4">
          {arrivals.map((v) => (
            <div
              key={v.id}
              className="rounded-xl p-5 bg-black/40 backdrop-blur-md border border-black/30 shadow-md"
            >
              <div className="text-white font-semibold">
                {v.visitor.fullName}
              </div>
              <div className="text-white/80 text-sm mt-1">
                Host: {v.host?.fullName || "—"} • {v.destination}
              </div>
            </div>
          ))}

          {arrivals.length === 0 && (
            <div className="text-black/70 text-sm">
              No pending arrivals.
            </div>
          )}
        </div>
      </div>

      {/* CURRENTLY INSIDE */}
      <div>
        <div className="text-xl font-semibold mb-4 text-black">
          Currently Inside
        </div>

        <div className="grid gap-4">
          {activeVisits.map((v) => {
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
                  </div>
                  <div className="text-sm text-white/80 mt-1">
                    {v.destination} • {mins} mins
                  </div>
                </div>
                <Badge tone={tone as any}>{mins}m</Badge>
              </div>
            );
          })}

          {activeVisits.length === 0 && (
            <div className="text-black/70 text-sm">
              No active visitors.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
