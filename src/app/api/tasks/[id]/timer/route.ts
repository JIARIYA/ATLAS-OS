import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = params;
  const body = await req.json();
  const action: "start" | "stop" = body.action;

  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "start") {
    await prisma.task.update({ where: { id }, data: { timerStartedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  if (action === "stop") {
    if (!task.timerStartedAt) return NextResponse.json({ ok: true });
    const elapsed = Math.floor((Date.now() - task.timerStartedAt.getTime()) / 1000);
    await prisma.task.update({
      where: { id },
      data: { trackedSeconds: task.trackedSeconds + elapsed, timerStartedAt: null },
    });
    return NextResponse.json({ ok: true, elapsed });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
