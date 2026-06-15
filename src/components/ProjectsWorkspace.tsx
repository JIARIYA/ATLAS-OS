"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { addTaskToProject, updateProjectDetails } from "@/app/actions";
import { ProgressBar } from "./ui";
import { AddProjectForm } from "./AddProjectForm";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { STATUS_META, type Status } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { useToast } from "./ui/toast";

interface Member { id: string; name: string; color: string }
interface Project { id: string; title: string; objective: string | null; status: string; color: string; targetDate: string | null; tasks: PlannerTask[]; total: number; done: number }
const STATUS_OPTS = [["active", "Active"], ["on_hold", "On hold"], ["done", "Done"], ["archived", "Archived"]] as const;

function initials(n: string) { const p = n.trim().split(/\s+/); return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U"; }

export function ProjectsWorkspace({ projects, members, options, addOptions }: { projects: Project[]; members: Member[]; options: { members: Member[]; projects: { id: string; title: string }[] }; addOptions: { domains: { id: string; name: string }[]; goals: { id: string; title: string }[] } }) {
  const [selected, setSelected] = useState<PlannerTask | null>(null);
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex justify-end"><AddProjectForm options={addOptions} /></div>
      <div className="space-y-3">
        {projects.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-faint">No projects yet.</div>}
        {projects.map((p) => <ProjectCard key={p.id} p={p} members={members} onSelect={setSelected} />)}
      </div>
      <TaskDetailPanel task={selected} options={options} onClose={() => setSelected(null)} />
    </div>
  );
}

function ProjectCard({ p, members, onSelect }: { p: Project; members: Member[]; onSelect: (t: PlannerTask) => void }) {
  const router = useRouter();
  const [, start] = useTransition();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const addRef = useRef<HTMLFormElement>(null);
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const peopleIds = [...new Set(p.tasks.map((t) => t.responsibleId).filter(Boolean) as string[])];
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  const groups: { id: string | null; name: string; color: string }[] = [
    ...peopleIds.filter((id) => memberById[id]).map((id) => ({ id, name: memberById[id].name, color: memberById[id].color })),
    { id: null, name: "Unassigned", color: "#94a3b8" },
  ];

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen((o) => !o)} className="text-faint hover:text-ink">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
        <input defaultValue={p.title} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.title) run(async () => { await updateProjectDetails(p.id, { title: v }); }); }} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
        <div className="hidden items-center -space-x-1.5 sm:flex">
          {peopleIds.slice(0, 5).map((id) => memberById[id] && <span key={id} title={memberById[id].name} className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white ring-2 ring-[var(--surface)]" style={{ background: memberById[id].color }}>{initials(memberById[id].name)}</span>)}
        </div>
        <span className="w-24 shrink-0"><ProgressBar pct={pct} color={p.color} height={6} /></span>
        <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums" style={{ color: p.color }}>{pct}%</span>
        <select defaultValue={p.status} onChange={(e) => run(async () => { await updateProjectDetails(p.id, { status: e.target.value }); })} className="rounded-md border bg-transparent px-1.5 py-1 text-xs">
          {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <textarea defaultValue={p.objective ?? ""} placeholder="Objective…" rows={2} onBlur={(e) => { if ((e.target.value ?? "") !== (p.objective ?? "")) run(async () => { await updateProjectDetails(p.id, { objective: e.target.value }); }); }} className="input text-sm" />
          {groups.map((g) => {
            const gt = p.tasks.filter((t) => (g.id === null ? !t.responsibleId : t.responsibleId === g.id));
            if (gt.length === 0) return null;
            return (
              <div key={g.id ?? "none"}>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted"><span className="h-2 w-2 rounded-full" style={{ background: g.color }} />{g.name} <span className="text-faint">{gt.length}</span></div>
                <div className="space-y-1">
                  {gt.map((t) => (
                    <button key={t.id} onClick={() => onSelect(t)} className="flex w-full items-center gap-2 rounded-md border bg-surface px-2 py-1.5 text-left text-sm hover:bg-surface2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_META[t.status as Status]?.color }} />
                      <span className="min-w-0 flex-1 truncate" style={{ textDecoration: t.status === "completed" ? "line-through" : "none" }}>{t.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <form ref={addRef} action={async (fd) => { await addTaskToProject(p.id, String(fd.get("title") ?? ""), String(fd.get("responsibleId") ?? "") || null); addRef.current?.reset(); router.refresh(); toast.success("Task added"); }} className="flex gap-1.5">
            <input name="title" placeholder="Add a task to this project…" className="input flex-1 py-1.5 text-xs" autoComplete="off" required />
            <select name="responsibleId" defaultValue="" className="input w-auto py-1.5 text-xs"><option value="">Assign…</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <button className="btn btn-accent py-1.5"><Plus size={14} /></button>
          </form>
        </div>
      )}
    </div>
  );
}
