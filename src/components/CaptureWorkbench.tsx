"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Inbox, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { parseCapture, type ParsedTask } from "@/lib/captureEngine";
import { createTasksFromCapture } from "@/app/actions";
import { useToast } from "./ui/toast";

interface Domain {
  key: string;
  name: string;
  color: string;
}

type Row = ParsedTask & { include: boolean; id: number };

const EXAMPLE = `Pay rent by end of month.
Call mom tomorrow evening.
Gym every morning this week.
Submit project proposal by Friday urgent.
Read 20 pages of my book this weekend.
Weekly team meeting every Monday at 10am for 1 hour.
Buy groceries today after 6pm.
Quick call with the client on Thursday at 2pm for 30 mins.
Follow up on the invoice — due EOW.
Fix the landing page bug asap.`;

const PRIORITY_META = {
  high:   { label: "High",   bg: "#fef2f2", color: "#ef4444" },
  medium: { label: "Medium", bg: "#fff7ed", color: "#f97316" },
  low:    { label: "Low",    bg: "#f0fdf4", color: "#22c55e" },
};

function fmtScheduled(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function CaptureWorkbench({ domains }: { domains: Domain[] }) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  const domainNames = domains.map((d) => d.name);
  const domainByName = (name: string | null) => domains.find((d) => d.name === name);

  function analyze() {
    const parsed = parseCapture(text, new Date(), domainNames);
    setRows(parsed.map((p, i) => ({ ...p, include: true, id: i })));
  }

  function patch(id: number, p: Partial<Row>) {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, ...p } : r)) ?? null);
  }

  const selected = rows?.filter((r) => r.include) ?? [];
  const scheduledCount = selected.filter((r) => r.scheduledAt).length;

  function commit() {
    if (selected.length === 0) return;
    start(async () => {
      // Adapt new ParsedTask format to the existing createTasksFromCapture CaptureInput shape
      const adapted = selected.map((r) => {
        const domainObj = domainByName(r.domain);
        let plannedDate: string | null = null;
        let startISO: string | null = null;
        let endISO: string | null = null;

        if (r.scheduledAt) {
          plannedDate = r.scheduledAt.slice(0, 10);
          startISO = r.scheduledAt;
          const startMs = new Date(r.scheduledAt).getTime();
          const durMs = (r.duration ?? 30) * 60 * 1000;
          endISO = new Date(startMs + durMs).toISOString();
        } else if (r.dueDate) {
          plannedDate = r.dueDate;
        }

        const effortHours = r.duration ? r.duration / 60 : 0.5;
        const urgency = r.priority === "high" ? 5 : r.priority === "low" ? 1 : 3;
        const impact  = r.priority === "high" ? 5 : r.priority === "low" ? 1 : 3;
        const type    = r.scheduledAt ? "meeting" : "operational";

        return {
          title: r.title,
          dueDate: r.dueDate,
          plannedDate,
          startISO,
          endISO,
          effortHours,
          domainKey: domainObj?.key ?? null,
          type,
          impact,
          urgency,
        };
      });

      const n = await createTasksFromCapture(adapted);
      toast.success(`Added ${n} task${n === 1 ? "" : "s"}`, `${scheduledCount} scheduled · ${n - scheduledCount} to waiting list`);
      setRows(null);
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Input panel */}
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
            placeholder={"Type or paste anything — emails, meeting notes, a to-do list…\n\nAtlas finds the tasks, dates, times, durations, and categories."}
            className="input resize-none text-sm leading-relaxed"
          />
          <button onClick={analyze} disabled={!text.trim()} className="btn btn-accent mt-3 w-full py-2.5">
            <Wand2 size={16} /> Break it down
          </button>
        </div>
        <p className="px-1 text-xs text-faint">
          Understands "by Friday", "tomorrow at 10am", "for 2 hours", "urgent", "every Monday". Scheduled tasks land on your planner; the rest go to the waiting list.
        </p>
      </div>

      {/* Preview panel */}
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
              {rows.map((r) => {
                const domainObj = domainByName(r.domain);
                return (
                  <div key={r.id} className="card p-3" style={{ opacity: r.include ? 1 : 0.5 }}>
                    <div className="flex items-start gap-2">
                      <input type="checkbox" checked={r.include} onChange={(e) => patch(r.id, { include: e.target.checked })} className="mt-1.5 h-4 w-4 accent-[var(--accent)]" />
                      <div className="min-w-0 flex-1">
                        <input value={r.title} onChange={(e) => patch(r.id, { title: e.target.value })} className="w-full bg-transparent text-sm font-medium outline-none" />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {/* Date */}
                          <label className="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-xs">
                            <CalendarClock size={12} className="text-faint" />
                            <input
                              type="date"
                              value={r.dueDate ?? r.scheduledAt?.slice(0, 10) ?? ""}
                              onChange={(e) => {
                                const v = e.target.value || null;
                                patch(r.id, { dueDate: v, scheduledAt: r.scheduledAt ? (v ? r.scheduledAt.replace(/^\d{4}-\d{2}-\d{2}/, v) : null) : null });
                              }}
                              className="bg-transparent text-xs outline-none"
                            />
                          </label>

                          {/* Scheduled time */}
                          {r.scheduledAt && (
                            <span className="rounded-md bg-surface2 px-1.5 py-1 text-xs text-muted">
                              {fmtScheduled(r.scheduledAt)}
                            </span>
                          )}

                          {/* Duration */}
                          {r.duration !== null && (
                            <span className="rounded-md bg-surface2 px-1.5 py-1 text-xs text-muted">
                              {r.duration < 60 ? `${r.duration}m` : `${(r.duration / 60).toFixed(r.duration % 60 === 0 ? 0 : 1)}h`}
                            </span>
                          )}

                          {/* Priority */}
                          {r.priority && (
                            <span className="rounded-md px-1.5 py-1 text-xs font-medium"
                              style={{ background: PRIORITY_META[r.priority].bg, color: PRIORITY_META[r.priority].color }}>
                              {PRIORITY_META[r.priority].label}
                            </span>
                          )}

                          {/* Domain */}
                          <select
                            value={r.domain ?? ""}
                            onChange={(e) => patch(r.id, { domain: e.target.value || null })}
                            className="rounded-md border bg-transparent px-1.5 py-1 text-xs"
                          >
                            <option value="">No category</option>
                            {domains.map((d) => <option key={d.key} value={d.name}>{d.name}</option>)}
                          </select>

                          {/* Recurrence */}
                          {r.recurrence && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-surface2 px-1.5 py-1 text-xs text-muted">
                              <RefreshCw size={10} /> {r.recurrence}
                            </span>
                          )}

                          {/* Domain color dot */}
                          {domainObj && (
                            <span className="h-2 w-2 rounded-full" style={{ background: domainObj.color }} title={domainObj.name} />
                          )}
                        </div>
                      </div>
                      <button onClick={() => setRows((rs) => rs?.filter((x) => x.id !== r.id) ?? null)} className="rounded p-1 text-faint hover:bg-surface2 hover:text-ink"><X size={14} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={commit} disabled={selected.length === 0} className="btn btn-accent w-full py-2.5">
              Add {selected.length} task{selected.length === 1 ? "" : "s"} to Atlas
            </button>
          </>
        )}
      </div>
    </div>
  );
}
