import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await requireSession();
  if (session.role !== "security") return NextResponse.json({ success: false });

  const { id } = await req.json();

  const visit = await prisma.visit.findUnique({ where: { id } });
  if (!visit || !visit.checkInAt) return NextResponse.json({ success: false });

  const exitTime = new Date();
  const durationMinutes = Math.floor(
    (exitTime.getTime() - visit.checkInAt.getTime()) / 60000
  );

  await prisma.visit.update({
    where: { id },
    data: {
      status: "COMPLETED",
      exitConfirmedAt: exitTime,
      durationMinutes
    }
  });

  return NextResponse.json({ success: true });
}
