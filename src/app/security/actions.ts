"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { canTransition } from "@/lib/visitState";

export async function registerWalkin(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "security") redirect("/login");

  const fullName = String(formData.get("fullName") || "");
  const idNumber = String(formData.get("idNumber") || "");
  const destination = String(formData.get("destination") || "");
  const purpose = String(formData.get("purpose") || "");

  if (!fullName || !idNumber || !destination || !purpose) {
    throw new Error("Missing required fields");
  }

  const visitor = await prisma.visitor.upsert({
    where: { idNumber },
    update: { fullName },
    create: { fullName, idNumber },
  });

  await prisma.visit.create({
    data: {
      code: randomUUID().slice(0, 8),
      status: "CHECKED_IN",
      purpose,
      destination,
      visitorId: visitor.id,
      checkInAt: new Date(),
    },
  });

  revalidatePath("/security");
  revalidatePath("/admin");

  redirect("/security");
}

export async function rejectInviteByCode(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "security") redirect("/login");

  const code = String(formData.get("code") || "");

  const visit = await prisma.visit.findUnique({
    where: { code },
    include: { visitor: true },
  });

  if (!visit) throw new Error("Visit not found");

    if (!canTransition(visit.status as any, "REJECTED")) {
    throw new Error("Invalid state transition");
  }

  await prisma.visit.update({
    where: { code },
    data: { status: "REJECTED" },
  });

  await prisma.notification.create({
    data: {
      role: "HOST",
      title: "Visitor Rejected",
      body: `Your visitor ${visit.visitor.fullName} was rejected at security.`,
      level: "warning",
      visitCode: visit.code,
    },
  });

  revalidatePath("/security");
  revalidatePath("/admin");

  redirect("/security");
}

export async function checkInInviteByCode(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "security") redirect("/login");

  const code = String(formData.get("code") || "");

  await prisma.visit.update({
    where: { code },
    data: {
      status: "CHECKED_IN",
      checkInAt: new Date(),
    },
  });

  revalidatePath("/security");
  revalidatePath("/admin");

  redirect("/security");
}

export async function confirmExit(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "security") redirect("/login");

  const fullName = String(formData.get("fullName") || "").trim();
  if (!fullName) throw new Error("Full name is required");

  const visit = await prisma.visit.findFirst({
    where: {
      status: "CHECKED_IN",
      visitor: {
        fullName: {
          contains: fullName
        },
      },
    },
    orderBy: {
      checkInAt: "desc",
    },
    include: {
      visitor: true,
    },
  });

  if (!visit) throw new Error("No active visit found for this visitor");

  const exitTime = new Date();
  const durationMinutes = visit.checkInAt
    ? Math.floor((exitTime.getTime() - visit.checkInAt.getTime()) / 60000)
    : 0;

  await prisma.visit.update({
    where: { id: visit.id },
    data: {
      status: "COMPLETED",
      exitConfirmedAt: exitTime,
      durationMinutes,
    },
  });

  revalidatePath("/security");
  revalidatePath("/admin");

  redirect("/security");
}
