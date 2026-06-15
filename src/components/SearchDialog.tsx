"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListTodo, Search, User, X } from "lucide-react";
import { searchAction } from "@/app/actions";
import { STATUS_META, type Status } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { TaskDetailPanel } from "./TaskDetailPanel";

interface Member { id: string; name: string; color: string }

function initials(n: string) {
  const p = n.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function SearchDialog({
  open,
  onClose,
  options,
}: {
  open: boolean;
  onClose: () => void;
  options: { members: Member[]; projects: { id: string; title: string }[] };
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<{ tasks: PlannerTask[]; members: Member[] }>({ tasks: [], members: [] });
  const [selected, setSelected] = useState<PlannerTask | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else { setQ(""); setRes({ tasks: [], members: [] }); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !selected) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selected, onClose]);

  useEffect(() => {
    if (!q.trim()) { setRes({ tasks: [], members: [] }); return; }
    const t = setTimeout(async () => setRes(await searchAction(q)), 180);
    return () => clearTimeout(t);
  }, [q]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 animate-overlay-in" />
        <div className="animate-pop-in relative w-full max-w-xl overflow-hidden rounded-2xl border bg-surface shadow-pop" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 border-b px-4">
            <Search size={17} className="text-faint" />
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks and team members…" className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-faint" />
            <button onClick={onClose} className="rounded-md p-1 text-faint hover:bg-surface2"><X size={16} /></button>
          </div>
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {!q.trim() && <div className="py-8 text-center text-sm text-faint">Type to search across your workspace.</div>}
            {q.trim() && res.tasks.length === 0 && res.members.length === 0 && <div className="py-8 text-center text-sm text-faint">No matches.</div>}

            {res.members.length > 0 && (
              <div className="mb-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-faint">People</div>
                {res.members.map((m) => (
                  <button key={m.id} onClick={() => { onClose(); router.push("/team"); }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: m.color }}>{initials(m.name)}</span>
                    {m.name}
                  </button>
                ))}
              </div>
            )}

            {res.tasks.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-faint">Tasks</div>
                {res.tasks.map((t) => (
                  <button key={t.id} onClick={() => setSelected(t)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_META[t.status as Status]?.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{t.title}</span>
                      {t.projectTitle && <span className="block truncate text-[11px] text-faint">{t.projectTitle}</span>}
                    </span>
                    <ListTodo size={14} className="shrink-0 text-faint" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <TaskDetailPanel task={selected} options={options} onClose={() => setSelected(null)} />
    </>
  );
}
