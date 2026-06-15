import { describe, expect, it } from "vitest";
import { scoreTask, type ScorableTask } from "./scoring";
import { computeCapacity, type CapacityTask, type Profile } from "./capacity";
import {
  buildDashboard,
  goalPace,
  type DomainInput,
  type GoalInput,
  type ProjectInput,
  type TaskInput,
} from "./recommendation";

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

function task(overrides: Partial<ScorableTask> = {}): ScorableTask {
  return {
    status: "new",
    impact: 3,
    urgency: 3,
    effortHours: 1,
    dueDate: null,
    goalId: null,
    projectId: null,
    project: null,
    ...overrides,
  };
}

describe("scoring engine", () => {
  it("scores completed tasks as zero", () => {
    expect(scoreTask(task({ status: "completed" })).score).toBe(0);
  });

  it("factor contributions sum to the total score", () => {
    const r = scoreTask(task({ impact: 4, urgency: 3, effortHours: 2, goalId: "g1" }));
    const sum = r.factors.reduce((s, f) => s + f.contribution, 0);
    expect(Math.round(sum)).toBe(r.score);
  });

  it("flags tasks with no strategic link as orphans", () => {
    expect(scoreTask(task()).isOrphan).toBe(true);
    expect(scoreTask(task({ goalId: "g1" })).isOrphan).toBe(false);
    expect(scoreTask(task({ projectId: "p1" })).isOrphan).toBe(false);
    expect(scoreTask(task({ project: { goalId: "g1" } })).isOrphan).toBe(false);
  });

  it("ranks an overdue, high-impact, goal-linked task above a low one", () => {
    const hot = scoreTask(task({ impact: 5, urgency: 5, effortHours: 1, dueDate: daysFromNow(-1), goalId: "g" }));
    const cold = scoreTask(task({ impact: 1, urgency: 1, effortHours: 8 }));
    expect(hot.score).toBeGreaterThan(cold.score);
    expect(hot.score).toBeGreaterThanOrEqual(65);
  });

  it("rewards quick wins via the leverage factor", () => {
    const quick = scoreTask(task({ effortHours: 0 }));
    const slow = scoreTask(task({ effortHours: 8 }));
    const lev = (r: ReturnType<typeof scoreTask>) => r.factors.find((f) => f.key === "leverage")!.value;
    expect(lev(quick)).toBeGreaterThan(lev(slow));
  });
});

function capTask(o: Partial<CapacityTask> = {}): CapacityTask {
  return { status: "new", effortHours: 1, progress: 0, dueDate: null, startDate: null, ...o };
}
const profile: Profile = { deepWorkHoursPerDay: 4, totalHoursPerDay: 8, workdays: "1,2,3,4,5" };

describe("capacity engine", () => {
  it("flags an overcommitted day", () => {
    const cap = computeCapacity([capTask({ effortHours: 6, dueDate: new Date() })], profile);
    expect(cap.today.overloaded).toBe(true);
    expect(cap.today.overBy).toBeCloseTo(2, 1);
  });

  it("does not flag a day within capacity", () => {
    const cap = computeCapacity([capTask({ effortHours: 2, dueDate: new Date() })], profile);
    expect(cap.today.overloaded).toBe(false);
  });

  it("discounts committed effort by progress already made", () => {
    const cap = computeCapacity([capTask({ effortHours: 4, progress: 50, dueDate: new Date() })], profile);
    expect(cap.today.committedHours).toBeCloseTo(2, 1);
  });
});

describe("goal pace", () => {
  const base: GoalInput = {
    id: "g",
    title: "G",
    status: "active",
    importance: 5,
    targetValue: 100,
    currentValue: 10,
    startValue: 0,
    targetDate: daysFromNow(10),
    createdAt: daysFromNow(-10),
    domainId: null,
  };

  it("detects a goal that is behind pace", () => {
    // Halfway through the window but only 10% done.
    expect(goalPace(base).status).toBe("behind");
  });

  it("detects a goal that is ahead of pace", () => {
    expect(goalPace({ ...base, currentValue: 90 }).status).toBe("ahead");
  });

  it("returns no_target when the goal lacks a target", () => {
    expect(goalPace({ ...base, targetValue: null }).status).toBe("no_target");
  });
});

describe("recommendation engine", () => {
  function tInput(o: Partial<TaskInput>): TaskInput {
    return {
      id: Math.random().toString(36).slice(2),
      title: "t",
      status: "new",
      impact: 3,
      urgency: 3,
      effortHours: 1,
      progress: 0,
      energy: "medium",
      dueDate: null,
      startDate: null,
      goalId: null,
      projectId: null,
      domainId: null,
      project: null,
      ...o,
    };
  }
  const domains: DomainInput[] = [
    { id: "d1", key: "career", name: "Career", color: "#000" },
    { id: "d2", key: "health", name: "Health", color: "#111" },
  ];
  const projects: ProjectInput[] = [];

  it("picks the highest-scoring actionable task as next action", () => {
    const tasks = [
      tInput({ id: "low", impact: 1, urgency: 1, effortHours: 8 }),
      tInput({ id: "high", impact: 5, urgency: 5, dueDate: daysFromNow(-1), goalId: "g", domainId: "d1" }),
    ];
    const dash = buildDashboard(tasks, [], projects, domains, profile);
    expect(dash.nextAction?.task.id).toBe("high");
  });

  it("surfaces overdue tasks as high-severity risks", () => {
    const tasks = [tInput({ title: "Overdue thing", dueDate: daysFromNow(-2), domainId: "d1" })];
    const dash = buildDashboard(tasks, [], projects, domains, profile);
    expect(dash.risks.some((r) => r.kind === "overdue" && r.severity === "high")).toBe(true);
  });

  it("reports domains with no open work as neglected", () => {
    const tasks = [tInput({ domainId: "d1" })]; // only career has work
    const dash = buildDashboard(tasks, [], projects, domains, profile);
    expect(dash.neglectedDomains.map((d) => d.id)).toContain("d2");
    expect(dash.neglectedDomains.map((d) => d.id)).not.toContain("d1");
  });

  it("counts orphan tasks", () => {
    const tasks = [tInput({ domainId: "d1" }), tInput({ goalId: "g", domainId: "d1" })];
    const dash = buildDashboard(tasks, [], projects, domains, profile);
    expect(dash.orphanCount).toBe(1);
  });
});
