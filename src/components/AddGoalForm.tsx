"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createGoal } from "@/app/actions";
import { HORIZONS } from "@/lib/horizons";
import { useToast } from "./ui/toast";

interface Options {
  domains: { id: string; name: string }[];
  goals: { id: string; title: string }[];
}

export function AddGoalForm({ options }: { options: Options }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();

  if (!open) {
    return (
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
        <Plus size={15} strokeWidth={2.4} /> New goal
      </button>
    );
  }

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          const title = String(fd.get("title") ?? "").trim();
          await createGoal(fd);
          ref.current?.reset();
          setOpen(false);
          if (title) toast.success("Goal created", title);
        })
      }
      className="card animate-pop-in space-y-3 p-4"
    >
      <input name="title" required autoFocus placeholder="Goal title" className="input text-sm font-medium" />
      <textarea name="description" placeholder="Why this matters (optional)" rows={2} className="input text-sm" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Horizon</label>
          <select name="horizon" defaultValue="annual" className="input">
            {HORIZONS.map((h) => (
              <option key={h.key} value={h.key}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Importance (1-5)</label>
          <input name="importance" type="number" min={1} max={5} defaultValue={3} className="input" />
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
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Metric</label>
          <input name="metric" placeholder="e.g. Books read" className="input" />
        </div>
        <div>
          <label className="label">Unit</label>
          <input name="unit" placeholder="e.g. books" className="input" />
        </div>
        <div>
          <label className="label">Ladders up to</label>
          <select name="parentId" defaultValue="" className="input">
            <option value="">— (top level)</option>
            {options.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Start value</label>
          <input name="startValue" type="number" step="any" defaultValue={0} className="input" />
        </div>
        <div>
          <label className="label">Current value</label>
          <input name="currentValue" type="number" step="any" defaultValue={0} className="input" />
        </div>
        <div>
          <label className="label">Target value</label>
          <input name="targetValue" type="number" step="any" placeholder="required for tracking" className="input" />
        </div>
        <div>
          <label className="label">Target date</label>
          <input name="targetDate" type="date" className="input" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="submit" className="btn btn-accent" disabled={pending}>
          {pending ? "Saving…" : "Add goal"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          A goal needs a target value + date to be tracked for pace.
        </span>
      </div>
    </form>
  );
}
