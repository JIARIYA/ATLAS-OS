import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in · Atlas OS" };

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-1 text-base font-semibold text-ink">Welcome back</h2>
      <p className="mb-4 text-sm text-muted">Sign in to continue to your Atlas.</p>
      <AuthForm mode="login" />
      <p className="mt-4 rounded-lg bg-surface2 px-3 py-2 text-center text-[11px] text-faint">
        Demo account: <span className="font-medium text-muted">demo@atlas.app</span> / <span className="font-medium text-muted">password123</span>
      </p>
    </>
  );
}
