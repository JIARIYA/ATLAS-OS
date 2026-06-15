import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, addMonths, startOfMonth, startOfWeek, ymd } from "@/lib/dates";

const WD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function MiniCalendar({
  view,
  anchorISO,
  activeStartISO,
  activeDays,
}: {
  view: string;
  anchorISO: string;
  activeStartISO: string;
  activeDays: number;
}) {
  const anchor = new Date(anchorISO);
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeStart = new Date(activeStartISO);
  const activeEnd = addDays(activeStart, activeDays);

  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const href = (d: Date) => `/calendar?view=${view}&date=${ymd(d)}`;

  return (
    <div className="rounded-xl border bg-surface p-3 shadow-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <div className="flex items-center gap-0.5">
          <Link href={href(addMonths(anchor, -1))} className="rounded-md p-1 text-muted hover:bg-surface2" aria-label="Previous month"><ChevronLeft size={15} /></Link>
          <Link href={href(addMonths(anchor, 1))} className="rounded-md p-1 text-muted hover:bg-surface2" aria-label="Next month"><ChevronRight size={15} /></Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WD.map((d) => (
          <div key={d} className="py-1 text-[10px] font-medium text-faint">{d}</div>
        ))}
        {cells.map((d) => {
          const inMonth = d.getMonth() === monthStart.getMonth();
          const isToday = d.getTime() === today.getTime();
          const inActive = d >= activeStart && d < activeEnd;
          return (
            <Link
              key={d.toISOString()}
              href={href(d)}
              className="flex aspect-square items-center justify-center rounded-md text-[11px] transition-colors hover:bg-surface2"
              style={{
                background: isToday ? "var(--accent)" : inActive ? "var(--accent-soft)" : "transparent",
                color: isToday ? "#fff" : inActive ? "var(--accent-ink)" : inMonth ? "var(--ink)" : "var(--faint)",
                fontWeight: isToday || inActive ? 600 : 400,
              }}
            >
              {d.getDate()}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
