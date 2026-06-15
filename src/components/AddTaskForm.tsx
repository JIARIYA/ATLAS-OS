"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTask } from "@/app/actions";
import { useToast } from "./ui/toast";

interface Options {
  domains: { id: string; name: string }[];
  projects: { id: string; title: string; goalId: string | null }[];
  goals: { id: string; title: string }[];
}

export function AddTaskForm({ options }: { options: Options }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();

  if (!open) {
    return (
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
        <Plus size={15} strokeWidth={2.4} /> New task
      </button>
    );
  }

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          const title = String(fd.get("title") ?? "").trim();
          await createTask(fd);
          ref.current?.reset();
          setOpen(false);
          if (title) toast.success("Task created", title);
        })
      }
      className="card animate-pop-in space-y-3 p-4"
    >
      <input
        name="title"
        required
        autoFocus
        autoComplete="off"
        placeholder="Task title"
        className="input text-sm font-medium"
      />
      <textarea
        name="description"
        placeholder="Notes / context (optional)"
        rows={2}
        className="input text-sm"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Impact (1-5)</label>
          <input name="impact" type="number" min={1} max={5} defaultValue={3} className="input" />
        </div>
        <div>
          <label className="label">Urgency (1-5)</label>
          <input name="urgency" type="number" min={1} max={5} defaultValue={3} className="input" />
        </div>
        <div>
          <label className="label">Effort (hours)</label>
          <input name="effortHours" type="number" min={0} step={0.5} defaultValue={1} className="input" />
        </div>
        <div>
          <label className="label">Energy</label>
          <select name="energy" defaultValue="medium" className="input">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Due date</label>
          <input name="dueDate" type="date" className="input" />
        </div>
        <div>
          <label className="label">Domain</label>
          <select name="domainId" defaultValue="" className="input">
            <option value="">—</option>
            {options.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Project</label>
          <select name="projectId" defaultValue="" className="input">
            <option value="">—</option>
            {options.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Goal</label>
          <select name="goalId" defaultValue="" className="input">
            <option value="">—</option>
            {options.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-accent" disabled={pending}>
          {pending ? "Saving…" : "Add task"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          Tip: link a goal or project so it doesn't get flagged as an orphan.
        </span>
      </div>
    </form>
  );
}
