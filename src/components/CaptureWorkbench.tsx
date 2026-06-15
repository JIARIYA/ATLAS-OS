"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Inbox, Sparkles, Wand2, X } from "lucide-react";
import { parseCapture, type ParsedTask } from "@/lib/capture";
import { createTasksFromCapture } from "@/app/actions";
import { TYPES, TYPE_META, type TaskType } from "@/lib/status";
import { useToast } from "./ui/toast";

interface Domain {
  key: string;
  name: string;
  color: string;
}
type Row = ParsedTask & { include: boolean; id: number };

const EXAMPLE = `Finish the Q4 board deck by Friday (3h)
Call the dentist tomorrow at 10am to reschedule
Review Anastasia's design drafts, urgent
Pay the electricity bill on the 28th
Go for a 5k run on Saturday morning
Read 2 chapters of the strategy book next week
Prep talking points for Monday's 1:1 with Sofia for 30 min`;

export function CaptureWorkbench({ domains }: { domains: Domain[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  const domainName = (key: string | null) => domains.find((d) => d.key === key)?.name ?? null;
  const domainColor = (key: string | null) => domains.find((d) => d.key === key)?.color ?? "var(--faint)";

  function analyze() {
    const parsed = parseCapture(text);
    setRows(parsed.map((p, i) => ({ ...p, include: true, id: i })));
  }

  function patch(id: number, p: Partial<Row>) {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...p } : r)) ?? null);
  }

  function setDate(id: number, value: string) {
    const v = value || null;
    setRows((rs) =>
      rs?.map((r) =>
        r.id === id ? { ...r, plannedDate: v, dueDate: v, startISO: v ? r.startISO : null, endISO: v ? r.endISO : null } : r,
      ) ?? null,
    );
  }

  const selected = rows?.filter((r) => r.include) ?? [];
  const scheduledCount = selected.filter((r) => r.plannedDate).length;

  function commit() {
    if (selected.length === 0) return;
    start(async () => {
      const n = await createTasksFromCapture(
        selected.map(({ include, id, ...rest }) => rest),
      );
      toast.success(`Added ${n} task${n === 1 ? "" : "s"}`, `${scheduledCount} scheduled · ${n - scheduledCount} to waiting list`);
      setRows(null);
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Input */}
      <div className="space-y-3">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={15} className="text-accent" /> Brain dump
            </span>
            <button onClick={() => setText(EXAMPLE)} className="text-xs font-medium text-accent-ink hover:underline">
              Try an example
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={"Type or paste anything — emails, meeting notes, a to-do list, a message to yourself…\n\nAtlas finds the tasks, dates, times, durations, and categories."}
            className="input resize-none text-sm leading-relaxed"
          />
          <button onClick={analyze} disabled={!text.trim()} className="btn btn-accent mt-3 w-full py-2.5">
            <Wand2 size={16} /> Break it down
          </button>
        </div>
        <p className="px-1 text-xs text-faint">
          Understands phrases like “by Friday”, “tomorrow at 10am”, “for 2 hours”, “urgent”, “next week”. Dated tasks
          go on your planner; everything else lands in the waiting list.
        </p>
      </div>

      {/* Preview */}
      <div className="space-y-3">
        {!rows ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-faint"><Inbox size={22} /></div>
            <div className="text-sm font-medium text-muted">Parsed tasks appear here</div>
            <div className="mt-1 text-xs text-faint">Review and tweak before adding them.</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted">Couldn&apos;t find any tasks. Try writing one action per line.</div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{rows.length} task{rows.length === 1 ? "" : "s"} found</span>
              <span className="text-xs text-muted">{scheduledCount} scheduled · {selected.length - scheduledCount} waiting</span>
            </div>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="card p-3" style={{ opacity: r.include ? 1 : 0.5 }}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={r.include} onChange={(e) => patch(r.id, { include: e.target.checked })} className="mt-1.5 h-4 w-4 accent-[var(--accent)]" />
                    <div className="min-w-0 flex-1">
                      <input value={r.title} onChange={(e) => patch(r.id, { title: e.target.value })} className="w-full bg-transparent text-sm font-medium outline-none" />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <label className="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs">
                          <CalendarClock size={12} className="text-faint" />
                          <input type="date" value={r.plannedDate ?? ""} onChange={(e) => setDate(r.id, e.target.value)} className="bg-transparent text-xs outline-none" />
                        </label>
                        <select value={r.domainKey ?? ""} onChange={(e) => patch(r.id, { domainKey: e.target.value || null })} className="rounded-md border bg-transparent px-1.5 py-1 text-xs">
                          <option value="">No category</option>
                          {domains.map((d) => <option key={d.key} value={d.key}>{d.name}</option>)}
                        </select>
                        <select value={r.type} onChange={(e) => patch(r.id, { type: e.target.value })} className="rounded-md border bg-transparent px-1.5 py-1 text-xs">
                          {TYPES.map((t) => <option key={t} value={t}>{TYPE_META[t as TaskType].label}</option>)}
                        </select>
                        <input type="number" step="0.25" min={0} value={r.effortHours} onChange={(e) => patch(r.id, { effortHours: Number(e.target.value) })} className="w-16 rounded-md border bg-transparent px-1.5 py-1 text-xs" title="Hours" />
                        {r.startISO && <span className="text-[11px] text-muted">{new Date(r.startISO).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
                        {r.domainKey && <span className="h-2 w-2 rounded-full" style={{ background: domainColor(r.domainKey) }} title={domainName(r.domainKey) ?? ""} />}
                      </div>
                    </div>
                    <button onClick={() => setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null)} className="rounded p-1 text-faint hover:bg-surface2 hover:text-ink"><X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={commit} disabled={pending || selected.length === 0} className="btn btn-accent w-full py-2.5">
              {pending ? "Adding…" : `Add ${selected.length} task${selected.length === 1 ? "" : "s"} to Atlas`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
