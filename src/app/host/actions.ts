'use server';

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { safeCode } from "@/lib/utils";
import { runEscalationSweep } from "@/lib/escalation";
import { inviteQuestionnaire } from "@/lib/questionnaire";

function getQ(formData: FormData) {
  const q: Record<string, any> = {};
  for (const item of inviteQuestionnaire) {
    const v = String(formData.get(item.key) || "").trim();
    if (item.required && !v) throw new Error(\Missing: \\);
    q[item.key] = v;
  }
  return q;
}

export async function hostCreateInvite(formData: FormData) {
  const s = await requireSession();
  if (s.role !== "HOST") throw new Error("FORBIDDEN");

  const fullName = String(formData.get("fullName") || "").trim();
  const idNumber = String(formData.get("idNumber") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const vehiclePlate = String(formData.get("vehiclePlate") || "").trim();
  const numPeople = Number(formData.get("numPeople") || 1);
  const purpose = String(formData.get("purpose") || "").trim();
  const destination = String(formData.get("destination") || "").trim();

  if (!fullName || !idNumber || !purpose || !destination) {
    return { ok: false, error: "Missing required fields." };
  }

  const questionnaire = getQ(formData);

  const code = safeCode(7);

  const visitor = await prisma.visitor.upsert({
    where: { idNumber },
    update: { fullName, email: email || null, phone: phone || null },
    create: { fullName, idNumber, email: email || null, phone: phone || null },
  });

  const visit = await prisma.visit.create({
    data: {
      code,
      status: "PENDING_ARRIVAL",
      purpose,
      destination,
      numPeople: Number.isFinite(numPeople) ? numPeople : 1,
      vehiclePlate: vehiclePlate || null,
      questionnaire,
      visitorId: visitor.id,
      hostUserId: s.uid,
      createdByUserId: s.uid,
      events: { create: [{ type: "INVITE_CREATED", note: "Invite created by host" }] },
    },
    select: { code: true },
  });

  // Email stub (Resend later): store as event for now
  await prisma.event.create({
    data: { visitId: (await prisma.visit.findUnique({ where: { code: visit.code }, select: { id: true } }))!.id, type: "INVITE_SENT", note: "Email stub: visitor invited" },
  });

  return { ok: true, code: visit.code };
}

export async function hostStartCheckout(formData: FormData) {
  const s = await requireSession();
  if (s.role !== "HOST") throw new Error("FORBIDDEN");

  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a visitor code." };

  const visit = await prisma.visit.findUnique({ where: { code } });
  if (!visit) return { ok: false, error: "Visitor not found." };

  // Claim if gate-created without host
  const canClaim = !visit.hostUserId;
  if (visit.hostUserId && visit.hostUserId !== s.uid) return { ok: false, error: "This visit is assigned to a different host." };

  if (!visit.checkInAt) return { ok: false, error: "Visitor has not been checked in by security yet." };
  if (visit.exitConfirmedAt) return { ok: false, error: "Already checked out at gate." };

  await prisma.([
    prisma.visit.update({
      where: { code },
      data: {
        hostUserId: canClaim ? s.uid : undefined,
        checkoutStartAt: visit.checkoutStartAt ?? new Date(),
        status: "HOST_CHECKOUT_STARTED",
      },
    }),
    prisma.event.create({
      data: { visitId: visit.id, type: "HOST_CHECKOUT", note: "Host initiated checkout (10-min exit clock started)", actorUserId: s.uid },
    }),
  ]);

  // Email stub (Resend later): create event
  await prisma.event.create({
    data: { visitId: visit.id, type: "EXIT_WINDOW_EMAIL", note: "Email stub: 'You have 10 minutes to exit premises'" },
  });

  await runEscalationSweep();
  return { ok: true };
}

export async function hostPulse() {
  await runEscalationSweep();
  return { ok: true };
}