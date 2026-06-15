import { Clock, Flag, Folder, Zap } from "lucide-react";
import { formatRelativeDue } from "@/lib/dates";
import type { ScoreResult } from "@/lib/scoring";
import { TaskActions } from "./TaskActions";

export interface TaskCardData {
  id: string;
  title: string;
  status: string;
  progress: number;
  effortHours: number;
  energy: string;
  dueDate: Date | null;
  domain?: { name: string; color: string } | null;
  project?: { title?: string | null } | null;
}

function scoreTone(score: number): string {
  if (score >= 65) return "var(--danger)";
  if (score >= 45) return "var(--warn)";
  return "var(--muted)";
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const color = scoreTone(score);
  const dim = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return (
    <div
      className={`flex ${dim} shrink-0 flex-col items-center justify-center rounded-xl border text-center tabular-nums`}
      style={{ borderColor: color, color, background: `color-mix(in srgb, ${color} 7%, transparent)` }}
      title="Priority score (0–100)"
    >
      <span className={size === "sm" ? "text-sm font-bold leading-none" : "text-base font-bold leading-none"}>
        {score}
      </span>
      <span className="text-[8px] font-medium uppercase tracking-wide opacity-60">score</span>
    </div>
  );
}

function FactorBreakdown({ result }: { result: ScoreResult }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {result.factors.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1 rounded-md bg-surface2 px-1.5 py-0.5 text-[10px] text-muted"
          title={`${f.label}: ${f.note} — +${f.contribution.toFixed(0)} pts (weight ${(f.weight * 100).toFixed(0)}%)`}
        >
          {f.label} <span className="font-semibold text-ink">+{f.contribution.toFixed(0)}</span>
        </span>
      ))}
    </div>
  );
}

export function TaskCard({
  task,
  result,
  showFactors = false,
}: {
  task: TaskCardData;
  result?: ScoreResult;
  showFactors?: boolean;
}) {
  const done = task.status === "completed";
  const overdue = !done && task.dueDate && new Date(task.dueDate).getTime() < Date.now();
  return (
    <div className="group flex items-start gap-3 rounded-xl border bg-surface p-3 shadow-xs transition-shadow hover:shadow-sm">
      {result ? (
        <ScoreBadge score={result.score} />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-xs text-faint">
          —
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="truncate text-sm font-medium"
            style={{ color: done ? "var(--faint)" : "var(--ink)", textDecoration: done ? "line-through" : "none" }}
          >
            {task.title}
          </span>
          {task.status === "in_progress" && (
            <span className="chip shrink-0" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              active
            </span>
          )}
          {result?.isOrphan && (
            <span
              className="chip shrink-0"
              style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
              title="No strategic link to a goal or project"
            >
              <Flag size={11} strokeWidth={2.2} /> orphan
            </span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {task.domain && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: task.domain.color }} />
              {task.domain.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1" style={{ color: overdue ? "var(--danger)" : undefined }}>
            <Clock size={12} strokeWidth={1.8} />
            {formatRelativeDue(task.dueDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap size={12} strokeWidth={1.8} />
            {task.effortHours}h · {task.energy}
          </span>
          {task.project?.title && (
            <span className="inline-flex items-center gap-1">
              <Folder size={12} strokeWidth={1.8} />
              {task.project.title}
            </span>
          )}
          {task.progress > 0 && !done && <span className="tabular-nums">{task.progress}%</span>}
        </div>

        {showFactors && result && result.factors.length > 0 && <FactorBreakdown result={result} />}
      </div>

      <TaskActions id={task.id} title={task.title} status={task.status} progress={task.progress} />
    </div>
  );
}
