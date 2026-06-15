import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border bg-surface text-muted shadow-xs">
            <Icon size={18} strokeWidth={1.8} />
          </div>
        )}
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-faint">{children}</h2>
      {right}
    </div>
  );
}

export function DomainDot({ color, name }: { color?: string | null; name?: string | null }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full" style={{ background: color ?? "var(--faint)" }} />
      {name}
    </span>
  );
}

export function ProgressBar({
  pct,
  color = "var(--accent)",
  track = "var(--surface-2)",
  height = 6,
}: {
  pct: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ background: track, height }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}

const TONES: Record<string, { bg: string; fg: string }> = {
  high: { bg: "var(--danger-soft)", fg: "var(--danger)" },
  medium: { bg: "var(--warn-soft)", fg: "var(--warn)" },
  low: { bg: "var(--surface-2)", fg: "var(--muted)" },
  ok: { bg: "var(--ok-soft)", fg: "var(--ok)" },
  accent: { bg: "var(--accent-soft)", fg: "var(--accent-ink)" },
};

export function Badge({
  children,
  tone = "low",
  icon: Icon,
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
  icon?: LucideIcon;
}) {
  const s = TONES[tone] ?? TONES.low;
  return (
    <span className="chip" style={{ background: s.bg, color: s.fg }}>
      {Icon && <Icon size={12} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  icon: Icon,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface2 text-faint">
          <Icon size={20} strokeWidth={1.6} />
        </div>
      )}
      <div className="text-sm font-medium text-muted">{title}</div>
      {hint && <div className="mt-1 text-xs text-faint">{hint}</div>}
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone = "low",
}: {
  label: string;
  value: ReactNode;
  tone?: keyof typeof TONES;
}) {
  const s = TONES[tone] ?? TONES.low;
  return (
    <div className="rounded-xl border bg-surface px-3 py-2.5 shadow-xs">
      <div className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums" style={{ color: s.fg }}>
        {value}
      </div>
    </div>
  );
}
