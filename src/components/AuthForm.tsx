"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { authenticate, register } from "@/app/auth-actions";
import { Spinner } from "./ui/skeleton";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-accent w-full py-2.5" disabled={pending}>
      {pending ? <Spinner size={16} /> : label}
    </button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? authenticate : register;
  const [error, formAction] = useFormState(action, undefined);

  return (
    <form action={formAction} className="space-y-3.5">
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">
            Name
          </label>
          <input id="name" name="name" required autoComplete="name" className="input" placeholder="Ada Lovelace" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input"
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />

      <p className="pt-1 text-center text-xs text-muted">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link href="/signup" className="font-medium text-accent-ink">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent-ink">
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
