"use client";

import { useState } from "react";
import { Check, Edit2, X } from "lucide-react";

export function IntentionBanner({ initial }: { initial: string | null }) {
  const [intention, setIntention] = useState(initial ?? "");
  const [editing, setEditing] = useState(!initial);
  const [draft, setDraft] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);

  async function save(text: string) {
    setSaving(true);
    await fetch("/api/user/intention", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intention: text.trim(), date: new Date().toISOString() }),
    });
    setSaving(false);
    setIntention(text.trim());
    setEditing(false);
  }

  return (
    <div className="mb-4 rounded-xl border px-5 py-3.5 flex items-center gap-3"
      style={{ background: "color-mix(in srgb, #6366f1 5%, var(--surface))", borderColor: "color-mix(in srgb, #6366f1 20%, var(--border))" }}>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#6366f1" }}>Today&apos;s intention</div>

        {editing ? (
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(draft); if (e.key === "Escape") { setEditing(false); setDraft(intention); } }}
              placeholder="What's the one thing that matters today?"
              autoFocus
              className="flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-faint"
            />
            <button onClick={() => save(draft)} disabled={saving || !draft.trim()}
              className="rounded-full p-1 hover:bg-surface2 text-green-600 transition-colors disabled:opacity-40">
              <Check size={15} />
            </button>
            {intention && (
              <button onClick={() => { setEditing(false); setDraft(intention); }}
                className="rounded-full p-1 hover:bg-surface2 text-muted transition-colors">
                <X size={15} />
              </button>
            )}
          </div>
        ) : (
          <div className="text-sm font-medium text-ink truncate">{intention || "—"}</div>
        )}
      </div>

      {!editing && (
        <button onClick={() => { setEditing(true); setDraft(intention); }}
          className="shrink-0 rounded-full p-1.5 hover:bg-surface2 text-muted transition-colors">
          <Edit2 size={14} />
        </button>
      )}
    </div>
  );
}
