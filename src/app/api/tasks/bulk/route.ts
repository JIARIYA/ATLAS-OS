import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) return NextResponse.json({ updated: 0, deleted: 0 });

  // Validate all IDs belong to user
  const owned = await prisma.task.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });
  const ownedIds = owned.map((t) => t.id);

  let updated = 0;
  let deleted = 0;

  if (body.delete === true) {
    const result = await prisma.task.deleteMany({ where: { id: { in: ownedIds }, userId } });
    deleted = result.count;
  } else if (body.update) {
    const allowedFields = ["status", "priority", "completedAt"] as const;
    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body.update[field] !== undefined) data[field] = body.update[field];
    }
    if (data.status === "completed") {
      data.completedAt = new Date();
      data.progress = 100;
    }
    if (Object.keys(data).length > 0) {
      const result = await prisma.task.updateMany({ where: { id: { in: ownedIds }, userId }, data });
      updated = result.count;
    }
  }

  return NextResponse.json({ updated, deleted });
}
