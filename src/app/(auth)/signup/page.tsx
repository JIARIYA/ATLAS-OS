import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign up · Atlas OS" };

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-1 text-base font-semibold text-ink">Create your Atlas</h2>
      <p className="mb-4 text-sm text-muted">Start running your life like a system.</p>
      <AuthForm mode="signup" />
    </>
  );
}
