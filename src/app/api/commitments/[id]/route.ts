import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const commitment = await prisma.commitment.findFirst({ where: { id: params.id, userId } });
  if (!commitment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  await prisma.commitment.update({
    where: { id: params.id },
    data: { resolved: Boolean(body.resolved) },
  });
  return NextResponse.json({ ok: true });
}
