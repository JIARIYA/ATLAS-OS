"use client";

import { useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WorkdayPicker({ defaultValue }: { defaultValue: string }) {
  const initial = new Set((defaultValue || "1,2,3,4,5").split(",").map(Number).filter((n) => n >= 1 && n <= 7));
  const [active, setActive] = useState(initial);

  function toggle(day: number) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(day)) { next.delete(day); } else { next.add(day); }
      return next;
    });
  }

  const value = Array.from(active).sort((a, b) => a - b).join(",");

  return (
    <div>
      <label className="label">Workdays</label>
      <input type="hidden" name="workdays" value={value} />
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((d, i) => {
          const day = i + 1;
          const on = active.has(day);
          return (
            <button
              type="button"
              key={d}
              onClick={() => toggle(day)}
              className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: on ? "var(--accent)" : "transparent",
                color: on ? "#fff" : "var(--muted)",
                borderColor: on ? "var(--accent)" : "var(--border)",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
