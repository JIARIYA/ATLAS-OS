// Task status pipeline, modeled on Bordio/ClickUp: New → Scheduled → In progress → Completed.
export const STATUSES = ["new", "scheduled", "in_progress", "completed"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  Status,
  { label: string; color: string; soft: string; icon: string }
> = {
  new: { label: "New task", color: "#6b7280", soft: "#eef0f3", icon: "✉" },
  scheduled: { label: "Scheduled", color: "#d97706", soft: "#fdf3e3", icon: "🗓" },
  in_progress: { label: "In progress", color: "#2d7ff9", soft: "#e7f0ff", icon: "🚀" },
  completed: { label: "Completed", color: "#30a46c", soft: "#e7f6ee", icon: "✅" },
};

export const OPEN_STATUSES: Status[] = ["new", "scheduled", "in_progress"];

export function isOpen(status: string): boolean {
  return (OPEN_STATUSES as string[]).includes(status);
}
export function isDone(status: string): boolean {
  return status === "completed";
}

// Task "type" tag (the ClickUp-style Type column).
export const TYPES = ["operational", "important", "design", "feedback", "meeting"] as const;
export type TaskType = (typeof TYPES)[number];

export const TYPE_META: Record<TaskType, { label: string; color: string }> = {
  operational: { label: "Operational", color: "#7aa7ff" },
  important: { label: "Important", color: "#5fd0d8" },
  design: { label: "Design", color: "#f7a8a8" },
  feedback: { label: "Feedback", color: "#a3d9c9" },
  meeting: { label: "Meeting", color: "#c4b5fd" },
};

// A stable palette for member avatar colors.
export const MEMBER_COLORS = [
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#14b8a6",
  "#f97316",
];
