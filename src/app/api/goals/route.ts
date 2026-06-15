import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const domainId = req.nextUrl.searchParams.get("domainId");
  const where = domainId
    ? { userId, domainId }
    : { userId };

  const goals = await prisma.domainGoal.findMany({
    where,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data: goals });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const title = (body.title ?? "").trim().slice(0, 300);
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const domainId = body.domainId as string | undefined;
  if (domainId) {
    const domain = await prisma.domain.findFirst({ where: { id: domainId, userId } });
    if (!domain) return NextResponse.json({ error: "Domain not found" }, { status: 404 });
  }

  const goal = await prisma.domainGoal.create({
    data: {
      userId,
      title,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      domainId: domainId ?? "",
    },
  });
  return NextResponse.json({ data: goal }, { status: 201 });
}
