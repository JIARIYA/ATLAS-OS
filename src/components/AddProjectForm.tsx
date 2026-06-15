"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createProject } from "@/app/actions";
import { useToast } from "./ui/toast";

interface Options {
  domains: { id: string; name: string }[];
  goals: { id: string; title: string }[];
}

export function AddProjectForm({ options }: { options: Options }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();

  if (!open) {
    return (
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
        <Plus size={15} strokeWidth={2.4} /> New project
      </button>
    );
  }

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          const title = String(fd.get("title") ?? "").trim();
          await createProject(fd);
          ref.current?.reset();
          setOpen(false);
          if (title) toast.success("Project created", title);
        })
      }
      className="card animate-pop-in space-y-3 p-4"
    >
      <input name="title" required autoFocus placeholder="Project title" className="input text-sm font-medium" />
      <textarea name="objective" placeholder="Objective — what outcome does this produce?" rows={2} className="input text-sm" />
      <textarea name="successCriteria" placeholder="Success criteria — how will you know it's done?" rows={2} className="input text-sm" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Target date</label>
          <input name="targetDate" type="date" className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue="active" className="input">
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="done">Done</option>
          </select>
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
          {pending ? "Saving…" : "Add project"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
