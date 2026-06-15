import { auth } from "@/auth";
import { logout } from "@/app/auth-actions";
import { MobileHeader } from "@/components/MobileHeader";
import { Sidebar } from "@/components/Sidebar";
import { prisma } from "@/lib/db";
import { getFormOptions } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  // Guard against a session whose user no longer exists (e.g. deleted account).
  const dbUser = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
    : null;
  if (!dbUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="card max-w-sm p-6">
          <h1 className="text-lg font-semibold">Your session expired</h1>
          <p className="mt-1 text-sm text-muted">Please sign in again to continue.</p>
          <form action={logout} className="mt-4">
            <button type="submit" className="btn btn-accent w-full">Sign in again</button>
          </form>
        </div>
      </div>
    );
  }
  const user = session?.user
    ? { name: session.user.name ?? "You", email: session.user.email ?? "" }
    : { name: "You", email: "" };
  const options = await getFormOptions();
  const members = options.members;

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} members={members} options={{ members, projects: options.projects }} />
      <main data-app-main className="flex-1 overflow-x-hidden">
        <MobileHeader />
        <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-8 md:py-7">{children}</div>
      </main>
    </div>
  );
}
