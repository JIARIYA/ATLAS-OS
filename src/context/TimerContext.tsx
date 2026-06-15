"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface TimerState {
  activeTaskId: string | null;
  startedAt: Date | null;
}

interface TimerContextValue extends TimerState {
  startTimer: (taskId: string) => Promise<void>;
  stopTimer: () => Promise<void>;
}

const TimerContext = createContext<TimerContextValue>({
  activeTaskId: null,
  startedAt: null,
  startTimer: async () => {},
  stopTimer: async () => {},
});

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TimerState>({ activeTaskId: null, startedAt: null });

  const stopTimer = useCallback(async () => {
    if (!state.activeTaskId) return;
    await fetch(`/api/tasks/${state.activeTaskId}/timer`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    setState({ activeTaskId: null, startedAt: null });
  }, [state.activeTaskId]);

  const startTimer = useCallback(async (taskId: string) => {
    // Stop existing timer first
    if (state.activeTaskId && state.activeTaskId !== taskId) {
      await fetch(`/api/tasks/${state.activeTaskId}/timer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
    }
    await fetch(`/api/tasks/${taskId}/timer`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    setState({ activeTaskId: taskId, startedAt: new Date() });
  }, [state.activeTaskId]);

  return (
    <TimerContext.Provider value={{ ...state, startTimer, stopTimer }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  return useContext(TimerContext);
}
