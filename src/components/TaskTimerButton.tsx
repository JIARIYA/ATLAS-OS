"use client";

import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { useTimer } from "@/context/TimerContext";
import { useRouter } from "next/navigation";

function fmtTracked(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function fmtElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TaskTimerButton({
  taskId,
  trackedSeconds,
  timerStartedAt,
}: {
  taskId: string;
  trackedSeconds: number;
  timerStartedAt: string | null;
}) {
  const { activeTaskId, startedAt, startTimer, stopTimer } = useTimer();
  const router = useRouter();
  const isRunning = activeTaskId === taskId;

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRunning, startedAt]);

  // Seed elapsed from server-side timerStartedAt if context doesn't have it
  const serverRunning = timerStartedAt && !isRunning;
  const serverElapsed = serverRunning ? Math.floor((Date.now() - new Date(timerStartedAt).getTime()) / 1000) : 0;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isRunning) {
      await stopTimer();
      router.refresh();
    } else {
      await startTimer(taskId);
    }
  }

  const totalTracked = trackedSeconds + (isRunning ? elapsed : 0);
  const displayElapsed = isRunning ? elapsed : serverElapsed;

  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {isRunning && (
        <span className="tabular-nums text-[11px] font-mono text-red-500">{fmtElapsed(displayElapsed)}</span>
      )}
      <button
        onClick={handleClick}
        className="rounded-full p-1 transition-colors hover:bg-surface2"
        title={isRunning ? "Stop timer" : "Start timer"}
      >
        {isRunning ? (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <Square size={12} className="text-red-500" />
          </div>
        ) : (
          <Play size={12} className="text-muted" />
        )}
      </button>
      {totalTracked > 0 && !isRunning && (
        <span className="text-[10px] text-faint">{fmtTracked(totalTracked)} tracked</span>
      )}
    </div>
  );
}
