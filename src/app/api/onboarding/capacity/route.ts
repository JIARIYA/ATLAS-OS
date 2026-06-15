import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const workdays: string = body.workdays ?? "1,2,3,4,5";
  const deepWorkHours = Math.max(1, Math.min(12, Number(body.deepWorkHours) || 4));
  const totalWorkHours = Math.max(1, Math.min(16, Number(body.totalWorkHours) || 8));

  await prisma.user.update({
    where: { id: userId },
    data: { workdays, deepWorkHours, totalWorkHours },
  });

  // Keep Profile in sync
  await prisma.profile.upsert({
    where: { userId },
    update: { workdays, deepWorkHoursPerDay: deepWorkHours, totalHoursPerDay: totalWorkHours },
    create: { userId, workdays, deepWorkHoursPerDay: deepWorkHours, totalHoursPerDay: totalWorkHours },
  });

  return NextResponse.json({ ok: true });
}
