"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface ConfirmOpts {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
}
interface PromptOpts {
  title: string;
  description?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
}

interface OverlayApi {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
}

const OverlayContext = createContext<OverlayApi | null>(null);

type State =
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | null;

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(
    (result: boolean | string | null) => {
      setState((s) => {
        if (s) {
          if (s.kind === "confirm") (s.resolve as (v: boolean) => void)(result as boolean);
          else (s.resolve as (v: string | null) => void)(result as string | null);
        }
        return null;
      });
    },
    [],
  );

  const api: OverlayApi = {
    confirm: (opts) =>
      new Promise<boolean>((resolve) => setState({ kind: "confirm", opts, resolve })),
    prompt: (opts) =>
      new Promise<string | null>((resolve) => {
        setValue(opts.defaultValue ?? "");
        setState({ kind: "prompt", opts, resolve });
      }),
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(state.kind === "confirm" ? false : null);
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      if (state.kind === "prompt") inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [state, close]);

  const danger = state?.kind === "confirm" && state.opts.tone === "danger";

  return (
    <OverlayContext.Provider value={api}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="animate-overlay-in absolute inset-0"
            style={{ background: "rgba(8,9,12,0.5)", backdropFilter: "blur(2px)" }}
            onClick={() => close(state.kind === "confirm" ? false : null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="animate-pop-in relative w-full max-w-sm rounded-2xl border bg-surface p-5 shadow-pop"
          >
            <h2 className="text-base font-semibold text-ink">{state.opts.title}</h2>
            {state.opts.description && (
              <p className="mt-1.5 text-sm text-muted">{state.opts.description}</p>
            )}

            {state.kind === "prompt" && (
              <div className="mt-3">
                {state.opts.label && <label className="label">{state.opts.label}</label>}
                <input
                  ref={inputRef}
                  className="input"
                  value={value}
                  placeholder={state.opts.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") close(value.trim() ? value.trim() : null);
                  }}
                />
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => close(state.kind === "confirm" ? false : null)}
              >
                {state.kind === "confirm" ? state.opts.cancelText ?? "Cancel" : "Cancel"}
              </button>
              <button
                className={`btn ${danger ? "btn-danger" : "btn-accent"}`}
                onClick={() =>
                  close(
                    state.kind === "confirm" ? true : value.trim() ? value.trim() : null,
                  )
                }
              >
                {state.kind === "confirm"
                  ? state.opts.confirmText ?? "Confirm"
                  : state.opts.confirmText ?? "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </OverlayContext.Provider>
  );
}

export function useOverlay(): OverlayApi {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
}
