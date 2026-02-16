"use server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

const MAX_INVITES_PER_DAY = 4;

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function hostCreateInvite(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "host") redirect("/login");

  const visitorName = String(formData.get("visitorName") || "").trim();
  const visitorIdNumber = String(formData.get("visitorIdNumber") || "").trim();
  const purpose = String(formData.get("purpose") || "").trim();
  const destination = String(formData.get("destination") || "").trim();

  if (visitorName.length < 2) redirect("/host/invite?error=name");
  if (visitorIdNumber.length < 4) redirect("/host/invite?error=id");
  if (purpose.length < 2) redirect("/host/invite?error=purpose");

  const hostUser = await prisma.user.findUnique({
    where: { email: session.email },
  });

  if (!hostUser) redirect("/login");

  const today = todayStart();

  const todaysCount = await prisma.visit.count({
    where: {
      hostUserId: hostUser.id,
      createdAt: { gte: today },
    },
  });

  if (todaysCount >= MAX_INVITES_PER_DAY) {
    redirect("/host?flash=limit");
  }

  let visitor = await prisma.visitor.findUnique({
    where: { idNumber: visitorIdNumber },
  });

  if (!visitor) {
    visitor = await prisma.visitor.create({
      data: {
        fullName: visitorName,
        idNumber: visitorIdNumber,
      },
    });
  }

  const code = randomUUID().slice(0, 8).toUpperCase();

  await prisma.visit.create({
    data: {
      code,
      purpose,
      destination,
      visitorId: visitor.id,
      hostUserId: hostUser.id,
      createdByUserId: hostUser.id,
      status: "REGISTERED",
    },
  });

  revalidatePath("/host");
  revalidatePath("/security");
  revalidatePath("/admin");

  redirect("/host?flash=created");
}

export async function hostStartCheckout(formData: FormData) {
  const session = await requireSession();
  if (session.role !== "host") redirect("/login");

  const visitId = String(formData.get("visitId") || "");
  if (!visitId) redirect("/host?flash=bad_checkout");

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
  });

  if (!visit) redirect("/host?flash=not_found");

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      status: "CHECKOUT_REQUESTED",
      checkoutStartAt: new Date(),
    },
  });

  await prisma.notification.create({
    data: {
      role: "SECURITY",
      title: "Checkout Requested",
      body: `Visitor ${visit.code} requested checkout by host.`,

      level: "warning",
      visitCode: visit.code,
    },
  });

  revalidatePath("/host");
  revalidatePath("/security");
  revalidatePath("/admin");

  redirect("/host?flash=checkout_started");
}
