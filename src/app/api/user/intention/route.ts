import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const intention = (body.intention ?? "").trim().slice(0, 500);
  const date = body.date ? new Date(body.date) : new Date();

  await prisma.user.update({
    where: { id: userId },
    data: { todayIntention: intention || null, intentionDate: date },
  });

  return NextResponse.json({ ok: true });
}
