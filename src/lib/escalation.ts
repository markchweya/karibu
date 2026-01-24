import { prisma } from "./db";

/**
 * Thresholds in minutes after checkoutStartAt.
 * 10: notify SECURITY
 * 13: notify SECURITY
 * 15: notify SECURITY
 * 16: escalate ADMIN
 */
const thresholds = [
  { min: 10, role: "SECURITY" as const, type: "OVERDUE_10", level: "warn", title: "Visitor overdue (10m)" },
  { min: 13, role: "SECURITY" as const, type: "OVERDUE_13", level: "warn", title: "Visitor overdue (13m)" },
  { min: 15, role: "SECURITY" as const, type: "OVERDUE_15", level: "danger", title: "Visitor overdue (15m)" },
  { min: 16, role: "ADMIN" as const, type: "ESCALATED_16", level: "danger", title: "Escalation: visitor overstayed" },
];

export async function runEscalationSweep() {
  const open = await prisma.visit.findMany({
    where: {
      checkoutStartAt: { not: null },
      exitConfirmedAt: null,
      status: { in: ["HOST_CHECKOUT_STARTED", "OVERDUE_10", "OVERDUE_13", "OVERDUE_15", "ESCALATED_16"] },
    },
    select: { id: true, code: true, checkoutStartAt: true, status: true },
  });

  const now = Date.now();

  for (const v of open) {
    const start = v.checkoutStartAt?.getTime();
    if (!start) continue;
    const elapsedMin = (now - start) / 60000;

    for (const th of thresholds) {
      if (elapsedMin < th.min) continue;

      const already = await prisma.event.findFirst({
        where: { visitId: v.id, type: th.type },
        select: { id: true },
      });
      if (already) continue;

      await prisma.([
        prisma.event.create({
          data: {
            visitId: v.id,
            type: th.type,
            note: Elapsed: m,
            meta: { elapsedMin },
          },
        }),
        prisma.notification.create({
          data: {
            role: th.role,
            title: th.title,
            body: Visit  has exceeded exit grace period.,
            level: th.level,
            visitCode: v.code,
          },
        }),
        prisma.visit.update({
          where: { id: v.id },
          data: { status: th.type },
        }),
      ]);
    }
  }
}