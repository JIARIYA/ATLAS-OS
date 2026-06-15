export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md ${className}`}
      style={{ background: "var(--surface-2)" }}
    >
      <div
        className="absolute inset-0 -translate-x-full"
        style={{
          animation: "atlas-shimmer 1.4s infinite",
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--surface-3) 70%, transparent), transparent)",
        }}
      />
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
