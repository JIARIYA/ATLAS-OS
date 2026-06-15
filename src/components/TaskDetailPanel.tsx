"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, File as FileIcon, Folder, Paperclip, Tag, Trash2, Upload, User, X } from "lucide-react";
import {
  deleteAttachment,
  deleteTask,
  getTaskAttachments,
  setTaskResponsible,
  setTaskStatus,
  unplanTask,
  updateTaskDetails,
  uploadAttachments,
} from "@/app/actions";
import type { AttachmentDTO } from "@/lib/attachments";
import { STATUSES, STATUS_META, TYPE_META, TYPES, type Status } from "@/lib/status";
import type { PlannerTask } from "@/lib/queries";
import { useToast } from "./ui/toast";
import { useOverlay } from "./ui/overlay";

interface Options {
  members: { id: string; name: string; color: string }[];
  projects: { id: string; title: string }[];
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskDetailPanel({
  task,
  options,
  onClose,
}: {
  task: PlannerTask | null;
  options: Options;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toast = useToast();
  const overlay = useOverlay();
  const [mounted, setMounted] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDTO[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) setMounted(true);
  }, [task]);

  useEffect(() => {
    if (!task) return;
    let active = true;
    getTaskAttachments(task.id).then((a) => { if (active) setAttachments(a); });
    return () => { active = false; };
  }, [task?.id]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0 || !task) return;
    const fd = new FormData();
    fd.append("taskId", task.id);
    Array.from(files).forEach((f) => fd.append("files", f));
    setUploading(true);
    try {
      const next = await uploadAttachments(fd);
      setAttachments(next);
      toast.success(`Attached ${files.length} file${files.length === 1 ? "" : "s"}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    start(async () => {
      await deleteAttachment(id);
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!task) return null;

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const currentIdx = STATUSES.indexOf(task.status as Status);

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/30 animate-overlay-in"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-[95] flex h-full w-full max-w-[520px] flex-col border-l bg-surface shadow-pop"
        style={{
          transform: mounted ? "translateX(0)" : "translateX(100%)",
          transition: "transform 240ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Status pipeline */}
        <div className="flex items-center gap-1.5 border-b px-5 py-3.5">
          <div className="flex flex-1 items-center gap-1 overflow-x-auto">
            {STATUSES.map((s, i) => {
              const meta = STATUS_META[s];
              const active = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <button
                  key={s}
                  onClick={() => run(async () => { await setTaskStatus(task.id, s); toast.success(`Moved to ${meta.label}`); })}
                  className="flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: isCurrent ? meta.color : `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                    color: isCurrent ? "#fff" : meta.color,
                    opacity: isCurrent || active ? 1 : 0.85,
                  }}
                >
                  {meta.label}
                  {i < STATUSES.length - 1 && <span className="opacity-50">›</span>}
                </button>
              );
            })}
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted hover:bg-surface2" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ opacity: pending ? 0.7 : 1 }}>
          {/* Title */}
          <textarea
            key={`title-${task.id}`}
            defaultValue={task.title}
            rows={1}
            className="w-full resize-none bg-transparent text-xl font-semibold tracking-tight outline-none"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== task.title) run(async () => { await updateTaskDetails(task.id, { title: v }); });
            }}
          />

          {/* Meta grid */}
          <div className="mt-5 space-y-3 text-sm">
            <Row icon={Folder} label="Created in">
              <span className="text-ink">{task.projectTitle ?? "—"}</span>
            </Row>
            <Row icon={CalendarDays} label="Due date">
              <input
                key={`due-${task.id}`}
                type="date"
                defaultValue={toDateInput(task.dueDate)}
                className="input w-auto py-1 text-sm"
                onChange={(e) => run(async () => { await updateTaskDetails(task.id, { dueDate: e.target.value || null }); })}
              />
            </Row>
            <Row icon={User} label="Responsible">
              <select
                key={`resp-${task.id}`}
                defaultValue={task.responsibleId ?? ""}
                className="input w-auto py-1 text-sm"
                onChange={(e) => run(async () => { await setTaskResponsible(task.id, e.target.value || null); })}
              >
                <option value="">Unassigned</option>
                {options.members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Row>
            <Row icon={Tag} label="Type">
              <select
                key={`type-${task.id}`}
                defaultValue={task.type}
                className="input w-auto py-1 text-sm"
                onChange={(e) => run(async () => { await updateTaskDetails(task.id, { type: e.target.value }); })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_META[t].label}</option>
                ))}
              </select>
            </Row>
          </div>

          {/* Description */}
          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">Description</div>
            <textarea
              key={`desc-${task.id}`}
              defaultValue={task.description ?? ""}
              rows={6}
              placeholder="Add a description…"
              className="input text-sm leading-relaxed"
              onBlur={(e) => {
                if ((e.target.value ?? "") !== (task.description ?? "")) run(async () => { await updateTaskDetails(task.id, { description: e.target.value }); });
              }}
            />
          </div>

          {/* Attachments */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-faint">
                <Paperclip size={13} /> Attachments {attachments.length > 0 && <span className="text-muted">({attachments.length})</span>}
              </span>
              <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 text-xs font-medium text-accent-ink hover:underline">
                <Upload size={13} /> Add files
              </button>
            </div>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
              className="rounded-xl border border-dashed p-3"
            >
              {uploading && <div className="mb-2 text-xs text-muted">Uploading…</div>}
              {attachments.length === 0 && !uploading && (
                <div className="py-2 text-center text-xs text-faint">Drop images or documents here, or click “Add files”.</div>
              )}
              {attachments.some((a) => a.isImage) && (
                <div className="mb-2 grid grid-cols-3 gap-2">
                  {attachments.filter((a) => a.isImage).map((a) => (
                    <div key={a.id} className="group relative aspect-square overflow-hidden rounded-lg border">
                      <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/files/${a.id}`} alt={a.filename} className="h-full w-full object-cover" />
                      </a>
                      <button onClick={() => removeAttachment(a.id)} className="absolute right-1 top-1 hidden rounded-md bg-black/60 p-1 text-white group-hover:block" title="Remove"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              {attachments.filter((a) => !a.isImage).map((a) => (
                <div key={a.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface2">
                  <FileIcon size={15} className="shrink-0 text-muted" />
                  <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm hover:underline">{a.filename}</a>
                  <span className="shrink-0 text-[11px] text-faint">{fmtSize(a.size)}</span>
                  <button onClick={() => removeAttachment(a.id)} className="hidden rounded p-1 text-faint hover:text-danger group-hover:block"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Planner status */}
          <div className="mt-6 rounded-xl border p-3 text-xs text-muted">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">On the planner</span>
              {task.plannedDate ? (
                <button className="text-accent-ink hover:underline" onClick={() => run(async () => { await unplanTask(task.id); toast.info("Moved to waiting list"); })}>
                  Move to waiting list
                </button>
              ) : (
                <span className="text-faint">In waiting list</span>
              )}
            </div>
            {task.plannedDate && (
              <div className="mt-1">
                {new Date(task.plannedDate).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                {" · "}
                {task.effortHours}h
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-5 py-3">
          <span className="text-xs text-faint">Priority score {task.score}</span>
          <button
            onClick={async () => {
              const ok = await overlay.confirm({ title: "Delete task?", description: `"${task.title}" will be permanently removed.`, confirmText: "Delete", tone: "danger" });
              if (ok) start(async () => { await deleteTask(task.id); toast.success("Task deleted"); onClose(); router.refresh(); });
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </aside>
    </>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof Folder; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-32 shrink-0 items-center gap-2 text-muted">
        <Icon size={15} strokeWidth={1.8} />
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
