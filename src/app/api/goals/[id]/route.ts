import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const goal = await prisma.domainGoal.findFirst({ where: { id: params.id, userId } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.domainGoal.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
