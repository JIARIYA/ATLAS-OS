import { daysUntil, endOfDay, endOfWeek, remainingWorkdaysThisWeek } from "./dates";
import { isOpen as isOpenStatus } from "./status";

// The capacity engine. Atlas refuses to pretend a day has more hours than it does.
// It compares committed effort against realistic available deep-work hours and
// flags overload before it becomes a missed deadline.

export interface CapacityTask {
  status: string;
  effortHours: number;
  progress: number;
  dueDate: Date | null;
  startDate: Date | null;
}

export interface CapacityWindow {
  label: string;
  committedHours: number;
  availableHours: number;
  ratio: number; // committed / available
  overloaded: boolean;
  overBy: number; // hours over capacity (0 if fine)
}

function remainingEffort(t: CapacityTask): number {
  // Effort left, discounted by progress already made.
  return Math.max(0, t.effortHours * (1 - t.progress / 100));
}

function isOpen(t: CapacityTask): boolean {
  return isOpenStatus(t.status);
}

export interface Profile {
  deepWorkHoursPerDay: number;
  totalHoursPerDay: number;
  workdays: string; // "1,2,3,4,5"
}

export function parseWorkdays(workdays: string): number[] {
  return workdays
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

export function computeCapacity(tasks: CapacityTask[], profile: Profile, now = new Date()) {
  const workdays = parseWorkdays(profile.workdays);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now);

  // TODAY: overdue + due-today + anything in progress.
  const todayCommitted = tasks
    .filter((t) => isOpen(t))
    .filter((t) => {
      if (t.status === "in_progress") return true;
      const d = daysUntil(t.dueDate, now);
      return d !== null && new Date(t.dueDate!).getTime() <= todayEnd.getTime();
    })
    .reduce((s, t) => s + remainingEffort(t), 0);

  // THIS WEEK: everything due on or before end of week.
  const weekCommitted = tasks
    .filter((t) => isOpen(t))
    .filter((t) => t.dueDate && new Date(t.dueDate).getTime() <= weekEnd.getTime())
    .reduce((s, t) => s + remainingEffort(t), 0);

  const todayAvailable = profile.deepWorkHoursPerDay;
  const weekAvailable =
    profile.deepWorkHoursPerDay * Math.max(1, remainingWorkdaysThisWeek(workdays, now));

  const mkWindow = (label: string, committed: number, available: number): CapacityWindow => {
    const ratio = available > 0 ? committed / available : committed > 0 ? Infinity : 0;
    return {
      label,
      committedHours: round(committed),
      availableHours: round(available),
      ratio: Number.isFinite(ratio) ? round(ratio) : 99,
      overloaded: committed > available,
      overBy: round(Math.max(0, committed - available)),
    };
  };

  return {
    today: mkWindow("Today", todayCommitted, todayAvailable),
    week: mkWindow("This week", weekCommitted, weekAvailable),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
