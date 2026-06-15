import { Target } from "lucide-react";
import { AddGoalForm } from "@/components/AddGoalForm";
import { Badge, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { horizonName } from "@/lib/horizons";
import { goalPace, type GoalInput } from "@/lib/recommendation";
import { getFormOptions, getGoalsWithLadder } from "@/lib/queries";

export const dynamic = "force-dynamic";

const PACE_TONE = {
  ahead: "ok",
  on_track: "ok",
  behind: "medium",
  no_target: "low",
} as const;

const PACE_LABEL = {
  ahead: "ahead",
  on_track: "on track",
  behind: "behind",
  no_target: "no target set",
} as const;

export default async function GoalsPage() {
  const [goals, options] = await Promise.all([getGoalsWithLadder(), getFormOptions()]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Target}
        title="Goals"
        subtitle="Measurable outcomes across horizons. Atlas tracks whether you're keeping pace."
        action={<AddGoalForm options={options} />}
      />

      {goals.length === 0 ? (
        <EmptyState title="No goals yet." hint="Add a goal so your tasks have something to ladder up to." />
      ) : (
        <div className="space-y-3">
          {goals.map((g) => {
            const pace = goalPace(g as unknown as GoalInput);
            const hasTarget = pace.status !== "no_target";
            return (
              <div key={g.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold">{g.title}</span>
                      <Badge tone="accent">{horizonName(g.horizon)}</Badge>
                      {g.domain && (
                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: g.domain.color }} />
                          {g.domain.name}
                        </span>
                      )}
                      {"★".repeat(g.importance)}
                    </div>
                    {g.parent && (
                      <div className="mt-1 text-xs" style={{ color: "var(--faint)" }}>
                        ↑ ladders up to <span style={{ color: "var(--muted)" }}>{g.parent.title}</span>
                      </div>
                    )}
                    {g.description && (
                      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                        {g.description}
                      </p>
                    )}
                  </div>
                  <Badge tone={PACE_TONE[pace.status]}>{PACE_LABEL[pace.status]}</Badge>
                </div>

                {hasTarget && (
                  <div className="mt-4">
                    <div className="mb-1 flex items-baseline justify-between text-xs" style={{ color: "var(--muted)" }}>
                      <span>
                        {g.currentValue} / {g.targetValue} {g.unit ?? ""}{" "}
                        {g.metric && <span style={{ color: "var(--faint)" }}>· {g.metric}</span>}
                      </span>
                      <span>target {fmtDate(g.targetDate)}</span>
                    </div>
                    {/* actual progress with an expected-pace marker */}
                    <div className="relative">
                      <ProgressBar
                        pct={pace.actual * 100}
                        color={pace.behind ? "var(--warn)" : "var(--ok)"}
                        height={8}
                      />
                      <div
                        className="absolute top-[-2px] h-3 w-0.5"
                        style={{ left: `${pace.expected * 100}%`, background: "var(--ink)", opacity: 0.5 }}
                        title={`Expected ~${Math.round(pace.expected * 100)}% by now`}
                      />
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: "var(--faint)" }}>
                      {Math.round(pace.actual * 100)}% done · expected ~{Math.round(pace.expected * 100)}% by today
                      <span className="ml-2">| marker = where you should be</span>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex gap-4 text-xs" style={{ color: "var(--faint)" }}>
                  <span>{g._count.children} sub-goals</span>
                  <span>{g._count.projects} projects</span>
                  <span>{g._count.tasks} tasks</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
