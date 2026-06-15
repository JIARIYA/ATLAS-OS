import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, Flame, Smile, Target } from "lucide-react";
import { ProgressBar } from "./ui";

function fmtHM(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function Widget({
  title,
  icon: Icon,
  right,
  className = "",
  children,
}: {
  title: string;
  icon?: LucideIcon;
  right?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`card p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          {Icon && <Icon size={15} className="text-muted" />}
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export function ActivityTracker({ items, total }: { items: { name: string; color: string; hours: number }[]; total: number }) {
  return (
    <Widget title="Activity tracker" icon={Activity} className="col-span-12 md:col-span-5" right={<span className="text-xs text-faint">Today</span>}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-ink">{fmtHM(total) || "0m"}</span>
        <span className="text-xs text-faint">planned today</span>
      </div>
      <div className="mt-4 space-y-2.5">
        {items.length === 0 && <div className="rounded-lg border border-dashed p-3 text-center text-xs text-faint">Nothing scheduled today.</div>}
        {items.map((a) => (
          <div key={a.name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: a.color }} />{a.name}</span>
              <span className="tabular-nums text-muted">{fmtHM(a.hours)}</span>
            </div>
            <ProgressBar pct={total ? (a.hours / total) * 100 : 0} color={a.color} height={7} />
          </div>
        ))}
      </div>
    </Widget>
  );
}

export function MilestonesWidget({ items }: { items: { id: string; title: string; color: string; pct: number; done: number; total: number }[] }) {
  return (
    <Widget title="Milestones" icon={Target} className="col-span-12 md:col-span-7">
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.length === 0 && <div className="col-span-full rounded-lg border border-dashed p-3 text-center text-xs text-faint">No active projects.</div>}
        {items.map((m) => (
          <div key={m.id} className="rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <span className="truncate text-sm font-medium">{m.title}</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: m.color }}>{m.pct}%</span>
            </div>
            <div className="mt-2"><ProgressBar pct={m.pct} color={m.color} height={6} /></div>
            <div className="mt-1.5 text-[11px] text-faint">{m.done}/{m.total} tasks done</div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

/** @deprecated use WeekHeatmap */
export function StreakCard({ streak, weekStrip }: { streak: number; weekStrip: { label: string; done: boolean; isToday: boolean }[] }) {
  return <WeekHeatmap weekStrip={weekStrip} completedThisWeek={streak} />;
}

export function WeekHeatmap({ weekStrip, completedThisWeek }: { weekStrip: { label: string; done: boolean; isToday: boolean }[]; completedThisWeek: number }) {
  const allEmpty = weekStrip.every((d) => !d.done);
  return (
    <Widget title="This week" icon={Flame} className="col-span-6 md:col-span-3">
      <div className="text-xs text-muted mb-3">
        <span className="text-base font-bold text-ink tabular-nums">{completedThisWeek}</span>
        {" "}tasks completed
      </div>
      <div className="flex justify-between">
        {weekStrip.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
              style={{
                background: d.done ? "var(--accent)" : "var(--surface2)",
                color: d.done ? "#fff" : "var(--faint)",
                outline: d.isToday ? "2px solid var(--accent)" : "none",
                outlineOffset: "2px",
              }}>
              {d.done ? "✓" : ""}
            </div>
            <span className="text-[10px] text-faint">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-faint">
        {allEmpty ? "Start today" : "Keep it going →"}
      </div>
    </Widget>
  );
}

export function EnergyCard({ trend, latest }: { trend: number[]; latest: number | null }) {
  const pts = trend.length >= 2 ? trend : [latest ?? 3, latest ?? 3];
  const max = 5;
  const w = 200;
  const h = 48;
  const step = pts.length > 1 ? w / (pts.length - 1) : w;
  const path = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / max) * h}`).join(" ");
  return (
    <Widget title="Energy" icon={Smile} className="col-span-6 md:col-span-3">
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tabular-nums text-ink">{latest ?? "—"}</span>
        {latest != null && <span className="text-xs text-faint">/ 5</span>}
      </div>
      <div className="mt-1 text-[11px] text-faint">From your reviews</div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 w-full" preserveAspectRatio="none" height={48}>
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {trend.length === 0 && <div className="mt-1 text-[11px] text-faint">Log a review to track energy.</div>}
    </Widget>
  );
}

export function PeakHours({ heat, heatMax, hours }: { heat: number[][]; heatMax: number; hours: number[] }) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <Widget title="Peak hours" icon={Activity} className="col-span-12 md:col-span-6">
      <div className="flex gap-1.5">
        <div className="flex flex-col justify-between py-0.5 pr-1 text-[10px] text-faint">
          {days.map((d, i) => <span key={i} className="leading-[14px]">{d}</span>)}
        </div>
        <div className="flex-1">
          <div className="space-y-1">
            {heat.map((row, r) => (
              <div key={r} className="flex gap-1">
                {row.map((v, c) => (
                  <div key={c} className="aspect-square flex-1 rounded-[3px]" title={`${hours[c]}:00 · ${v} task${v === 1 ? "" : "s"}`} style={{ background: v === 0 ? "var(--surface-2)" : `color-mix(in srgb, var(--ok) ${20 + (v / heatMax) * 80}%, transparent)` }} />
                ))}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-faint">
            <span>{hours[0]}:00</span>
            <span>{hours[Math.floor(hours.length / 2)]}:00</span>
            <span>{hours[hours.length - 1]}:00</span>
          </div>
        </div>
      </div>
    </Widget>
  );
}
