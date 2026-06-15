"use client";

import { useTransition } from "react";
import { Check, Play, Plus, Trash2 } from "lucide-react";
import { deleteTask, setTaskProgress, setTaskStatus } from "@/app/actions";
import { useOverlay } from "./ui/overlay";
import { useToast } from "./ui/toast";

export function TaskActions({
  id,
  title,
  status,
  progress,
  compact = false,
}: {
  id: string;
  title?: string;
  status: string;
  progress: number;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const overlay = useOverlay();
  const done = status === "completed";

  return (
    <div className="flex items-center gap-0.5" style={{ opacity: pending ? 0.6 : 1 }}>
      {!done && !compact && (
        <button
          title="Log +25% progress"
          onClick={() =>
            start(async () => {
              const next = Math.min(100, progress + 25);
              await setTaskProgress(id, next);
              toast.info(next >= 100 ? "Completed" : `Progress: ${next}%`, title);
            })
          }
          className="rounded-md px-1.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
        >
          +25%
        </button>
      )}
      {!done && status !== "in_progress" && !compact && (
        <button
          title="Start"
          onClick={() =>
            start(async () => {
              await setTaskStatus(id, "in_progress");
              toast.info("Started", title);
            })
          }
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface2 hover:text-ink"
        >
          <Play size={12} strokeWidth={2.2} /> Start
        </button>
      )}
      <button
        title={done ? "Mark not done" : "Complete"}
        onClick={() =>
          start(async () => {
            await setTaskStatus(id, done ? "new" : "completed");
            if (!done) toast.success("Nice — done", title);
          })
        }
        className="flex h-7 w-7 items-center justify-center rounded-md border transition-all"
        style={{
          background: done ? "var(--ok)" : "transparent",
          color: done ? "#fff" : "var(--faint)",
          borderColor: done ? "var(--ok)" : "var(--border-strong)",
        }}
      >
        <Check size={15} strokeWidth={2.6} />
      </button>
      {!compact && (
        <button
          title="Delete"
          onClick={async () => {
            const ok = await overlay.confirm({
              title: "Delete task?",
              description: title ? `"${title}" will be permanently removed.` : "This can't be undone.",
              confirmText: "Delete",
              tone: "danger",
            });
            if (ok)
              start(async () => {
                await deleteTask(id);
                toast.success("Task deleted");
              });
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <Trash2 size={14} strokeWidth={1.9} />
        </button>
      )}
    </div>
  );
}
