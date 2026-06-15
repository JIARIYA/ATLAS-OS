import { computeCapacity, type CapacityTask, type Profile } from "./capacity";
import { daysUntil } from "./dates";
import { scoreTask, type ScorableTask, type ScoreResult } from "./scoring";
import { isDone, isOpen } from "./status";

// The recommendation engine ties the spine together. It answers the five
// dashboard questions: what matters today, what should I focus on, what's at
// risk, am I on track, what am I neglecting.

export interface TaskInput extends ScorableTask, CapacityTask {
  id: string;
  title: string;
  progress: number;
  startDate: Date | null;
  energy: string;
  domainId: string | null;
  domain?: { name: string; color: string; key: string } | null;
  project?: { goalId: string | null; title?: string } | null;
}

export interface GoalInput {
  id: string;
  title: string;
  status: string;
  importance: number;
  targetValue: number | null;
  currentValue: number;
  startValue: number;
  targetDate: Date | null;
  createdAt: Date;
  domainId: string | null;
}

export interface ProjectInput {
  id: string;
  title: string;
  status: string;
  targetDate: Date | null;
  tasks: { status: string }[];
}

export interface DomainInput {
  id: string;
  key: string;
  name: string;
  color: string;
}

export type Severity = "high" | "medium" | "low";

export interface RiskItem {
  kind: "overdue" | "due_soon" | "capacity" | "goal_pace" | "project";
  title: string;
  detail: string;
  severity: Severity;
}

export interface ScoredTask {
  task: TaskInput;
  result: ScoreResult;
}

export interface GoalPace {
  goal: GoalInput;
  expected: number; // 0..1
  actual: number; // 0..1
  behind: boolean;
  status: "ahead" | "on_track" | "behind" | "no_target";
}

export function isActionable(t: TaskInput, now = new Date()): boolean {
  if (!isOpen(t.status)) return false;
  // Respect a future start date — not actionable yet.
  const d = daysUntil(t.startDate, now);
  if (d !== null && d > 0) return false;
  return true;
}

export function scoreAndRank(tasks: TaskInput[]): ScoredTask[] {
  return tasks
    .filter((t) => isActionable(t))
    .map((task) => ({ task, result: scoreTask(task) }))
    .sort((a, b) => b.result.score - a.result.score);
}

export function goalPace(goal: GoalInput, now = new Date()): GoalPace {
  if (!goal.targetValue || !goal.targetDate) {
    return { goal, expected: 0, actual: 0, behind: false, status: "no_target" };
  }
  const total = goal.targetValue - goal.startValue;
  const actual = total === 0 ? 1 : (goal.currentValue - goal.startValue) / total;
  const elapsed = now.getTime() - new Date(goal.createdAt).getTime();
  const duration = new Date(goal.targetDate).getTime() - new Date(goal.createdAt).getTime();
  const expected = duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration));
  const gap = actual - expected;
  let status: GoalPace["status"];
  if (gap >= 0.05) status = "ahead";
  else if (gap <= -0.1) status = "behind";
  else status = "on_track";
  return {
    goal,
    expected: clamp01(expected),
    actual: clamp01(actual),
    behind: status === "behind",
    status,
  };
}

export interface Dashboard {
  nextAction: ScoredTask | null;
  focus: ScoredTask[]; // top actionable tasks
  risks: RiskItem[];
  capacity: ReturnType<typeof computeCapacity>;
  goalPaces: GoalPace[];
  neglectedDomains: DomainInput[];
  orphanCount: number;
  onTrackSummary: { total: number; onTrack: number; behind: number };
}

export function buildDashboard(
  tasks: TaskInput[],
  goals: GoalInput[],
  projects: ProjectInput[],
  domains: DomainInput[],
  profile: Profile,
  now = new Date(),
): Dashboard {
  const ranked = scoreAndRank(tasks);
  const capacity = computeCapacity(tasks as CapacityTask[], profile, now);
  const risks: RiskItem[] = [];

  // Overdue tasks.
  const overdue = tasks.filter(
    (t) => isOpen(t.status) && t.dueDate && daysUntil(t.dueDate, now)! < 0,
  );
  for (const t of overdue.slice(0, 5)) {
    const d = Math.abs(Math.ceil(daysUntil(t.dueDate, now)!));
    risks.push({
      kind: "overdue",
      title: t.title,
      detail: `Overdue by ${d} day${d === 1 ? "" : "s"}`,
      severity: "high",
    });
  }

  // Due soon but barely started.
  const dueSoon = tasks.filter((t) => {
    if (!isOpen(t.status)) return false;
    const d = daysUntil(t.dueDate, now);
    return d !== null && d >= 0 && d <= 2 && t.progress < 50;
  });
  for (const t of dueSoon.slice(0, 5)) {
    risks.push({
      kind: "due_soon",
      title: t.title,
      detail: `Due within 2 days, ${t.progress}% done`,
      severity: "medium",
    });
  }

  // Capacity overload.
  if (capacity.today.overloaded) {
    risks.push({
      kind: "capacity",
      title: "Today is overcommitted",
      detail: `${capacity.today.committedHours}h of work vs ${capacity.today.availableHours}h available (${capacity.today.overBy}h over)`,
      severity: "high",
    });
  }
  if (capacity.week.overloaded) {
    risks.push({
      kind: "capacity",
      title: "This week is overcommitted",
      detail: `${capacity.week.committedHours}h committed vs ${capacity.week.availableHours}h available (${capacity.week.overBy}h over)`,
      severity: "medium",
    });
  }

  // Goals behind pace.
  const goalPaces = goals
    .filter((g) => g.status === "active")
    .map((g) => goalPace(g, now));
  for (const gp of goalPaces.filter((g) => g.behind).slice(0, 5)) {
    risks.push({
      kind: "goal_pace",
      title: gp.goal.title,
      detail: `${Math.round(gp.actual * 100)}% complete but should be ~${Math.round(
        gp.expected * 100,
      )}% by now`,
      severity: gp.goal.importance >= 4 ? "high" : "medium",
    });
  }

  // Projects with a near deadline and unfinished tasks.
  for (const p of projects.filter((p) => p.status === "active")) {
    const d = daysUntil(p.targetDate, now);
    if (d === null) continue;
    const open = p.tasks.filter((t) => !isDone(t.status)).length;
    if (d >= 0 && d <= 7 && open > 0) {
      risks.push({
        kind: "project",
        title: p.title,
        detail: `${open} open task${open === 1 ? "" : "s"}, due in ${Math.ceil(d)} day${
          Math.ceil(d) === 1 ? "" : "s"
        }`,
        severity: open > 3 ? "high" : "medium",
      });
    } else if (d < 0 && open > 0) {
      risks.push({
        kind: "project",
        title: p.title,
        detail: `Past target date with ${open} open task${open === 1 ? "" : "s"}`,
        severity: "high",
      });
    }
  }

  // Domain neglect: active domains with zero open actionable tasks.
  const domainsWithOpenWork = new Set(
    tasks
      .filter((t) => isOpen(t.status))
      .map((t) => t.domainId)
      .filter(Boolean) as string[],
  );
  const neglectedDomains = domains.filter((d) => !domainsWithOpenWork.has(d.id));

  const orphanCount = ranked.filter((r) => r.result.isOrphan).length;

  const severityRank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  const withTarget = goalPaces.filter((g) => g.status !== "no_target");
  const onTrackSummary = {
    total: withTarget.length,
    onTrack: withTarget.filter((g) => g.status === "on_track" || g.status === "ahead").length,
    behind: withTarget.filter((g) => g.status === "behind").length,
  };

  return {
    nextAction: ranked[0] ?? null,
    focus: ranked.slice(0, 6),
    risks,
    capacity,
    goalPaces,
    neglectedDomains,
    orphanCount,
    onTrackSummary,
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
