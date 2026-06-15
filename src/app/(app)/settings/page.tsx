import { AlertTriangle, Clock, Flag, Gauge, Lightbulb, TrendingUp } from "lucide-react";
import { updateProfile } from "@/app/actions";
import { Badge, PageHeader, ProgressBar, SectionTitle, StatPill } from "@/components/ui";
import { getCapacityData } from "@/lib/queries";
import type { CapacityWindow } from "@/lib/capacity";
import type { Severity } from "@/lib/recommendation";

export const dynamic = "force-dynamic";

const RISK_ICON: Record<string, typeof AlertTriangle> = {
  overdue: AlertTriangle, due_soon: Clock, capacity: Gauge, goal_pace: TrendingUp, project: Flag,
};

function CapacityBar({ w }: { w: CapacityWindow }) {
  const pct = w.availableHours > 0 ? (w.committedHours / w.availableHours) * 100 : 100;
  const color = w.overloaded ? "var(--danger)" : pct > 80 ? "var(--warn)" : "var(--ok)";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="font-medium text-muted">{w.label}</span>
        <span className="tabular-nums" style={{ color }}>{w.committedHours}h / {w.availableHours}h</span>
      </div>
      <ProgressBar pct={Math.min(100, pct)} color={color} height={8} />
    </div>
  );
}

function Donut({ items }: { items: { name: string; color: string; hours: number }[] }) {
  const total = items.reduce((s, i) => s + i.hours, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={110} height={110} viewBox="0 0 110 110" className="shrink-0">
        <circle cx={55} cy={55} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={14} />
        {total > 0 && items.map((it) => {
          const frac = it.hours / total;
          const seg = (
            <circle key={it.name} cx={55} cy={55} r={r} fill="none" stroke={it.color} strokeWidth={14}
              strokeDasharray={`${frac * c} ${c}`} strokeDashoffset={-offset * c} transform="rotate(-90 55 55)" />
          );
          offset += frac;
          return seg;
        })}
        <text x={55} y={52} textAnchor="middle" className="fill-[var(--ink)] text-[15px] font-bold">{total.toFixed(1)}h</text>
        <text x={55} y={66} textAnchor="middle" className="fill-[var(--faint)] text-[8px]">committed</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-1">
        {items.length === 0 && <div className="text-xs text-faint">No open work.</div>}
        {items.slice(0, 6).map((it) => (
          <div key={it.name} className="flex items-center justify-between text-xs">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-muted"><span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} /><span className="truncate">{it.name}</span></span>
            <span className="tabular-nums text-muted">{it.hours.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CapacityPage() {
  const data = await getCapacityData();
  const maxDay = Math.max(1, ...data.completedPerDay.map((d) => d.count));

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader icon={Gauge} title="Capacity" subtitle="How committed you are versus the hours you actually have — with recommendations." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatPill label="Planned this week" value={`${data.capacity.week.committedHours}h`} tone={data.capacity.week.overloaded ? "high" : "low"} />
        <StatPill label="Available this week" value={`${data.capacity.week.availableHours}h`} />
        <StatPill label="Completed (7d)" value={data.completedThisWeek} tone="ok" />
        <StatPill label="Open commitments" value={data.openTotal} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-1">
          <SectionTitle>Recommendations</SectionTitle>
          <div className="space-y-2">
            {data.capacity.today.overloaded && (
              <Rec icon={Gauge} tone="high" title="Today is overcommitted" detail={`${data.capacity.today.overBy}h over — defer your lowest-priority tasks.`} />
            )}
            {data.risks.slice(0, 4).map((r, i) => {
              const Icon = RISK_ICON[r.kind] ?? AlertTriangle;
              return <Rec key={i} icon={Icon} tone={r.severity} title={r.title} detail={r.detail} />;
            })}
            {data.neglectedDomains.length > 0 && (
              <Rec icon={Lightbulb} tone="medium" title={`${data.neglectedDomains.length} neglected domain${data.neglectedDomains.length === 1 ? "" : "s"}`} detail={`No active work in ${data.neglectedDomains.slice(0, 3).map((d) => d.name).join(", ")}. Schedule some time.`} />
            )}
            {data.risks.length === 0 && !data.capacity.today.overloaded && data.neglectedDomains.length === 0 && (
              <div className="rounded-lg border border-dashed p-3 text-center text-xs text-faint">Balanced — nothing to flag. 🎯</div>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <SectionTitle>Planned vs available</SectionTitle>
              <div className="space-y-3"><CapacityBar w={data.capacity.today} /><CapacityBar w={data.capacity.week} /></div>
            </div>
            <div className="card p-4">
              <SectionTitle>Time by category</SectionTitle>
              <Donut items={data.byCategory} />
            </div>
          </div>
          <div className="card p-4">
            <SectionTitle>Completed — last 7 days</SectionTitle>
            <div className="flex h-28 items-end gap-2">
              {data.completedPerDay.map((d, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t-md" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count > 0 ? 6 : 0, background: d.isToday ? "var(--accent)" : "var(--ok)" }} title={`${d.count} completed`} />
                  </div>
                  <span className="text-[10px] tabular-nums text-faint">{d.count}</span>
                  <span className="text-[10px] text-faint">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <form action={updateProfile} className="card max-w-2xl space-y-4 p-5">
        <SectionTitle>Your capacity settings</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Your name</label>
            <input name="name" defaultValue={data.profile.name} className="input" />
          </div>
          <div>
            <label className="label">Workdays (Mon=1 … Sun=7)</label>
            <input name="workdays" defaultValue={data.profile.workdays} className="input" placeholder="1,2,3,4,5" />
          </div>
          <div>
            <label className="label">Deep-work hours / day</label>
            <input name="deepWorkHoursPerDay" type="number" step="0.5" min={0} max={16} defaultValue={data.profile.deepWorkHoursPerDay} className="input" />
          </div>
          <div>
            <label className="label">Total working hours / day</label>
            <input name="totalHoursPerDay" type="number" step="0.5" min={0} max={24} defaultValue={data.profile.totalHoursPerDay} className="input" />
          </div>
        </div>
        <button type="submit" className="btn btn-accent">Save capacity</button>
      </form>
    </div>
  );
}

function Rec({ icon: Icon, tone, title, detail }: { icon: typeof AlertTriangle; tone: Severity; title: string; detail: string }) {
  return (
    <div className="rounded-xl border p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium"><Icon size={14} className="shrink-0 text-faint" /><span className="truncate">{title}</span></span>
        <Badge tone={tone}>{tone}</Badge>
      </div>
      <div className="mt-1 pl-6 text-xs text-muted">{detail}</div>
    </div>
  );
}
