import Shell from "@/components/Shell";
import Badge from "@/components/Badge";
import LiveDuration from "@/components/LiveDuration";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "../login/actions";
import { redirect } from "next/navigation";

function minutesSince(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 60000);
}

import { revalidatePath } from "next/cache";

async function requestCheckout(formData: FormData) {
  "use server";
  const visitId = formData.get("visitId") as string;

  if (!visitId) return;

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: "CHECKOUT_REQUESTED",
      checkoutStartAt: new Date(),
    },
  });

  revalidatePath("/host");
  revalidatePath("/security");
  revalidatePath("/admin");
}

export default async function HostHome() {
  const session = await requireSession();

  if (session.role !== "host") {
    redirect("/login");
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    myTotalVisits,
    myTodayVisits,
    myActiveVisits,
    myEscalations,
    myPendingInvites
  ] = await Promise.all([
    prisma.visit.count({ where: { host: { email: session.email } } }),
    prisma.visit.count({
      where: {
        host: { email: session.email },
        createdAt: { gte: startOfToday }
      }
    }),
    prisma.visit.findMany({
      where: {
        host: { email: session.email },
        checkInAt: { not: null },
        exitConfirmedAt: null
      },
      include: { visitor: true },
      orderBy: { checkInAt: "asc" }
    }),
    prisma.visit.count({
      where: {
        host: { email: session.email },
        status: { contains: "ESCALATED" }
      }
    }),
    prisma.visit.findMany({
      where: {
        host: { email: session.email },
        status: "REGISTERED"
      },
      include: { visitor: true },
      orderBy: { createdAt: "desc" }
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
      {/* METRICS */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "My Total Visits", value: myTotalVisits },
          { label: "Today", value: myTodayVisits },
          { label: "Active Now", value: myActiveVisits.length },
          { label: "Escalations", value: myEscalations },
          { label: "Avg Duration (min)", value: avgDuration }
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

      <div className="flex justify-end mb-6">
        <a
          href="/host/invite"
          className="px-5 py-3 rounded-lg bg-black/60 text-white font-medium hover:bg-black/70 transition"
        >
          + Invite Visitor
        </a>
      </div>

      {/* ACTIVE VISITORS */}
      <div>
        <div className="text-xl font-semibold mb-5 text-black">
          My Active Visitors
        </div>

        <div className="grid gap-4">
          {myActiveVisits.map((v) => {
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
                    {v.destination}
                  </div>

                  <div className="text-sm text-white/70 mt-1">
                    {v.status === "CHECKOUT_REQUESTED" && v.checkoutStartAt ? (
                    <>
                      <span className={
                        (Date.now() - new Date(v.checkoutStartAt as Date).getTime()) / 60000 >= 10
                          ? "text-red-500 font-semibold"
                          : "text-yellow-300"
                      }>
                        <LiveDuration start={v.checkoutStartAt as Date} /> since checkout request
                      </span>
                    </>
                  ) : (
                    <>
                      <LiveDuration start={v.checkInAt as Date} /> inside
                    </>
                  )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge tone={v.status === "CHECKOUT_REQUESTED" ? "warning" as any : tone as any}>
                    {mins}m
                  </Badge>

                  {v.status === "CHECKOUT_REQUESTED" ? (
                    <div className="px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 text-sm font-semibold">
                      Checkout Requested
                    </div>
                  ) : (
                    <form action={requestCheckout}>
                      <input type="hidden" name="visitId" value={v.id} />
                      <button className="btn btn-primary text-sm">
                        Checkout
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}

          {myActiveVisits.length === 0 && (
            <div className="text-black/70 text-sm">
              No active visitors.
            </div>
          )}
        </div>
      </div>

      {/* PENDING INVITES */}
      <div className="mt-14">
        <div className="text-xl font-semibold mb-5 text-black">
          Pending Invites
        </div>

        <div className="grid gap-4">
          {myPendingInvites.map((v) => (
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
                  {v.destination}
                </div>

                <div className="text-sm text-yellow-300 mt-1">
                  Awaiting Security Check-in
                </div>
              </div>

              <form
                action={async (formData: FormData) => {
                  "use server";
                  const visitId = formData.get("visitId") as string;
                  if (!visitId) return;

                  await prisma.visit.update({
                    where: { id: visitId },
                    data: { status: "CANCELLED" }
                  });

                  revalidatePath("/host");
                  revalidatePath("/security");
                  revalidatePath("/admin");
                }}
              >
                <input type="hidden" name="visitId" value={v.id} />
                <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm transition">
                  Cancel Invite
                </button>
              </form>
            </div>
          ))}

          {myPendingInvites.length === 0 && (
            <div className="text-black/70 text-sm">
              No pending invites.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
