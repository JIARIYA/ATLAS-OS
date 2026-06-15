"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-soft text-danger">
        <AlertTriangle size={24} />
      </div>
      <h1 className="text-lg font-semibold text-ink">Something went sideways</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Atlas hit an unexpected error rendering this view. Your data is safe — try again.
      </p>
      {error.digest && <p className="mt-2 text-xs text-faint">Ref: {error.digest}</p>}
      <button onClick={reset} className="btn btn-accent mt-5">
        <RotateCw size={15} /> Try again
      </button>
    </div>
  );
}
