"use client";

import { useRef, useTransition } from "react";
import { Plus, Sparkles } from "lucide-react";
import { quickAddTask } from "@/app/actions";
import { useToast } from "./ui/toast";

export function QuickCapture({ domains }: { domains: { id: string; name: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          const title = String(fd.get("title") ?? "").trim();
          await quickAddTask(fd);
          ref.current?.reset();
          inputRef.current?.focus();
          if (title) toast.success("Captured", title);
        })
      }
      className="card flex flex-col gap-2 p-2 shadow-sm sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-center gap-2 px-2">
        <Sparkles size={16} className="shrink-0 text-faint" />
        <input
          ref={inputRef}
          name="title"
          required
          autoComplete="off"
          placeholder="Capture anything — what's on your mind?"
          className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-faint"
        />
      </div>
      <div className="flex items-center gap-2">
        <select name="domainId" className="input w-auto py-1.5 text-xs" defaultValue="">
          <option value="">No domain</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input name="dueDate" type="date" className="input w-auto py-1.5 text-xs" />
        <button type="submit" className="btn btn-accent whitespace-nowrap" disabled={pending}>
          <Plus size={15} strokeWidth={2.4} /> Capture
        </button>
      </div>
    </form>
  );
}
