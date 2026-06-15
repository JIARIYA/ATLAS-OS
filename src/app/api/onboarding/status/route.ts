import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [taskCount, reviewCount, user] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.review.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { intentionDate: true } }),
  ]);

  const complete = taskCount > 0 || reviewCount > 0 || user?.intentionDate != null;
  return NextResponse.json({ complete });
}
