import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const dateParam = req.nextUrl.searchParams.get("date");
  const resolvedParam = req.nextUrl.searchParams.get("resolved");

  const where: Record<string, unknown> = { userId };

  if (dateParam) {
    const d = new Date(dateParam);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  }

  if (resolvedParam !== null) {
    where.resolved = resolvedParam === "true";
  }

  const commitments = await prisma.commitment.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: commitments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const text = (body.text ?? "").trim().slice(0, 1000);
  if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const commitment = await prisma.commitment.create({
    data: {
      userId,
      text,
      date: body.date ? new Date(body.date) : new Date(),
      sourceReviewId: body.sourceReviewId ?? null,
    },
  });
  return NextResponse.json({ data: commitment }, { status: 201 });
}
