// Small date helpers. All reasoning is done in the server's local time, which is
// fine for a single-user MVP.
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Days from now until `date`. Negative = overdue. Fractional.
export function daysUntil(date: Date | null | undefined, from: Date = new Date()): number | null {
  if (!date) return null;
  return (new Date(date).getTime() - from.getTime()) / MS_PER_DAY;
}

// ISO weekday: Mon=1 ... Sun=7
export function isoWeekday(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

// End of the current week (Sunday 23:59), week starting Monday.
export function endOfWeek(d: Date = new Date()): Date {
  const wd = isoWeekday(d);
  const daysLeft = 7 - wd;
  const x = endOfDay(d);
  x.setDate(x.getDate() + daysLeft);
  return x;
}

// Count workdays (from profile.workdays) remaining in the week, including today.
export function remainingWorkdaysThisWeek(workdays: number[], from: Date = new Date()): number {
  const todayWd = isoWeekday(from);
  return workdays.filter((wd) => wd >= todayWd).length;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Monday 00:00 of the week containing `d`.
export function startOfWeek(d: Date = new Date()): Date {
  const wd = isoWeekday(d); // Mon=1..Sun=7
  const x = startOfDay(d);
  x.setDate(x.getDate() - (wd - 1));
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfMonth(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

// Local YYYY-MM-DD (for URL params), tz-safe.
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatRelativeDue(date: Date | null | undefined): string {
  const d = daysUntil(date);
  if (d === null) return "no due date";
  if (d < -1) return `${Math.abs(Math.ceil(d))}d overdue`;
  if (d < 0) return "overdue";
  if (d < 1) return "due today";
  if (d < 2) return "due tomorrow";
  if (d < 7) return `due in ${Math.ceil(d)}d`;
  if (d < 14) return "due next week";
  return `due in ${Math.ceil(d / 7)}w`;
}

export function fmtDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
