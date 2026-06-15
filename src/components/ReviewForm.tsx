"use client";

import { useRef, useTransition } from "react";
import { createReview } from "@/app/actions";
import { useToast } from "./ui/toast";

export function ReviewForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  return (
    <form
      ref={ref}
      action={(fd) =>
        start(async () => {
          await createReview(fd);
          ref.current?.reset();
          toast.success("Review logged", "Reflection saved");
        })
      }
      className="card space-y-3 p-5"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select name="type" defaultValue="daily" className="input">
            <option value="daily">Daily review</option>
            <option value="weekly">Weekly review</option>
          </select>
        </div>
        <div>
          <label className="label">Energy today (1-5)</label>
          <input name="energy" type="number" min={1} max={5} defaultValue={3} className="input" />
        </div>
      </div>
      <div>
        <label className="label">Wins — what moved forward?</label>
        <textarea name="wins" rows={2} className="input text-sm" placeholder="What did you complete or learn?" />
      </div>
      <div>
        <label className="label">Blockers — what got in the way?</label>
        <textarea name="blockers" rows={2} className="input text-sm" placeholder="What slowed you down?" />
      </div>
      <div>
        <label className="label">Notes / intention for tomorrow</label>
        <textarea name="notes" rows={2} className="input text-sm" placeholder="One thing to carry forward." />
      </div>
      <button type="submit" className="btn btn-accent" disabled={pending}>
        {pending ? "Saving…" : "Log review"}
      </button>
    </form>
  );
}
