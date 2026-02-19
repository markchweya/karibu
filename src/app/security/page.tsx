import Shell from "@/components/Shell";
import { rejectInviteByCode } from "./actions";
import Badge from "@/components/Badge";
import LiveDuration from "@/components/LiveDuration";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logoutAction } from "../login/actions";
import { revalidatePath } from "next/cache";

function minutesBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / 60000);
}

async function checkIn(formData: FormData) {
  "use server";
  const visitId = String(formData.get("visitId") || "");
  if (!visitId) return;

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: "CHECKED_IN",
      checkInAt: new Date(),
    },
  });

  revalidatePath("/security");
  revalidatePath("/host");
  revalidatePath("/admin");
}

async function confirmExit(formData: FormData) {
  "use server";
  const visitId = String(formData.get("visitId") || "");
  if (!visitId) return;

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || !visit.checkInAt) return;

  const durationMinutes = minutesBetween(new Date(), visit.checkInAt);

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: "COMPLETED",
      exitConfirmedAt: new Date(),
      durationMinutes,
    },
  });

  revalidatePath("/security");
  revalidatePath("/host");
  revalidatePath("/admin");
}

export default async function SecurityHome() {
  const session = await requireSession();
  if (session.role !== "security") throw new Error("FORBIDDEN");

  const [
    pendingArrivals,
    activeVisits,
    checkoutRequestedVisits,
    escalatedCount
  ] = await Promise.all([
    prisma.visit.findMany({
      where: { status: "REGISTERED" },
      include: { visitor: true, host: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.visit.findMany({
      where: { status: "CHECKED_IN", exitConfirmedAt: null },
      include: { visitor: true, host: true },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.visit.findMany({
      where: { status: "CHECKOUT_REQUESTED", exitConfirmedAt: null },
      include: { visitor: true, host: true },
      orderBy: { checkoutStartAt: "asc" },
    }),
    prisma.visit.count({
      where: {
        OR: [
          { status: { contains: "ESCALATED" } },
          {
            status: "CHECKOUT_REQUESTED",
            checkoutStartAt: { not: null },
            // escalated if >= 10 mins
          }
        ]
      },
    }),
  ]);

  const now = new Date();

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
        
        <Link href="/security/walkin" className="btn btn-ghost">Register Walk-in</Link>
        <Link href="/security/exit" className="btn btn-accent">Exit Log</Link>
      </div>

      {/* METRICS */}
      <div className="grid md:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Pending Arrivals", value: pendingArrivals.length },
          { label: "Active Visitors", value: activeVisits.length },
          { label: "Checkout Requested", value: checkoutRequestedVisits.length },
          { label: "Escalated", value: escalatedCount },
        ].map((item) => (
          <div key={item.label} className="card card-pad">
            <div className="label">{item.label}</div>
            <div className="text-3xl font-bold">{item.value}</div>
          </div>
        ))}
      </div>

      {/* ARRIVALS */}
      <div className="mb-12">
        <h2 className="h2 mb-4">Arrivals Queue</h2>
        <div className="grid gap-4">
          {pendingArrivals.map(v => (
            <div key={v.id} className="card card-pad flex justify-between">
              <div>
                <div className="font-semibold">{v.visitor.fullName}</div>
                <div className="text-sm text-gray-600">ID: {v.visitor.idNumber}</div>
                <div className="text-sm text-gray-600">Destination: {v.destination}</div>
                <div className="text-sm text-gray-600">Purpose: {v.purpose}</div>
              </div>
              <div className="flex gap-2">
                <form action={checkIn}>
                  <input type="hidden" name="visitId" value={v.id} />
                  <button className="btn btn-primary">Check In</button>
                </form>

                <form action={rejectInviteByCode}>
                  <input type="hidden" name="code" value={v.code} />
                  <button className="btn btn-ghost text-red-600">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
          {pendingArrivals.length === 0 && (
            <div className="text-gray-600">No pending arrivals.</div>
          )}
        </div>
      </div>

      {/* ACTIVE VISITORS */}
      <div className="mb-12">
        <h2 className="h2 mb-4">Currently Inside</h2>
        <div className="grid gap-4">
          {activeVisits.map(v => (
            <div key={v.id} className="card card-pad flex justify-between">
              <div>
                <div className="font-semibold">{v.visitor.fullName}</div>
                <div className="text-sm text-gray-600">
                  <LiveDuration start={v.checkInAt as Date} /> inside
                </div>
              </div>
              <Badge tone="info">Inside</Badge>
            </div>
          ))}
          {activeVisits.length === 0 && (
            <div className="text-gray-600">No active visitors.</div>
          )}
        </div>
      </div>

      {/* CHECKOUT REQUESTED */}
      <div>
        <h2 className="h2 mb-4">Checkout Requested</h2>
        <div className="grid gap-4">
          {checkoutRequestedVisits.map(v => {
            const over10 = v.checkoutStartAt
              ? minutesBetween(now, v.checkoutStartAt) >= 10
              : false;

            return (
              <div key={v.id} className="card card-pad flex justify-between">
                <div>
                  <div className="font-semibold">{v.visitor.fullName}</div>
                  <div className={`text-sm ${over10 ? "text-red-600 font-semibold" : "text-yellow-600"}`}>
                    Checkout timer: <LiveDuration start={v.checkoutStartAt as Date} />
                  </div>
                  {over10 && (
                    <div className="mt-2 text-sm text-red-600 font-semibold">
                      ⚠ Over 10 minutes since checkout request
                    </div>
                  )}
                </div>
                <form action={confirmExit}>
                  <input type="hidden" name="visitId" value={v.id} />
                  <button className="btn btn-accent">Confirm Exit</button>
                </form>
              </div>
            );
          })}
          {checkoutRequestedVisits.length === 0 && (
            <div className="text-gray-600">No checkout requests.</div>
          )}
        </div>
      </div>
    </Shell>
  );
}
