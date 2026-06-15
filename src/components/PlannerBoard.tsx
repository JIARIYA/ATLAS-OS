"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { planTask, plannerQuickCreate, unplanTask } from "@/app/actions";
import { addDays, addMonths, startOfWeek, ymd } from "@/lib/dates";
import { STATUS_META, TYPE_META, type Status, type TaskType } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { MiniCalendar } from "./MiniCalendar";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useToast } from "./ui/toast";
import type { CalView } from "@/app/(app)/calendar/page";

interface Member { id: string; name: string; color: string }

interface QuickCreate {
  plannedDate: Date;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  x: number;
  y: number;
}

const COLOR_SWATCHES = ["#3b82f6","#8b5cf6","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#ec4899","#64748b"];
function taskColor(t: PlannerTask) { return t.color ?? t.domainColor ?? STATUS_META[t.status as Status]?.color ?? "#888"; }

interface Props {
  view: CalView;
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

const HOUR_H = 56;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ymdDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function sameDay(iso: string | null, d: Date) {
  if (!iso) return false;
  const x = new Date(iso);
  return x.getFullYear()===d.getFullYear() && x.getMonth()===d.getMonth() && x.getDate()===d.getDate();
}
function fmtTime(d: Date) { return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:true}); }

export function PlannerBoard(props: Props) {
  const { view, anchorISO, renderStartISO, renderDays, activeStartISO, activeDays, planned, waiting, members, options } = props;
  const router = useRouter();
  const [, startT] = useTransition();
  const toast = useToast();

  const [focus, setFocus] = useState(false);
  const [selected, setSelected] = useState<PlannerTask | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [qc, setQc] = useState<QuickCreate | null>(null);
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const calCardRef = useRef<HTMLDivElement>(null);
  const scrollCooldown = useRef(false);

  const anchor = new Date(anchorISO);
  const renderStart = new Date(renderStartISO);
  const today = new Date(); today.setHours(0,0,0,0);

  const dayList = Array.from({length: renderDays}, (_,i) => addDays(renderStart,i));

  const href = (v: CalView, d: Date) => `/calendar?view=${v}&date=${ymd(d)}`;
  const prevDate = view==="day" ? addDays(anchor,-1) : view==="week" ? addDays(anchor,-7) : view==="year" ? new Date(anchor.getFullYear()-1,0,1) : addMonths(anchor,-1);
  const nextDate = view==="day" ? addDays(anchor,1)  : view==="week" ? addDays(anchor,7)  : view==="year" ? new Date(anchor.getFullYear()+1,0,1) : addMonths(anchor,1);

  const periodLabel =
    view==="year"  ? anchor.getFullYear().toString() :
    view==="month" ? anchor.toLocaleDateString("en-US",{month:"long",year:"numeric"}) :
    view==="day"   ? anchor.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) :
    `${renderStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${addDays(renderStart,6).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;

  // Close view dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (viewRef.current && !viewRef.current.contains(e.target as Node)) setViewOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function toggleFocus() {
    const next = !focus;
    setFocus(next);
    document.documentElement.classList.toggle("planner-focus", next);
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==="Escape" && focus && !selected) { setFocus(false); document.documentElement.classList.remove("planner-focus"); } };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [focus, selected]);
  useEffect(() => () => document.documentElement.classList.remove("planner-focus"), []);

  // Scroll to navigate month / year (not day/week — those scroll through time)
  useEffect(() => {
    if (view !== "month" && view !== "year") return;
    const el = calCardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (scrollCooldown.current) return;
      scrollCooldown.current = true;
      setTimeout(() => { scrollCooldown.current = false; }, 500);
      router.push(href(view, e.deltaY > 0 ? nextDate : prevDate));
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view, prevDate, nextDate, router]);

  function commitPlan(id: string|null, day: Date) {
    setDragId(null); setDropTarget(null);
    if (!id) return;
    startT(async () => { await planTask(id, day.toISOString(), undefined); toast.success("Scheduled"); router.refresh(); });
  }
  function saveQuickCreate(title: string, scheduledStart?: Date, scheduledEnd?: Date, color?: string) {
    if (!qc || !title.trim()) { setQc(null); setHighlightDate(null); return; }
    const q = qc;
    setQc(null); setHighlightDate(null);
    startT(async () => {
      await plannerQuickCreate(
        title,
        q.plannedDate.toISOString(),
        scheduledStart?.toISOString(),
        scheduledEnd?.toISOString(),
        color,
      );
      toast.success("Task added");
      router.refresh();
    });
  }

  function onDropWaiting() {
    const id = dragId; setDragId(null); setDropTarget(null);
    if (!id) return;
    startT(async () => { await unplanTask(id); toast.info("Moved to waiting list"); router.refresh(); });
  }

  const viewLabels: Record<CalView, string> = { day:"Day", week:"Week", month:"Month", year:"Year" };

  return (
    <div className="flex h-[calc(100vh-150px)] flex-col">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="mr-1 text-base font-semibold text-ink">{periodLabel}</span>
          <div className="flex items-center rounded-lg border border-border bg-surface shadow-xs">
            <Link href={href(view,prevDate)} className="rounded-l-lg px-2 py-1.5 text-muted hover:bg-surface2 transition-colors" aria-label="Previous"><ChevronLeft size={16}/></Link>
            <Link href={href(view,today)} className="border-x border-border px-3 py-1.5 text-sm font-medium hover:bg-surface2 transition-colors">Today</Link>
            <Link href={href(view,nextDate)} className="rounded-r-lg px-2 py-1.5 text-muted hover:bg-surface2 transition-colors" aria-label="Next"><ChevronRight size={16}/></Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View dropdown */}
          <div ref={viewRef} className="relative">
            <button
              onClick={() => setViewOpen(o=>!o)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-xs hover:bg-surface2 transition-colors"
            >
              {viewLabels[view]}
              <ChevronDown size={14} className="text-muted" style={{transform: viewOpen?"rotate(180deg)":"none", transition:"transform .15s"}}/>
            </button>
            {viewOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[120px] overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                {(["day","week","month","year"] as CalView[]).map(v => (
                  <Link
                    key={v}
                    href={href(v,anchor)}
                    onClick={() => setViewOpen(false)}
                    className="flex items-center px-3 py-2 text-sm transition-colors hover:bg-surface2"
                    style={{
                      fontWeight: view===v ? 600 : 400,
                      color: view===v ? "var(--accent)" : "var(--ink)",
                      background: view===v ? "var(--accent-soft)" : undefined,
                    }}
                  >
                    {viewLabels[v]}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggleFocus} className="btn" title="Focus mode">
            {focus ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}
            {focus ? "Exit" : "Focus"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Main calendar */}
        <div ref={calCardRef} className="card flex min-w-0 flex-1 flex-col overflow-hidden p-0">
          {view==="year" ? (
            <YearView anchor={anchor} today={today} planned={planned} href={href}/>
          ) : view==="month" ? (
            <MonthGrid
              cells={dayList}
              anchorMonth={anchor.getMonth()}
              today={today}
              tasksFor={d => planned.filter(t => sameDay(t.plannedDate,d)).sort((a,b)=>b.score-a.score)}
              onSelect={setSelected}
              onDropDay={d => commitPlan(dragId,d)}
              setDragId={setDragId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onClickDay={(d,x,y) => { setHighlightDate(ymdDate(d)); setQc({plannedDate:d,x,y}); }}
              highlightDate={highlightDate}
            />
          ) : (
            <TimeGrid
              view={view}
              dayList={dayList}
              today={today}
              planned={planned}
              onSelect={setSelected}
              setDragId={setDragId}
              dragId={dragId}
              dropTarget={dropTarget}
              setDropTarget={setDropTarget}
              onDropCell={commitPlan}
              onClickSlot={(d,start,end,x,y) => { setHighlightDate(ymdDate(d)); setQc({plannedDate:d,scheduledStart:start,scheduledEnd:end,x,y}); }}
            />
          )}
        </div>

        {/* Right rail */}
        {!focus && (
          <div className="flex w-64 shrink-0 flex-col gap-3">
            {view!=="year" && (
              <MiniCalendar view={view} anchorISO={anchorISO} activeStartISO={activeStartISO} activeDays={activeDays}/>
            )}
            <div
              className="card flex min-h-0 flex-1 flex-col p-3"
              onDragOver={e=>{e.preventDefault();setDropTarget("__waiting__");}}
              onDragLeave={()=>setDropTarget(t=>t==="__waiting__"?null:t)}
              onDrop={onDropWaiting}
              style={{outline: dropTarget==="__waiting__"?"2px solid var(--accent)":undefined}}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink">Waiting</h3>
                <span className="rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium text-muted">{waiting.length}</span>
              </div>
              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {waiting.length===0 && <div className="rounded-lg border border-dashed p-3 text-center text-xs text-faint">Nothing waiting.</div>}
                {waiting.map(t => (
                  <WaitingCard key={t.id} task={t} onDragStart={()=>setDragId(t.id)} onClick={()=>setSelected(t)} dimmed={dragId===t.id}/>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <TaskDetailPanel task={selected} options={options} onClose={()=>setSelected(null)}/>
      {qc && <QuickCreatePopup qc={qc} onSave={saveQuickCreate} onClose={()=>{ setQc(null); setHighlightDate(null); }}/>}
    </div>
  );
}

/* ── Time Grid (day / week) ─────────────────────────────── */
function TimeGrid({ view, dayList, today, planned, onSelect, setDragId, dragId, dropTarget, setDropTarget, onDropCell, onClickSlot }: {
  view: "day"|"week";
  dayList: Date[];
  today: Date;
  planned: PlannerTask[];
  onSelect: (t:PlannerTask)=>void;
  setDragId: (id:string)=>void;
  dragId: string|null;
  dropTarget: string|null;
  setDropTarget: (v:string|null|((p:string|null)=>string|null))=>void;
  onDropCell: (id:string|null, day:Date)=>void;
  onClickSlot: (day:Date, start:Date, end:Date, x:number, y:number)=>void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState(() => { const n=new Date(); return n.getHours()*60+n.getMinutes(); });

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const y = Math.max(0, (nowMinutes/60)*HOUR_H - 120);
      scrollRef.current.scrollTop = y;
    }
  }, []);

  // Update current time line every minute
  useEffect(() => {
    const id = setInterval(()=>{ const n=new Date(); setNowMinutes(n.getHours()*60+n.getMinutes()); },60000);
    return ()=>clearInterval(id);
  },[]);

  const hours = Array.from({length:24},(_,i)=>i);
  const todayInView = dayList.some(d=>d.getTime()===today.getTime());

  function allDayFor(d: Date) { return planned.filter(t=>sameDay(t.plannedDate,d)&&!t.scheduledStart); }
  function timedFor(d: Date)  { return planned.filter(t=>sameDay(t.plannedDate,d)&& t.scheduledStart); }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Sticky day header */}
      <div className="flex shrink-0 border-b border-border" style={{background:"var(--surface)"}}>
        <div className="w-14 shrink-0"/>
        {dayList.map(d => {
          const isToday = d.getTime()===today.getTime();
          return (
            <div key={d.toISOString()} className="flex flex-1 flex-col items-center py-2">
              <span className="text-[10px] font-medium uppercase tracking-widest" style={{color:"var(--muted)"}}>{DAY_NAMES[d.getDay()]}</span>
              <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors"
                style={{background:isToday?"var(--accent)":"transparent", color:isToday?"#fff":"var(--ink)"}}>
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day strip */}
      {dayList.some(d=>allDayFor(d).length>0) && (
        <div className="flex shrink-0 border-b border-border" style={{background:"var(--surface)"}}>
          <div className="flex w-14 shrink-0 items-center justify-end pr-2 text-[9px] uppercase tracking-wide" style={{color:"var(--faint)"}}>all‑day</div>
          {dayList.map(d => (
            <div key={d.toISOString()} className="flex flex-1 flex-wrap gap-0.5 p-1 border-l border-border">
              {allDayFor(d).map(t => {
                const color = taskColor(t);
                return (
                  <button key={t.id} onClick={()=>onSelect(t)}
                    className="truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-white transition-opacity hover:opacity-80"
                    style={{background:color, maxWidth:"100%"}}>
                    {t.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Scrollable time body */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{height:`${24*HOUR_H}px`}}>
          {/* Hour labels */}
          <div className="sticky left-0 w-14 shrink-0" style={{background:"var(--surface)",zIndex:1}}>
            {hours.map(h => (
              <div key={h} className="flex items-start justify-end pr-2" style={{height:`${HOUR_H}px`}}>
                {h>0 && <span className="translate-y-[-8px] text-[10px]" style={{color:"var(--faint)"}}>{h<12?`${h} AM`:h===12?"12 PM":`${h-12} PM`}</span>}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dayList.map(d => {
            const isToday = d.getTime()===today.getTime();
            const timed = timedFor(d);
            const key = ymdDate(d);
            return (
              <div key={d.toISOString()} className="relative flex-1 border-l border-border"
                onDragOver={e=>{e.preventDefault();setDropTarget(key);}}
                onDragLeave={()=>setDropTarget(t=>t===key?null:t)}
                onDrop={()=>onDropCell(dragId,d)}
                onClick={e=>{
                  if ((e.target as HTMLElement).closest("button")) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const relY = e.clientY - rect.top;
                  const hour = Math.floor(relY / HOUR_H);
                  const mins = Math.round(((relY % HOUR_H) / HOUR_H) * 60 / 15) * 15;
                  const start = new Date(d); start.setHours(hour, mins, 0, 0);
                  const end = new Date(start); end.setHours(start.getHours()+1);
                  onClickSlot(d, start, end, e.clientX, e.clientY);
                }}
                style={{background: dropTarget===key?"color-mix(in srgb, var(--accent) 6%, transparent)":undefined}}>
                {/* Hour lines */}
                {hours.map(h=>(
                  <div key={h} className="border-t border-border" style={{height:`${HOUR_H}px`, borderColor: h===0?"transparent":undefined}}/>
                ))}
                {/* Half-hour dashes */}
                {hours.map(h=>(
                  <div key={`h${h}`} className="absolute w-full border-t" style={{top:`${h*HOUR_H+HOUR_H/2}px`, borderColor:"var(--border)", opacity:0.4}}/>
                ))}
                {/* Current time line */}
                {isToday && todayInView && (
                  <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center" style={{top:`${(nowMinutes/60)*HOUR_H}px`}}>
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{background:"var(--accent)",marginLeft:"-5px"}}/>
                    <div className="h-px flex-1" style={{background:"var(--accent)"}}/>
                  </div>
                )}
                {/* Timed tasks */}
                {timed.map(t => {
                  const s = new Date(t.scheduledStart!);
                  const e = new Date(t.scheduledEnd!);
                  const top = (s.getHours()*60+s.getMinutes())/60*HOUR_H;
                  const dur = (e.getTime()-s.getTime())/3600000;
                  const height = Math.max(20, dur*HOUR_H);
                  const color = taskColor(t);
                  const done = t.status==="completed";
                  return (
                    <button key={t.id} onClick={()=>onSelect(t)} draggable
                      onDragStart={ev=>{ev.dataTransfer.setData("text/plain",t.id);setDragId(t.id);}}
                      className="absolute left-0.5 right-0.5 overflow-hidden rounded-md px-2 py-1 text-left text-[11px] transition-opacity hover:opacity-90"
                      style={{top:`${top}px`,height:`${height}px`,background:`color-mix(in srgb, ${color} 18%, var(--surface))`,borderLeft:`3px solid ${color}`,opacity:done?0.55:dragId===t.id?0.3:1,zIndex:2}}>
                      <div className="font-semibold leading-tight text-ink" style={{textDecoration:done?"line-through":undefined}}>{t.title}</div>
                      {height>30 && <div className="mt-0.5 text-[10px]" style={{color:"var(--muted)"}}>{fmtTime(s)} – {fmtTime(e)}</div>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Month Grid ─────────────────────────────────────────── */
function MonthGrid({ cells, anchorMonth, today, tasksFor, onSelect, onDropDay, setDragId, dropTarget, setDropTarget, onClickDay, highlightDate }: {
  cells: Date[]; anchorMonth: number; today: Date;
  tasksFor: (d:Date)=>PlannerTask[];
  onSelect: (t:PlannerTask)=>void;
  onDropDay: (d:Date)=>void;
  setDragId: (id:string)=>void;
  dropTarget: string|null;
  setDropTarget: (v:string|null|((p:string|null)=>string|null))=>void;
  onClickDay: (d:Date, x:number, y:number)=>void;
  highlightDate: string|null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_NAMES.map(d=><div key={d} className="py-2 text-center text-[10px] font-medium uppercase tracking-widest" style={{color:"var(--faint)"}}>{d}</div>)}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {cells.map(d=>{
          const inMonth = d.getMonth()===anchorMonth;
          const isToday = d.getTime()===today.getTime();
          const dayTasks = tasksFor(d);
          const key = d.toISOString();
          const dKey = ymdDate(d);
          const isHighlighted = highlightDate === dKey;
          return (
            <div key={key}
              onDragOver={e=>{e.preventDefault();setDropTarget(key);}}
              onDragLeave={()=>setDropTarget(t=>t===key?null:t)}
              onDrop={()=>onDropDay(d)}
              onClick={e=>{ if((e.target as HTMLElement).closest("button")) return; onClickDay(d,e.clientX,e.clientY); }}
              className="min-h-0 cursor-pointer overflow-hidden border-b border-r border-border p-1 transition-colors"
              style={{background: isHighlighted?"color-mix(in srgb, var(--accent) 12%, var(--surface))":dropTarget===key?"color-mix(in srgb, var(--accent) 8%, transparent)":inMonth?"var(--surface)":"var(--surface2)", outline:isHighlighted?"2px solid var(--accent)":"none", outlineOffset:"-2px"}}>
              <div className="mb-1 flex justify-end">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium"
                  style={{background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":inMonth?"var(--ink)":"var(--faint)"}}>
                  {d.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0,3).map(t=>{
                  const color = taskColor(t);
                  return (
                    <button key={t.id} onClick={()=>onSelect(t)} draggable
                      onDragStart={e=>{e.dataTransfer.setData("text/plain",t.id);setDragId(t.id);}}
                      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] transition-colors hover:bg-surface2"
                      style={{textDecoration:t.status==="completed"?"line-through":undefined,color:t.status==="completed"?"var(--faint)":"var(--ink)"}}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{background:color}}/>
                      {t.title}
                    </button>
                  );
                })}
                {dayTasks.length>3 && <div className="px-1 text-[10px]" style={{color:"var(--faint)"}}>+{dayTasks.length-3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Year View ──────────────────────────────────────────── */
function YearView({ anchor, today, planned, href }: {
  anchor: Date; today: Date; planned: PlannerTask[];
  href: (v:CalView,d:Date)=>string;
}) {
  const year = anchor.getFullYear();
  const tasksByDay = new Map<string,number>();
  planned.forEach(t=>{ if(t.plannedDate){ const k=t.plannedDate.slice(0,10); tasksByDay.set(k,(tasksByDay.get(k)??0)+1); } });

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-4 gap-4">
        {MONTHS.map((mName,mi)=>{
          const monthStart = new Date(year,mi,1);
          const startPad = startOfWeek(monthStart).getDay();
          const daysInMonth = new Date(year,mi+1,0).getDate();
          const cells: (Date|null)[] = [];
          for(let i=0;i<startPad;i++) cells.push(null);
          for(let d=1;d<=daysInMonth;d++) cells.push(new Date(year,mi,d));

          return (
            <div key={mName} className="rounded-lg border border-border p-3" style={{background:"var(--surface)"}}>
              <div className="mb-2 text-sm font-semibold" style={{color:"var(--ink)"}}>{mName}</div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {["S","M","T","W","T","F","S"].map((d,i)=>(
                  <div key={i} className="text-center text-[9px] font-medium" style={{color:"var(--faint)"}}>{d}</div>
                ))}
                {cells.map((d,i)=>{
                  if(!d) return <div key={`e${i}`}/>;
                  const isToday = d.getTime()===today.getTime();
                  const key = ymdDate(d);
                  const count = tasksByDay.get(key)??0;
                  return (
                    <Link key={i} href={href("day",d)}
                      className="flex flex-col items-center rounded py-0.5 transition-colors hover:bg-surface2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium"
                        style={{background:isToday?"var(--accent)":"transparent",color:isToday?"#fff":"var(--ink)"}}>
                        {d.getDate()}
                      </span>
                      {count>0 && <span className="mt-0.5 h-1 w-1 rounded-full" style={{background:"var(--accent)"}}/>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Quick-create popup ─────────────────────────────────── */
const DURATION_OPTS = [
  {label:"15 min", mins:15},
  {label:"30 min", mins:30},
  {label:"1 hour", mins:60},
  {label:"2 hours",mins:120},
  {label:"3 hours",mins:180},
];

function QuickCreatePopup({ qc, onSave, onClose }: { qc: QuickCreate; onSave: (title:string, scheduledStart?:Date, scheduledEnd?:Date, color?:string)=>void; onClose:()=>void }) {
  const [title, setTitle] = useState("");
  const [timeVal, setTimeVal] = useState(() => {
    if (qc.scheduledStart) {
      const h = String(qc.scheduledStart.getHours()).padStart(2,"0");
      const m = String(qc.scheduledStart.getMinutes()).padStart(2,"0");
      return `${h}:${m}`;
    }
    return "";
  });
  const [durMins, setDurMins] = useState(60);
  const [color, setColor] = useState(COLOR_SWATCHES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  function submit() {
    if (!title.trim()) return;
    let start: Date|undefined, end: Date|undefined;
    if (timeVal) {
      const [h, m] = timeVal.split(":").map(Number);
      start = new Date(qc.plannedDate);
      start.setHours(h, m, 0, 0);
      end = new Date(start);
      end.setMinutes(end.getMinutes() + durMins);
    }
    onSave(title.trim(), start, end, color);
  }

  const dateLabel = qc.plannedDate.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});

  const PW = 300, PH = 280;
  const left = Math.min(qc.x, (typeof window !== "undefined" ? window.innerWidth : 800) - PW - 12);
  const top  = Math.min(qc.y, (typeof window !== "undefined" ? window.innerHeight : 600) - PH - 12);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose}/>
      <div className="fixed z-50 rounded-xl shadow-2xl overflow-hidden"
        style={{left, top, width:PW, border:"1px solid rgba(147,197,253,0.35)", background:"rgba(219,234,254,0.97)"}}>
        {/* Header */}
        <div className="px-4 py-2.5" style={{background:"rgba(191,219,254,0.7)", borderBottom:"1px solid rgba(147,197,253,0.4)"}}>
          <div className="text-xs font-semibold" style={{color:"#1d4ed8"}}>{dateLabel}</div>
        </div>
        <div className="p-3 space-y-2.5">
          {/* Title */}
          <input
            ref={inputRef}
            value={title}
            onChange={e=>setTitle(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") submit(); }}
            placeholder="Task name"
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{background:"rgba(255,255,255,0.7)", border:"1px solid rgba(147,197,253,0.6)", color:"#1e3a5f"}}
          />
          {/* Time + Duration row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{color:"#3b82f6"}}>Time</div>
              <input
                type="time"
                value={timeVal}
                onChange={e=>setTimeVal(e.target.value)}
                className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                style={{background:"rgba(255,255,255,0.7)", border:"1px solid rgba(147,197,253,0.6)", color:"#1e3a5f"}}
              />
            </div>
            <div className="flex-1">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wide" style={{color:"#3b82f6"}}>Duration</div>
              <select
                value={durMins}
                onChange={e=>setDurMins(Number(e.target.value))}
                className="w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none cursor-pointer"
                style={{background:"rgba(255,255,255,0.7)", border:"1px solid rgba(147,197,253,0.6)", color:"#1e3a5f"}}
              >
                {DURATION_OPTS.map(o=><option key={o.mins} value={o.mins}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {/* Color swatches */}
          <div>
            <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide" style={{color:"#3b82f6"}}>Color</div>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_SWATCHES.map(c=>(
                <button key={c} onClick={()=>setColor(c)}
                  className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                  style={{background:c, outline: color===c?"2px solid #1d4ed8":"2px solid transparent", outlineOffset:"2px"}}
                />
              ))}
            </div>
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-0.5">
            <button onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-blue-100"
              style={{color:"#3b82f6"}}>
              Cancel
            </button>
            <button onClick={submit} disabled={!title.trim()}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
              style={{background:"#3b82f6"}}>
              Add
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Waiting list card ──────────────────────────────────── */
function WaitingCard({ task, onDragStart, onClick, dimmed }: { task:PlannerTask; onDragStart:()=>void; onClick:()=>void; dimmed:boolean }) {
  const status = STATUS_META[task.status as Status];
  const type   = TYPE_META[task.type as TaskType];
  const color  = task.domainColor ?? status?.color ?? "#888";
  const done   = task.status==="completed";
  return (
    <div draggable
      onDragStart={e=>{e.dataTransfer.setData("text/plain",task.id);e.dataTransfer.effectAllowed="move";onDragStart();}}
      onClick={onClick}
      className="cursor-pointer rounded-lg border-l-[3px] p-2 text-xs shadow-xs transition-shadow hover:shadow-md"
      style={{borderLeftColor:color,background:`color-mix(in srgb, ${color} 8%, var(--surface))`,opacity:dimmed?0.4:done?0.65:1}}>
      <div className="font-medium leading-snug text-ink" style={{textDecoration:done?"line-through":undefined}}>{task.title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]" style={{color:"var(--muted)"}}>
        <span className="font-medium tabular-nums">{task.effortHours}h</span>
        {type && <span className="rounded px-1 py-px" style={{background:`color-mix(in srgb, ${type.color} 22%, transparent)`,color:"var(--ink)"}}>{type.label}</span>}
      </div>
    </div>
  );
}
