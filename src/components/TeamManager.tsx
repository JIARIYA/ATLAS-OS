"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { addTaskForMember, createMember, createTeam, deleteMember, deleteTeam, getMemberTasks, setTaskResponsible, updateMember } from "@/app/actions";
import { STATUS_META, type Status } from "@/lib/status";
import { useOverlay } from "./ui/overlay";
import { useToast } from "./ui/toast";

interface Team { id: string; name: string; color: string }
interface Member { id: string; name: string; color: string; teamId: string | null; isSelf: boolean; openTasks: number }
interface MTask { id: string; title: string; status: string }

function initials(n: string) {
  const p = n.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function TeamManager({ teams, members }: { teams: Team[]; members: Member[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const toast = useToast();
  const overlay = useOverlay();
  const memberForm = useRef<HTMLFormElement>(null);
  const teamForm = useRef<HTMLFormElement>(null);
  const run = (fn: () => Promise<void>) => start(async () => { await fn(); router.refresh(); });

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4">
        <form ref={memberForm} action={(fd) => start(async () => { await createMember(fd); memberForm.current?.reset(); router.refresh(); toast.success("Member added"); })} className="card space-y-2 p-4">
          <div className="text-sm font-semibold">Add member</div>
          <input name="name" required placeholder="Full name" className="input" autoComplete="off" />
          <select name="teamId" defaultValue="" className="input">
            <option value="">No team</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn btn-accent w-full"><Plus size={15} /> Add member</button>
        </form>
        <form ref={teamForm} action={(fd) => start(async () => { await createTeam(fd); teamForm.current?.reset(); router.refresh(); toast.success("Team created"); })} className="card space-y-2 p-4">
          <div className="text-sm font-semibold">Add team</div>
          <input name="name" required placeholder="Team name" className="input" autoComplete="off" />
          <button className="btn w-full"><Plus size={15} /> Add team</button>
        </form>
      </div>

      <div className="space-y-4 lg:col-span-2">
        {[...teams.map((t) => ({ id: t.id as string | null, name: t.name, color: t.color })), { id: null, name: "No team", color: "#94a3b8" }].map((group) => {
          const groupMembers = members.filter((m) => m.teamId === group.id);
          if (group.id === null && groupMembers.length === 0) return null;
          return (
            <div key={group.id ?? "none"} className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />{group.name}
                  <span className="text-xs font-normal text-faint">{groupMembers.length}</span>
                </span>
                {group.id && (
                  <button onClick={async () => { const ok = await overlay.confirm({ title: `Delete "${group.name}"?`, description: "Members stay, but are unassigned from this team.", confirmText: "Delete", tone: "danger" }); if (ok) run(async () => { await deleteTeam(group.id!); toast.success("Team deleted"); }); }} className="rounded p-1 text-faint hover:text-danger"><Trash2 size={14} /></button>
                )}
              </div>
              <div className="space-y-1.5">
                {groupMembers.length === 0 && <div className="text-xs text-faint">No members.</div>}
                {groupMembers.map((m) => <MemberRow key={m.id} m={m} teams={teams} run={run} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberRow({ m, teams, run }: { m: Member; teams: Team[]; run: (fn: () => Promise<void>) => void }) {
  const overlay = useOverlay();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<MTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) { setTasks(await getMemberTasks(m.id)); setLoaded(true); }
  }
  async function refresh() { setTasks(await getMemberTasks(m.id)); }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 p-2">
        <button onClick={toggle} className="text-faint hover:text-ink">{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: m.color }}>{initials(m.name)}</span>
        <input defaultValue={m.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== m.name) run(async () => { await updateMember(m.id, { name: v }); }); }} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" />
        <span className="hidden text-xs text-faint sm:inline">{m.openTasks} open</span>
        <select defaultValue={m.teamId ?? ""} onChange={(e) => run(async () => { await updateMember(m.id, { teamId: e.target.value || null }); })} className="rounded-md border bg-transparent px-1.5 py-1 text-xs">
          <option value="">No team</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {!m.isSelf && (
          <button onClick={async () => { if (await overlay.confirm({ title: `Remove ${m.name}?`, description: "Their tasks become unassigned.", confirmText: "Remove", tone: "danger" })) run(async () => { await deleteMember(m.id); toast.success("Member removed"); }); }} className="rounded p-1 text-faint hover:text-danger"><Trash2 size={13} /></button>
        )}
      </div>
      {open && (
        <div className="space-y-1.5 border-t bg-surface2/30 p-2.5">
          {tasks.length === 0 && <div className="text-xs text-faint">No open tasks.</div>}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-md bg-surface px-2 py-1.5 text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_META[t.status as Status]?.color }} />
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <button title="Unassign" onClick={async () => { await setTaskResponsible(t.id, null); await refresh(); toast.info("Unassigned"); }} className="rounded p-0.5 text-faint hover:text-danger"><X size={13} /></button>
            </div>
          ))}
          <form action={async (fd) => { const title = String(fd.get("title") ?? ""); await addTaskForMember(m.id, title); addRef.current!.value = ""; await refresh(); }} className="flex gap-1.5 pt-1">
            <input ref={addRef} name="title" placeholder="Add a task for them…" className="input flex-1 py-1.5 text-xs" autoComplete="off" />
            <button className="btn py-1.5"><Plus size={14} /></button>
          </form>
        </div>
      )}
    </div>
  );
}
