"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { addTaskToDomain, createDomain, deleteDomain, deleteTask } from "@/app/actions";
import { STATUS_META, type Status } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useOverlay } from "./ui/overlay";
import { useToast } from "./ui/toast";

interface Member { id: string; name: string; color: string }
interface Domain { id: string; name: string; color: string; tasks: PlannerTask[]; open: number; done: number }

export function DomainsWorkspace({ domains, options }: { domains: Domain[]; options: { members: Member[]; projects: { id: string; title: string }[] } }) {
  const router = useRouter();
  const [, start] = useTransition();
  const toast = useToast();
  const addForm = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<PlannerTask | null>(null);

  return (
    <div className="animate-fade-in space-y-4">
      <form ref={addForm} action={(fd) => start(async () => { await createDomain(fd); addForm.current?.reset(); router.refresh(); toast.success("Domain added"); })} className="card flex gap-2 p-2">
        <input name="name" required placeholder="Add an aspect of your life (e.g. Fitness, Side project)…" className="input flex-1 border-0 focus:ring-0" autoComplete="off" />
        <button className="btn btn-accent whitespace-nowrap"><Plus size={15} /> Add domain</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {domains.map((d) => <DomainCard key={d.id} d={d} onSelect={setSelected} />)}
      </div>

      <TaskDetailPanel task={selected} options={options} onClose={() => setSelected(null)} />
    </div>
  );
}

function DomainCard({ d, onSelect }: { d: Domain; onSelect: (t: PlannerTask) => void }) {
  const router = useRouter();
  const [, start] = useTransition();
  const toast = useToast();
  const overlay = useOverlay();
  const [open, setOpen] = useState(false);
  const addRef = useRef<HTMLFormElement>(null);
  const total = d.open + d.done;
  const openTasks = d.tasks.filter((t) => t.status !== "completed");

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2.5">
        <button onClick={() => setOpen((o) => !o)} className="text-faint hover:text-ink">{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.color }} />
        <span className="flex-1 text-sm font-semibold">{d.name}</span>
        <span className="text-xs text-faint">{d.open} open · {d.done} done</span>
        <button onClick={async () => { if (await overlay.confirm({ title: `Delete "${d.name}"?`, description: total > 0 ? `${total} tasks will be kept but uncategorized.` : "This removes the domain.", confirmText: "Delete", tone: "danger" })) start(async () => { await deleteDomain(d.id); router.refresh(); toast.success("Domain removed"); }); }} className="rounded p-1 text-faint hover:text-danger"><Trash2 size={14} /></button>
      </div>
      {open && (
        <div className="mt-3 space-y-1.5 border-t pt-3">
          {openTasks.length === 0 && <div className="text-xs text-faint">No open tasks here.</div>}
          {openTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-md border bg-surface px-2 py-1.5 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_META[t.status as Status]?.color }} />
              <button onClick={() => onSelect(t)} className="min-w-0 flex-1 truncate text-left hover:underline">{t.title}</button>
              <button title="Remove task" onClick={async () => { if (await overlay.confirm({ title: "Delete task?", description: `"${t.title}" will be removed.`, confirmText: "Delete", tone: "danger" })) start(async () => { await deleteTask(t.id); router.refresh(); toast.success("Task removed"); }); }} className="rounded p-0.5 text-faint hover:text-danger"><Trash2 size={12} /></button>
            </div>
          ))}
          <form ref={addRef} action={async (fd) => { await addTaskToDomain(d.id, String(fd.get("title") ?? "")); addRef.current?.reset(); router.refresh(); toast.success("Task added"); }} className="flex gap-1.5 pt-1">
            <input name="title" placeholder={`Add to ${d.name}…`} className="input flex-1 py-1.5 text-xs" autoComplete="off" required />
            <button className="btn py-1.5"><Plus size={14} /></button>
          </form>
        </div>
      )}
    </div>
  );
}
