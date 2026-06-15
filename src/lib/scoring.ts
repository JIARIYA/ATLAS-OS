import { daysUntil } from "./dates";
import { isDone } from "./status";

// The decision engine. Produces a 0-100 priority score from transparent,
// weighted factors so every recommendation can be explained.
//
// Factors (each normalized to 0..1):
//   impact     — how much this moves the needle (manual 1-5)
//   urgency    — deadline pressure, amplified by due date proximity
//   alignment  — strategic connection (laddered to a goal > project > orphan)
//   leverage   — quick wins rank up (inverse of effort)
//
// Weights are deliberately legible and sum to 1.0.
export const WEIGHTS = {
  impact: 0.3,
  urgency: 0.3,
  alignment: 0.25,
  leverage: 0.15,
} as const;

const EFFORT_CAP_HOURS = 8;

export interface ScorableTask {
  status: string;
  impact: number;
  urgency: number;
  effortHours: number;
  dueDate: Date | null;
  goalId: string | null;
  projectId: string | null;
  project?: { goalId: string | null } | null;
}

export interface ScoreFactor {
  key: keyof typeof WEIGHTS;
  label: string;
  value: number; // normalized 0..1
  weight: number;
  contribution: number; // value * weight * 100
  note: string;
}

export interface ScoreResult {
  score: number; // 0..100
  factors: ScoreFactor[];
  isOrphan: boolean; // no strategic connection — should be flagged
  headline: string; // one-line explanation of the dominant driver
}

function urgencyNormalized(task: ScorableTask): { value: number; note: string } {
  const base = task.urgency / 5;
  const d = daysUntil(task.dueDate);
  if (d === null) {
    // No deadline: dampen so deadlined work outranks open-ended work.
    return { value: base * 0.65, note: "no deadline (damped)" };
  }
  let dueFactor: number;
  let note: string;
  if (d < 0) {
    dueFactor = 1;
    note = "overdue";
  } else if (d < 1) {
    dueFactor = 0.95;
    note = "due today";
  } else if (d <= 3) {
    dueFactor = 0.8;
    note = "due within 3 days";
  } else if (d <= 7) {
    dueFactor = 0.6;
    note = "due this week";
  } else if (d <= 14) {
    dueFactor = 0.42;
    note = "due within 2 weeks";
  } else {
    dueFactor = 0.28;
    note = "due later";
  }
  // Deadline pressure dominates, but manual urgency can only raise it.
  return { value: Math.max(dueFactor, base), note };
}

function alignmentNormalized(task: ScorableTask): {
  value: number;
  note: string;
  isOrphan: boolean;
} {
  const hasGoal = Boolean(task.goalId || task.project?.goalId);
  if (hasGoal) return { value: 1, note: "ladders to a goal", isOrphan: false };
  if (task.projectId) return { value: 0.6, note: "in a project (no goal)", isOrphan: false };
  return { value: 0.2, note: "no strategic link", isOrphan: true };
}

export function scoreTask(task: ScorableTask): ScoreResult {
  if (isDone(task.status)) {
    return { score: 0, factors: [], isOrphan: false, headline: "Not actionable" };
  }

  const impact = { value: task.impact / 5, note: `impact ${task.impact}/5` };
  const urgency = urgencyNormalized(task);
  const alignment = alignmentNormalized(task);
  const leverageValue = 1 - Math.min(task.effortHours, EFFORT_CAP_HOURS) / EFFORT_CAP_HOURS;
  const leverage = {
    value: leverageValue,
    note: `${task.effortHours}h effort`,
  };

  const factors: ScoreFactor[] = [
    {
      key: "impact",
      label: "Impact",
      value: impact.value,
      weight: WEIGHTS.impact,
      contribution: impact.value * WEIGHTS.impact * 100,
      note: impact.note,
    },
    {
      key: "urgency",
      label: "Urgency",
      value: urgency.value,
      weight: WEIGHTS.urgency,
      contribution: urgency.value * WEIGHTS.urgency * 100,
      note: urgency.note,
    },
    {
      key: "alignment",
      label: "Alignment",
      value: alignment.value,
      weight: WEIGHTS.alignment,
      contribution: alignment.value * WEIGHTS.alignment * 100,
      note: alignment.note,
    },
    {
      key: "leverage",
      label: "Leverage",
      value: leverage.value,
      weight: WEIGHTS.leverage,
      contribution: leverage.value * WEIGHTS.leverage * 100,
      note: leverage.note,
    },
  ];

  const score = Math.round(factors.reduce((s, f) => s + f.contribution, 0));
  const top = [...factors].sort((a, b) => b.contribution - a.contribution)[0];
  const headline = `Driven by ${top.label.toLowerCase()} (${top.note})`;

  return { score, factors, isOrphan: alignment.isOrphan, headline };
}
