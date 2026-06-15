"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Maximize2,
  Minimize2,
  Users,
} from "lucide-react";
import { planTask, unplanTask } from "@/app/actions";
import { addDays, addMonths, startOfWeek, ymd } from "@/lib/dates";
import { STATUS_META, TYPE_META, type Status, type TaskType } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { MiniCalendar } from "./MiniCalendar";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useToast } from "./ui/toast";

interface Member {
  id: string;
  name: string;
  color: string;
}

type View = "day" | "week" | "month";

interface Props {
  view: View;
  anchorISO: string;
  renderStartISO: string;
  renderDays: number;
  activeStartISO: string;
  activeDays: number;
  planned: PlannerTask[];
  waiting: PlannerTask[];
  members: Member[];
  options: { members: Member[]; projects: { id: string; title: string }[] };
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtHours(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}:${String(mins).padStart(2, "0")}h`;
}
function fmtTotal(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins === 0 ? `${hrs}h 0m` : `${hrs}h ${mins}m`;
}
function fmtTimeRange(s: string | null, e: string | null): string | null {
  if (!s || !e) return null;
  const f = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false });
  return `${f(new Date(s))} - ${f(new Date(e))}`;
}
function sameDay(iso: string | null, d: Date): boolean {
  if (!iso) return false;
  const x = new Date(iso);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth() && x.getDate() === d.getDate();
}

export function PlannerBoard(props: Props) {
  const { view, anchorISO, renderStartISO, renderDays, activeStartISO, activeDays, planned, waiting, members, options } = props;
  const router = useRouter();
  const [, startT] = useTransition();
  const toast = useToast();

  const [group, setGroup] = useState(true);
  const [focus, setFocus] = useState(false);
  const [selected, setSelected] = useState<PlannerTask | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const scrollCooldown = useRef(false);

  const anchor = new Date(anchorISO);
  const renderStart = new Date(renderStartISO);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayList = Array.from({ length: renderDays }, (_, i) => addDays(renderStart, i));

  const href = (v: View, d: Date) => `/calendar?view=${v}&date=${ymd(d)}`;
  const prevDate = view === "day" ? addDays(anchor, -1) : view === "week" ? addDays(anchor, -7) : addMonths(anchor, -1);
  const nextDate = view === "day" ? addDays(anchor, 1) : view === "week" ? addDays(anchor, 7) : addMonths(anchor, 1);

  function toggleFocus() {
    const next = !focus;
    setFocus(next);
    document.documentElement.classList.toggle("planner-focus", next);
  }

  // Esc exits focus mode (when no task panel is open).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focus && !selected) {
        setFocus(false);
        document.documentElement.classList.remove("planner-focus");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, selected]);

  // Always leave focus mode when unmounting (navigating away).
  useEffect(() => () => document.documentElement.classList.remove("planner-focus"), []);

  // Scroll up/down to navigate between periods.
  useEffect(() => {
    const el = calRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (scrollCooldown.current) return;
      scrollCooldown.current = true;
      setTimeout(() => { scrollCooldown.current = false; }, 600);
      router.push(href(view, e.deltaY > 0 ? nextDate : prevDate));
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view, prevDate, nextDate, router]);

  function tasksFor(rowId: string | null, day: Date): PlannerTask[] {
    return planned
      .filter((t) => sameDay(t.plannedDate, day))
      .filter((t) => {
        if (!group || view === "month") return true;
        if (rowId === "__none__") return !t.responsibleId;
        return t.responsibleId === rowId;
      })
      .sort((a, b) => {
        const at = a.scheduledStart ? 0 : 1;
        const bt = b.scheduledStart ? 0 : 1;
        if (at !== bt) return at - bt;
        return b.score - a.score;
      });
  }

  function commitPlan(id: string | null, day: Date, rowId: string | null) {
    setDragId(null);
    setDropTarget(null);
    if (!id) return;
    const responsible = group && view !== "month" ? (rowId === "__none__" ? null : rowId) : undefined;
    startT(async () => {
      await planTask(id, day.toISOString(), responsible);
      toast.success("Scheduled");
      router.refresh();
    });
  }

  function onDropWaiting() {
    const id = dragId;
    setDragId(null);
    setDropTarget(null);
    if (!id) return;
    startT(async () => {
      await unplanTask(id);
      toast.info("Moved to waiting list");
      router.refresh();
    });
  }

  const rows: { id: string | null; member: Member | null }[] = group
    ? [...members.map((m) => ({ id: m.id, member: m })), { id: "__none__", member: null }]
    : [{ id: null, member: null }];

  const periodLabel =
    view === "month"
      ? anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "day"
        ? anchor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
        : `${renderStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(renderStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="flex h-[calc(100vh-150px)] flex-col">
      {/* Toolbar (stays visible in focus mode so you can exit; Esc also exits) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="mr-1 text-base font-semibold text-ink">{periodLabel}</span>
          <div className="flex items-center rounded-lg border bg-surface shadow-xs">
            <Link href={href(view, prevDate)} className="rounded-l-lg px-2 py-1.5 text-muted hover:bg-surface2" aria-label="Previous"><ChevronLeft size={16} /></Link>
            <Link href={href(view, today)} className="border-x px-3 py-1.5 text-sm font-medium hover:bg-surface2">Today</Link>
            <Link href={href(view, nextDate)} className="rounded-r-lg px-2 py-1.5 text-muted hover:bg-surface2" aria-label="Next"><ChevronRight size={16} /></Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view !== "month" && (
            <button onClick={() => setGroup((g) => !g)} className="btn" style={group ? { background: "var(--accent-soft)", color: "var(--accent-ink)", borderColor: "transparent" } : undefined}>
              <Users size={15} /> By person
            </button>
          )}
          <div className="flex items-center rounded-lg border bg-surface p-0.5 shadow-xs">
            {(["day", "week", "month"] as View[]).map((v) => (
              <Link key={v} href={href(v, anchor)} className="rounded-md px-3 py-1 text-sm capitalize" style={{ background: view === v ? "var(--accent-soft)" : "transparent", color: view === v ? "var(--accent-ink)" : "var(--muted)", fontWeight: view === v ? 600 : 500 }}>
                {v}
              </Link>
            ))}
          </div>
          <button onClick={toggleFocus} className="btn" title="Hide interface for a cleaner look">
            {focus ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {focus ? "Exit" : "Focus"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Main calendar */}
        <div ref={calRef} className="card flex min-w-0 flex-1 flex-col overflow-hidden p-0">
          {view === "month" ? (
            <MonthGrid
              cells={dayList}
              anchorMonth={anchor.getMonth()}
              today={today}
              tasksFor={(d) => tasksFor(null, d)}
              onSelect={setSelected}
              onDropDay={(d) => commitPlan(dragId, d, null)}
              setDragId={setDragId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
            />
          ) : (
            <ColumnsView
              dayList={dayList}
              rows={rows}
              group={group}
              today={today}
              tasksFor={tasksFor}
              onSelect={setSelected}
              setDragId={setDragId}
              dragId={dragId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDropCell={commitPlan}
            />
          )}
        </div>

        {/* Right rail: mini-calendar + waiting list */}
        {!focus && (
          <div className="flex w-72 shrink-0 flex-col gap-3">
            <MiniCalendar view={view} anchorISO={anchorISO} activeStartISO={activeStartISO} activeDays={activeDays} />
            <div
              className="card flex min-h-0 flex-1 flex-col p-3"
              onDragOver={(e) => { e.preventDefault(); setDropTarget("__waiting__"); }}
              onDragLeave={() => setDropTarget((t) => (t === "__waiting__" ? null : t))}
              onDrop={onDropWaiting}
              style={{ outline: dropTarget === "__waiting__" ? "2px solid var(--accent)" : undefined }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Waiting list</h3>
                <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium text-muted">{waiting.length}</span>
              </div>
              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {waiting.length === 0 && <div className="rounded-lg border border-dashed p-3 text-center text-xs text-faint">Nothing waiting.</div>}
                {waiting.map((t) => (
                  <PlannerCard key={t.id} task={t} onDragStart={() => setDragId(t.id)} onClick={() => setSelected(t)} dimmed={dragId === t.id} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <TaskDetailPanel task={selected} options={options} onClose={() => setSelected(null)} />
    </div>
  );
}

function ColumnsView({ dayList, rows, group, today, tasksFor, onSelect, setDragId, dragId, dropTarget, setDropTarget, onDropCell }: {
  dayList: Date[];
  rows: { id: string | null; member: Member | null }[];
  group: boolean;
  today: Date;
  tasksFor: (rowId: string | null, day: Date) => PlannerTask[];
  onSelect: (t: PlannerTask) => void;
  setDragId: (id: string) => void;
  dragId: string | null;
  dropTarget: string | null;
  setDropTarget: (v: string | null | ((p: string | null) => string | null)) => void;
  onDropCell: (id: string | null, day: Date, rowId: string | null) => void;
}) {
  return (
    <>
      <div className="flex border-b">
        {group && <div className="w-44 shrink-0 border-r" />}
        {dayList.map((d) => {
          const isToday = d.getTime() === today.getTime();
          return (
            <div key={d.toISOString()} className="flex-1 border-r px-3 py-2.5 text-center">
              <div className="text-[11px] uppercase tracking-wide text-faint">{DAY_NAMES[d.getDay()]}</div>
              <div className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-sm font-semibold" style={{ background: isToday ? "var(--accent)" : "transparent", color: isToday ? "#fff" : "var(--ink)" }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rows.map((row) => (
          <div key={row.id ?? "all"} className="flex border-b last:border-b-0">
            {group && (
              <div className="flex w-44 shrink-0 items-start gap-2 border-r bg-surface px-3 py-3">
                {row.member ? (
                  <>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: row.member.color }}>{row.member.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}</span>
                    <span className="mt-0.5 truncate text-sm font-medium">{row.member.name}</span>
                  </>
                ) : (
                  <span className="mt-0.5 text-sm font-medium text-faint">Unassigned</span>
                )}
              </div>
            )}
            {dayList.map((d) => {
              const cellTasks = tasksFor(row.id, d);
              const total = cellTasks.reduce((s, t) => s + t.effortHours, 0);
              const key = `${row.id}|${d.toISOString()}`;
              return (
                <div key={key} onDragOver={(e) => { e.preventDefault(); setDropTarget(key); }} onDragLeave={() => setDropTarget((t) => (t === key ? null : t))} onDrop={() => onDropCell(dragId, d, row.id)} className="min-h-[88px] flex-1 space-y-1.5 border-r p-1.5 transition-colors" style={{ background: dropTarget === key ? "var(--accent-soft)" : undefined }}>
                  {total > 0 && <div className="px-1 pb-0.5 text-right text-[10px] font-medium text-faint">{fmtTotal(total)}</div>}
                  {cellTasks.map((t) => <PlannerCard key={t.id} task={t} onDragStart={() => setDragId(t.id)} onClick={() => onSelect(t)} dimmed={dragId === t.id} />)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

function MonthGrid({ cells, anchorMonth, today, tasksFor, onSelect, onDropDay, setDragId, dropTarget, setDropTarget }: {
  cells: Date[];
  anchorMonth: number;
  today: Date;
  tasksFor: (d: Date) => PlannerTask[];
  onSelect: (t: PlannerTask) => void;
  onDropDay: (d: Date) => void;
  setDragId: (id: string) => void;
  dropTarget: string | null;
  setDropTarget: (v: string | null | ((p: string | null) => string | null)) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b">
        {DAY_NAMES.map((d) => <div key={d} className="px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-faint">{d}</div>)}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {cells.map((d) => {
          const inMonth = d.getMonth() === anchorMonth;
          const isToday = d.getTime() === today.getTime();
          const dayTasks = tasksFor(d);
          const key = d.toISOString();
          return (
            <div key={key} onDragOver={(e) => { e.preventDefault(); setDropTarget(key); }} onDragLeave={() => setDropTarget((t) => (t === key ? null : t))} onDrop={() => onDropDay(d)} className="min-h-0 overflow-hidden border-b border-r p-1" style={{ background: dropTarget === key ? "var(--accent-soft)" : inMonth ? undefined : "var(--surface-2)" }}>
              <div className="mb-1 flex justify-end">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium" style={{ background: isToday ? "var(--accent)" : "transparent", color: isToday ? "#fff" : inMonth ? "var(--ink)" : "var(--faint)" }}>{d.getDate()}</span>
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 4).map((t) => {
                  const color = t.domainColor ?? STATUS_META[t.status as Status]?.color ?? "#888";
                  return (
                    <button key={t.id} onClick={() => onSelect(t)} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); setDragId(t.id); }} className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-surface2" title={t.title}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                      <span className="truncate" style={{ textDecoration: t.status === "completed" ? "line-through" : "none", color: t.status === "completed" ? "var(--faint)" : "var(--ink)" }}>{t.title}</span>
                    </button>
                  );
                })}
                {dayTasks.length > 4 && <div className="px-1 text-[10px] text-faint">+{dayTasks.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlannerCard({ task, onDragStart, onClick, dimmed }: { task: PlannerTask; onDragStart: () => void; onClick: () => void; dimmed: boolean }) {
  const status = STATUS_META[task.status as Status];
  const type = TYPE_META[task.type as TaskType];
  const timeRange = fmtTimeRange(task.scheduledStart, task.scheduledEnd);
  const done = task.status === "completed";
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onClick={onClick} className="cursor-pointer rounded-lg border-l-[3px] p-2 text-xs shadow-xs transition-shadow hover:shadow-md" style={{ borderLeftColor: task.domainColor ?? status?.color, background: `color-mix(in srgb, ${task.domainColor ?? status?.color ?? "#888"} 8%, var(--surface))`, opacity: dimmed ? 0.4 : done ? 0.65 : 1 }}>
      {timeRange && <div className="mb-1 flex items-center gap-1 text-[10px] font-medium text-muted"><Clock size={11} /> {timeRange}</div>}
      <div className="font-medium leading-snug text-ink" style={{ textDecoration: done ? "line-through" : "none" }}>{task.title}</div>
      {task.projectTitle && <div className="mt-0.5 truncate text-[11px] text-muted">{task.projectTitle}</div>}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
        <span className="font-medium tabular-nums">{fmtHours(task.effortHours)}</span>
        {type && <span className="rounded px-1 py-px" style={{ background: `color-mix(in srgb, ${type.color} 22%, transparent)`, color: "var(--ink)" }}>{type.label}</span>}
        {task.progress > 0 && !done && <span className="tabular-nums">{task.progress}%</span>}
      </div>
    </div>
  );
}
