"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Folder, Scale } from "lucide-react";

const WORKDAYS = [
  { label: "Mo", value: 1 }, { label: "Tu", value: 2 }, { label: "We", value: 3 },
  { label: "Th", value: 4 }, { label: "Fr", value: 5 }, { label: "Sa", value: 6 },
  { label: "Su", value: 0 },
];

const COLOR_OPTIONS = [
  "#6366f1", "#8b5cf6", "#22c55e", "#f97316", "#ef4444", "#0ea5e9",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [deepWork, setDeepWork] = useState(4);
  const [totalWork, setTotalWork] = useState(8);

  // Step 2 state
  const [mode, setMode] = useState<"project" | "goal" | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState(COLOR_OPTIONS[0]);
  const [goalDomainId, setGoalDomainId] = useState("");
  const [goalText, setGoalText] = useState("");

  // Step 3 state
  const [intention, setIntention] = useState("");

  const [saving, setSaving] = useState(false);

  function toggleDay(v: number) {
    setSelectedDays((d) => d.includes(v) ? d.filter((x) => x !== v) : [...d, v]);
  }

  async function step1Next() {
    setSaving(true);
    await fetch("/api/onboarding/capacity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workdays: selectedDays.sort().join(","), deepWorkHours: deepWork, totalWorkHours: totalWork }),
    });
    setSaving(false);
    setStep(1);
  }

  async function step2Next() {
    setSaving(true);
    if (mode === "project" && projectName.trim()) {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: projectName.trim(), color: projectColor }),
      }).catch(() => {});
    }
    if (mode === "goal" && goalText.trim() && goalDomainId) {
      await fetch("/api/goals-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: goalText.trim(), domainId: goalDomainId }),
      }).catch(() => {});
    }
    setSaving(false);
    setStep(2);
  }

  async function step3Finish() {
    setSaving(true);
    if (intention.trim()) {
      await fetch("/api/user/intention", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intention: intention.trim(), date: new Date().toISOString() }),
      });
    }
    setSaving(false);
    router.push("/");
  }

  const dots = [0, 1, 2];

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="mb-8 flex justify-center gap-2">
          {dots.map((i) => (
            <div key={i} className="h-2 w-2 rounded-full transition-colors"
              style={{ background: i === step ? "var(--accent)" : "var(--border)" }} />
          ))}
        </div>

        {step === 0 && (
          <div className="card p-6 space-y-6">
            <div>
              <h1 className="text-xl font-semibold text-ink">How does your week look?</h1>
              <p className="mt-1 text-sm text-muted">Set your working pattern so Atlas can plan realistically.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">Work days</label>
              <div className="flex gap-1.5 flex-wrap">
                {WORKDAYS.map((d) => (
                  <button key={d.value} onClick={() => toggleDay(d.value)}
                    className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      background: selectedDays.includes(d.value) ? "var(--accent)" : "var(--surface2)",
                      color: selectedDays.includes(d.value) ? "#fff" : "var(--ink)",
                    }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">Deep work hours / day</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setDeepWork((v) => Math.max(1, v - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border text-ink hover:bg-surface2">−</button>
                <span className="w-8 text-center text-base font-semibold text-ink">{deepWork}</span>
                <button onClick={() => setDeepWork((v) => Math.min(12, v + 1))} className="flex h-8 w-8 items-center justify-center rounded-full border text-ink hover:bg-surface2">+</button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-ink">Total working hours / day</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setTotalWork((v) => Math.max(1, v - 1))} className="flex h-8 w-8 items-center justify-center rounded-full border text-ink hover:bg-surface2">−</button>
                <span className="w-8 text-center text-base font-semibold text-ink">{totalWork}</span>
                <button onClick={() => setTotalWork((v) => Math.min(16, v + 1))} className="flex h-8 w-8 items-center justify-center rounded-full border text-ink hover:bg-surface2">+</button>
              </div>
            </div>

            <button onClick={step1Next} disabled={saving} className="btn btn-accent w-full py-2.5">
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="card p-6 space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-ink">What are you working toward?</h1>
              <p className="mt-1 text-sm text-muted">Optionally add a project or life goal to start.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setMode(mode === "project" ? null : "project")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
                style={{ borderColor: mode === "project" ? "var(--accent)" : "var(--border)", background: mode === "project" ? "var(--accent-soft)" : "var(--surface2)" }}>
                <Folder size={22} style={{ color: mode === "project" ? "var(--accent)" : "var(--muted)" }} />
                <span className="text-sm font-medium text-ink">Add a project</span>
              </button>
              <button onClick={() => setMode(mode === "goal" ? null : "goal")}
                className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors"
                style={{ borderColor: mode === "goal" ? "var(--accent)" : "var(--border)", background: mode === "goal" ? "var(--accent-soft)" : "var(--surface2)" }}>
                <Scale size={22} style={{ color: mode === "goal" ? "var(--accent)" : "var(--muted)" }} />
                <span className="text-sm font-medium text-ink">Set a life goal</span>
              </button>
            </div>

            {mode === "project" && (
              <div className="space-y-3 rounded-xl border p-4">
                <input value={projectName} onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name" className="input text-sm" />
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c} onClick={() => setProjectColor(c)}
                      className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: projectColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
            )}

            {mode === "goal" && (
              <div className="space-y-3 rounded-xl border p-4">
                <input value={goalText} onChange={(e) => setGoalText(e.target.value)}
                  placeholder="Goal description" className="input text-sm" />
              </div>
            )}

            <button onClick={step2Next} disabled={saving} className="btn btn-accent w-full py-2.5">
              {saving ? "Saving…" : "Next →"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card p-6 space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-ink">What&apos;s the one thing that matters today?</h1>
              <p className="mt-1 text-sm text-muted">Set a single intention to focus your day.</p>
            </div>

            <input
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") step3Finish(); }}
              placeholder="Finish the proposal draft..."
              className="input text-base py-3"
              autoFocus
            />

            <button onClick={step3Finish} disabled={saving} className="btn btn-accent w-full py-2.5">
              {saving ? "Saving…" : "Let's go →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
