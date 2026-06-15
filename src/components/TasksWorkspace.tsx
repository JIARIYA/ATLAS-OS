"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Columns3, List, Users } from "lucide-react";
import { setTaskStatus } from "@/app/actions";
import { formatRelativeDue } from "@/lib/dates";
import { STATUSES, STATUS_META, TYPE_META, type Status, type TaskType } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { AddTaskForm } from "./AddTaskForm";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useToast } from "./ui/toast";

interface Member { id: string; name: string; color: string }
type View = "list" | "kanban" | "team";

function initials(n: string) {
  const p = n.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function TasksWorkspace({
  tasks,
  members,
  options,
  addOptions,
}: {
  tasks: PlannerTask[];
  members: Member[];
  options: { members: Member[]; projects: { id: string; title: string }[] };
  addOptions: { domains: { id: string; name: string }[]; projects: { id: string; title: string; goalId: string | null }[]; goals: { id: string; title: string }[] };
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const toast = useToast();
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<PlannerTask | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  function moveTo(id: string, status: Status) {
    setDragId(null);
    start(async () => { await setTaskStatus(id, status); toast.success(`Moved to ${STATUS_META[status].label}`); router.refresh(); });
  }

  const VIEWS: { id: View; label: string; icon: typeof List }[] = [
    { id: "list", label: "List", icon: List },
    { id: "kanban", label: "Kanban", icon: Columns3 },
    { id: "team", label: "By person", icon: Users },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center rounded-lg border bg-surface p-0.5 shadow-xs">
          {VIEWS.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)} className="flex items-center gap-1.5 rounded-md px-3 py-1 text-sm" style={{ background: view === v.id ? "var(--accent-soft)" : "transparent", color: view === v.id ? "var(--accent-ink)" : "var(--muted)", fontWeight: view === v.id ? 600 : 500 }}>
              <v.icon size={14} /> {v.label}
            </button>
          ))}
        </div>
        <AddTaskForm options={addOptions} />
      </div>

      {view === "list" && (
        <div className="space-y-5">
          {STATUSES.map((s) => {
            const group = tasks.filter((t) => t.status === s);
            if (group.length === 0) return null;
            return (
              <div key={s}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: STATUS_META[s].color }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].color }} /> {STATUS_META[s].label} <span className="text-faint">{group.length}</span>
                </div>
                <div className="space-y-1.5">
                  {group.map((t) => <Row key={t.id} t={t} member={t.responsibleId ? memberById[t.responsibleId] : undefined} onClick={() => setSelected(t)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "kanban" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STATUSES.map((s) => {
            const group = tasks.filter((t) => t.status === s);
            return (
              <div key={s} onDragOver={(e) => e.preventDefault()} onDrop={() => dragId && moveTo(dragId, s)} className="rounded-xl border bg-surface2/40 p-2">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold" style={{ color: STATUS_META[s].color }}>
                  {STATUS_META[s].label} <span className="text-xs font-normal text-faint">{group.length}</span>
                </div>
                <div className="space-y-1.5">
                  {group.map((t) => <Card key={t.id} t={t} member={t.responsibleId ? memberById[t.responsibleId] : undefined} onClick={() => setSelected(t)} onDragStart={() => setDragId(t.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "team" && (
        <div className="space-y-4">
          {[...members.map((m) => ({ id: m.id, name: m.name, color: m.color })), { id: "__none__", name: "Unassigned", color: "#94a3b8" }].map((m) => {
            const group = tasks.filter((t) => (m.id === "__none__" ? !t.responsibleId : t.responsibleId === m.id));
            if (group.length === 0) return null;
            return (
              <div key={m.id} className="card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: m.color }}>{m.id === "__none__" ? "?" : initials(m.name)}</span>
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className="text-xs text-faint">{group.length}</span>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {group.map((t) => <Row key={t.id} t={t} onClick={() => setSelected(t)} compact />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskDetailPanel task={selected} options={options} onClose={() => setSelected(null)} />
    </div>
  );
}

function MetaRow({ t, member }: { t: PlannerTask; member?: Member }) {
  const type = TYPE_META[t.type as TaskType];
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
      {t.domainName && <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: t.domainColor ?? "#94a3b8" }} />{t.domainName}</span>}
      <span>{formatRelativeDue(t.dueDate ? new Date(t.dueDate) : null)}</span>
      {type && <span className="rounded px-1 py-px" style={{ background: `color-mix(in srgb, ${type.color} 22%, transparent)`, color: "var(--ink)" }}>{type.label}</span>}
      {member && <span className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-semibold text-white" style={{ background: member.color }} title={member.name}>{initials(member.name)}</span>}
    </div>
  );
}

function Row({ t, member, onClick, compact }: { t: PlannerTask; member?: Member; onClick: () => void; compact?: boolean }) {
  const done = t.status === "completed";
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border bg-surface p-2.5 text-left shadow-xs transition-shadow hover:shadow-sm">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_META[t.status as Status]?.color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" style={{ textDecoration: done ? "line-through" : "none", color: done ? "var(--faint)" : "var(--ink)" }}>{t.title}</div>
        {!compact && <div className="mt-1"><MetaRow t={t} member={member} /></div>}
      </div>
    </button>
  );
}

function Card({ t, member, onClick, onDragStart }: { t: PlannerTask; member?: Member; onClick: () => void; onDragStart: () => void }) {
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); onDragStart(); }} onClick={onClick} className="cursor-pointer rounded-lg border bg-surface p-2.5 shadow-xs transition-shadow hover:shadow-md">
      <div className="text-sm font-medium" style={{ textDecoration: t.status === "completed" ? "line-through" : "none" }}>{t.title}</div>
      {t.projectTitle && <div className="mt-0.5 truncate text-[11px] text-muted">{t.projectTitle}</div>}
      <div className="mt-1.5"><MetaRow t={t} member={member} /></div>
    </div>
  );
}
