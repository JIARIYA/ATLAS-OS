import { auth } from "@/auth";

// Returns the current user's id. Routes are gated by middleware, so in practice
// this is always present inside the app; we throw defensively otherwise.
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}
