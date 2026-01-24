'use server';

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { safeCode } from "@/lib/utils";
import { runEscalationSweep } from "@/lib/escalation";

export async function securityCheckIn(formData: FormData) {
  const s = await requireSession();
  if (s.role !== "SECURITY") throw new Error("FORBIDDEN");

  const code = String(formData.get(\"code\") || \"\").trim().toUpperCase();
  const idNumber = String(formData.get(\"idNumber\") || \"\").trim();

  if (!code && !idNumber) return { ok: false, error: \"Enter code or ID number.\" };

  let visit = null;
  if (code) visit = await prisma.visit.findUnique({ where: { code }, include: { visitor: true } });

  if (!visit && idNumber) {
    // if visitor exists, pick most recent pending invite
    const visitor = await prisma.visitor.findFirst({ where: { idNumber } });
    if (visitor) {
      visit = await prisma.visit.findFirst({
        where: { visitorId: visitor.id, status: \"PENDING_ARRIVAL\" },
        orderBy: { createdAt: \"desc\" },
        include: { visitor: true },
      });
    }
  }

  if (!visit) return { ok: false, error: \"No matching invite found. Use Walk-in capture.\" };
  if (visit.checkInAt) return { ok: false, error: \"Already checked in.\" };

  await prisma.([
    prisma.visit.update({
      where: { id: visit.id },
      data: { checkInAt: new Date(), status: \"CHECKED_IN\" },
    }),
    prisma.event.create({
      data: { visitId: visit.id, type: \"CHECKIN\", note: \"Checked in at gate\", actorUserId: s.uid },
    }),
  ]);

  return { ok: true };
}

export async function securityWalkIn(formData: FormData) {
  const s = await requireSession();
  if (s.role !== \"SECURITY\") throw new Error(\"FORBIDDEN\");

  const fullName = String(formData.get(\"fullName\") || \"\").trim();
  const idNumber = String(formData.get(\"idNumber\") || \"\").trim();
  const email = String(formData.get(\"email\") || \"\").trim();
  const phone = String(formData.get(\"phone\") || \"\").trim();
  const vehiclePlate = String(formData.get(\"vehiclePlate\") || \"\").trim();
  const numPeople = Number(formData.get(\"numPeople\") || 1);
  const purpose = String(formData.get(\"purpose\") || \"\").trim();
  const destination = String(formData.get(\"destination\") || \"\").trim();

  if (!fullName || !idNumber || !purpose || !destination) return { ok: false, error: \"Missing required fields.\" };

  const visitor = await prisma.visitor.upsert({
    where: { idNumber },
    update: { fullName, email: email || null, phone: phone || null },
    create: { fullName, idNumber, email: email || null, phone: phone || null },
  });

  const code = safeCode(7);

  await prisma.visit.create({
    data: {
      code,
      status: \"CHECKED_IN\",
      purpose,
      destination,
      numPeople: Number.isFinite(numPeople) ? numPeople : 1,
      vehiclePlate: vehiclePlate || null,
      visitorId: visitor.id,
      createdByUserId: s.uid,
      checkInAt: new Date(),
      events: { create: [{ type: \"WALKIN_CREATED\", note: \"Captured at gate (walk-in)\", actorUserId: s.uid }] },
    },
  });

  return { ok: true, code };
}

export async function securityConfirmExit(formData: FormData) {
  const s = await requireSession();
  if (s.role !== \"SECURITY\") throw new Error(\"FORBIDDEN\");

  const code = String(formData.get(\"code\") || \"\").trim().toUpperCase();
  if (!code) return { ok: false, error: \"Enter visitor code.\" };

  const visit = await prisma.visit.findUnique({ where: { code } });
  if (!visit) return { ok: false, error: \"Visitor not found.\" };
  if (visit.exitConfirmedAt) return { ok: false, error: \"Already exit-confirmed.\" };

  await prisma.([
    prisma.visit.update({
      where: { code },
      data: { exitConfirmedAt: new Date(), status: \"EXIT_CONFIRMED\" },
    }),
    prisma.event.create({
      data: { visitId: visit.id, type: \"EXIT_CONFIRMED\", note: \"Exit confirmed at gate\", actorUserId: s.uid },
    }),
  ]);

  return { ok: true };
}

export async function securityPulse() {
  await runEscalationSweep();
  return { ok: true };
}