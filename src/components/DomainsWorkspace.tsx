"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Target, Trash2 } from "lucide-react";
import { addTaskToDomain, createDomain, deleteDomain, deleteTask } from "@/app/actions";
import { STATUS_META, type Status } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { useOverlay } from "./ui/overlay";
import { useToast } from "./ui/toast";

interface Member { id: string; name: string; color: string }
interface Domain { id: string; name: string; color: string; tasks: PlannerTask[]; open: number; done: number }

function BalanceRadar({ domains }: { domains: Domain[] }) {
  if (domains.length < 3) return null;
  const cx = 130, cy = 130, r = 90;
  const n = domains.length;
  const scores = domains.map((d) => Math.min(d.open * 15 + d.done * 5, 100));
  const maxScore = Math.max(1, ...scores);

  function pt(i: number, frac: number) {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    return { x: cx + frac * r * Math.cos(angle), y: cy + frac * r * Math.sin(angle) };
  }

  function gridPoly(frac: number) {
    return Array.from({ length: n }, (_, i) => {
      const p = pt(i, frac);
      return `${p.x},${p.y}`;
    }).join(" ");
  }

  const dataPoints = domains.map((d, i) => pt(i, scores[i] / maxScore));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + "Z";

  return (
    <div className="card mb-4 p-4">
      <div className="mb-1 text-sm font-semibold">Balance Wheel</div>
      <div className="text-xs text-faint mb-3">Active work per life area</div>
      <div className="flex justify-center">
        <svg width={260} height={260} viewBox="0 0 260 260">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <polygon key={f} points={gridPoly(f)} fill="none" stroke="var(--border)" strokeWidth={0.8} />
          ))}
          {domains.map((_, i) => {
            const p = pt(i, 1);
            return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--border)" strokeWidth={0.8} />;
          })}
          <path d={dataPath} fill="var(--accent)" fillOpacity={0.18} stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
          {dataPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={domains[i].color} stroke="var(--surface)" strokeWidth={1.5} />
          ))}
          {domains.map((d, i) => {
            const p = pt(i, 1.22);
            return (
              <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fill="var(--muted)" style={{ fontSize: 9 }}>
                {d.name.length > 10 ? d.name.slice(0, 9) + "…" : d.name}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function DomainsWorkspace({ domains, options }: { domains: Domain[]; options: { members: Member[]; projects: { id: string; title: string }[] } }) {
  const router = useRouter();
  const [, start] = useTransition();
  const toast = useToast();
  const addForm = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<PlannerTask | null>(null);

  return (
    <div className="animate-fade-in space-y-4">
      <BalanceRadar domains={domains} />

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

function GoalsSection({ domainId }: { domainId: string }) {
  const [goals, setGoals] = useState<{ id: string; title: string; targetDate: string | null }[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/goals?domainId=${domainId}`).then((r) => r.json()).then((d) => { if (active) setGoals(d.data ?? []); });
    return () => { active = false; };
  }, [domainId]);

  async function add() {
    const t = title.trim();
    if (!t) return;
    setTitle("");
    const res = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t, domainId }) });
    const d = await res.json();
    if (d.data) setGoals((prev) => [...prev, d.data]);
  }

  async function remove(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
        <Target size={11} /> Goals
      </div>
      {goals.length === 0 && <div className="text-xs text-faint">No goals set for this domain yet.</div>}
      {goals.map((g) => (
        <div key={g.id} className="group flex items-center gap-2 py-1 text-xs">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
          <span className="flex-1 text-ink">{g.title}</span>
          <button onClick={() => remove(g.id)} className="hidden text-faint hover:text-danger group-hover:block"><Trash2 size={11} /></button>
        </div>
      ))}
      <div className="mt-1.5 flex gap-1.5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a goal for this domain…" className="input flex-1 py-1 text-xs" />
        <button onClick={add} disabled={!title.trim()} className="btn py-1 disabled:opacity-40"><Plus size={12} /></button>
      </div>
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
          <GoalsSection domainId={d.id} />
        </div>
      )}
    </div>
  );
}
