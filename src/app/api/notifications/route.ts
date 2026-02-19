import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await requireSession();

  const notifications = await prisma.notification.findMany({
    where: { role: session.role.toUpperCase() },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notifications);
}

export async function POST(req: Request) {
  const session = await requireSession();
  const { id } = await req.json();

  await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
