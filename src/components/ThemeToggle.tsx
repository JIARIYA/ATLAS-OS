"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("atlas-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="atlas-nav-item flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-sm font-medium transition-colors"
      aria-label="Toggle theme"
    >
      {mounted && dark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
      <span className="hidden md:inline">{mounted && dark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
