import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, Flag, Gauge, Sparkles, TrendingUp } from "lucide-react";
import { AddTaskForm } from "@/components/AddTaskForm";
import { ScoreBadge } from "@/components/TaskCard";
import { TaskActions } from "@/components/TaskActions";
import { ActivityTracker, EnergyCard, MilestonesWidget, PeakHours, StreakCard, Widget } from "@/components/HomeWidgets";
import { Badge } from "@/components/ui";
import { formatRelativeDue } from "@/lib/dates";
import { getFormOptions, getHomeData } from "@/lib/queries";
import type { Severity } from "@/lib/recommendation";

export const dynamic = "force-dynamic";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const RISK_ICON: Record<string, typeof AlertTriangle> = {
  overdue: AlertTriangle, due_soon: Clock, capacity: Gauge, goal_pace: TrendingUp, project: Flag,
};

export default async function DashboardPage() {
  const [home, options] = await Promise.all([getHomeData(), getFormOptions()]);
  const { dash } = home;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const firstName = home.name.split(" ")[0];

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">{greeting()}, {firstName} 👋</p>
          <h1 className="mt-0.5 text-[26px] font-semibold tracking-tight text-ink">Let&apos;s make progress today!</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-lg border bg-surface px-3 py-2 text-sm text-muted shadow-xs sm:inline-block">{today}</span>
          <AddTaskForm options={options} />
        </div>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-12 gap-4">
        <ActivityTracker items={home.activityToday} total={home.totalTodayHours} />
        <MilestonesWidget items={home.milestones} />
        <StreakCard streak={home.streak} weekStrip={home.weekStrip} />
        <EnergyCard trend={home.energyTrend} latest={home.latestEnergy} />
        <PeakHours heat={home.heat} heatMax={home.heatMax} hours={home.hours} />

        {/* Do this next */}
        <div className="col-span-12 md:col-span-7">
          <Widget
            title="Do this next"
            icon={Sparkles}
            right={<Link href="/tasks" className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink">All tasks <ArrowRight size={12} /></Link>}
          >
            {dash.nextAction ? (
              <div className="flex items-start gap-3">
                <ScoreBadge score={dash.nextAction.result.score} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{dash.nextAction.task.title}</div>
                  <p className="mt-0.5 text-xs text-muted">
                    {dash.nextAction.result.headline}. {formatRelativeDue(dash.nextAction.task.dueDate)}, ~{dash.nextAction.task.effortHours}h.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dash.nextAction.result.factors.map((f) => (
                      <span key={f.key} className="rounded-md bg-surface2 px-2 py-0.5 text-[11px] text-muted">{f.label} <span className="font-semibold text-ink">+{f.contribution.toFixed(0)}</span></span>
                    ))}
                  </div>
                </div>
                <TaskActions id={dash.nextAction.task.id} title={dash.nextAction.task.title} status={dash.nextAction.task.status} progress={dash.nextAction.task.progress} />
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-faint">Nothing actionable right now.</div>
            )}
          </Widget>
        </div>

        {/* At risk */}
        <div className="col-span-12 md:col-span-5">
          <Widget title="At risk" icon={AlertTriangle} right={<span className="text-xs text-faint">{dash.risks.length}</span>}>
            {dash.risks.length ? (
              <div className="space-y-2">
                {dash.risks.slice(0, 4).map((r, i) => {
                  const Icon = RISK_ICON[r.kind] ?? AlertTriangle;
                  return (
                    <div key={i} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                      <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                        <Icon size={14} className="shrink-0 text-faint" />
                        <span className="truncate">{r.title}</span>
                      </span>
                      <Badge tone={r.severity as Severity}>{r.severity}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-faint">Nothing at risk. 🎯</div>
            )}
          </Widget>
        </div>
      </div>
    </div>
  );
}
