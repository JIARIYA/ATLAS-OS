import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json([], { status: 401 });
  const userId = session.user.id;

  const parent = await prisma.task.findFirst({ where: { id: params.id, userId }, select: { id: true } });
  if (!parent) return NextResponse.json([]);

  const subtasks = await prisma.task.findMany({
    where: { parentTaskId: params.id, userId },
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(subtasks);
}
