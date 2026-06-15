import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface2 text-faint">
        <Compass size={24} />
      </div>
      <h1 className="text-lg font-semibold text-ink">Off the map</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">
        This page doesn&apos;t exist in your Atlas. Let&apos;s get you back on track.
      </p>
      <Link href="/" className="btn btn-accent mt-5">
        Back to dashboard
      </Link>
    </div>
  );
}
