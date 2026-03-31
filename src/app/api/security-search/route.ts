import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await requireSession();
  if (session.role !== "security") return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";

  if (!query) return NextResponse.json([]);

  const visitors = await prisma.visit.findMany({
    where: {
      status: { in: ["CHECKED_IN", "CHECKOUT_REQUESTED"] },
      exitConfirmedAt: null,
      visitor: {
        fullName: { contains: query }
      }
    },
    include: { visitor: true }
  });

  return NextResponse.json(visitors);
}
