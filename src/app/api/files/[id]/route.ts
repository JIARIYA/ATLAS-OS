import { promises as fs } from "fs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const att = await prisma.attachment.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!att || !att.path) return new Response("Not found", { status: 404 });

  try {
    const data = await fs.readFile(att.path);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": att.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(att.filename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("File missing", { status: 404 });
  }
}
