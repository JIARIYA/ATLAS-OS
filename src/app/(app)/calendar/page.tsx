import { PlannerBoard } from "@/components/PlannerBoard";
import { addDays, startOfDay, startOfMonth, startOfWeek } from "@/lib/dates";
import { getFormOptions, getPlanner } from "@/lib/queries";

export const dynamic = "force-dynamic";

export type CalView = "day" | "week" | "month" | "year";

function parseAnchor(s?: string): Date {
  if (s) {
    const d = new Date(`${s}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: { view?: string; date?: string };
}) {
  const rawView = searchParams.view;
  const view: CalView =
    rawView === "day" || rawView === "month" || rawView === "year"
      ? rawView
      : "week";
  const anchor = parseAnchor(searchParams.date);

  let renderStart: Date;
  let renderDays: number;
  let queryStart: Date;
  let queryEnd: Date;
  let activeStart: Date;
  let activeDays: number;

  if (view === "day") {
    renderStart = startOfDay(anchor);
    renderDays = 1;
    queryStart = renderStart;
    queryEnd = addDays(renderStart, 1);
    activeStart = renderStart;
    activeDays = 1;
  } else if (view === "week") {
    renderStart = startOfWeek(anchor);
    renderDays = 7;
    queryStart = renderStart;
    queryEnd = addDays(renderStart, 7);
    activeStart = renderStart;
    activeDays = 7;
  } else if (view === "year") {
    const yearStart = new Date(anchor.getFullYear(), 0, 1);
    const yearEnd = new Date(anchor.getFullYear() + 1, 0, 1);
    renderStart = yearStart;
    renderDays = Math.ceil((yearEnd.getTime() - yearStart.getTime()) / 86400000);
    queryStart = yearStart;
    queryEnd = yearEnd;
    activeStart = yearStart;
    activeDays = renderDays;
  } else {
    const monthStart = startOfMonth(anchor);
    renderStart = startOfWeek(monthStart);
    renderDays = 42;
    queryStart = renderStart;
    queryEnd = addDays(renderStart, 42);
    activeStart = monthStart;
    activeDays = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  }

  const [planner, options] = await Promise.all([
    getPlanner(queryStart, queryEnd),
    getFormOptions(),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="mb-3" data-app-hide-on-focus>
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">Planner</h1>
      </div>
      <PlannerBoard
        view={view}
        anchorISO={anchor.toISOString()}
        renderStartISO={renderStart.toISOString()}
        renderDays={renderDays}
        activeStartISO={activeStart.toISOString()}
        activeDays={activeDays}
        planned={planner.planned}
        waiting={planner.waiting}
        members={planner.members}
        options={{ members: planner.members, projects: options.projects }}
      />
    </div>
  );
}
