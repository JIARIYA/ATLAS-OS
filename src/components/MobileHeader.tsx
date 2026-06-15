"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export function MobileHeader() {
  const { toggle } = useSidebar();
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-surface px-4 py-2.5 md:hidden">
      <button
        onClick={toggle}
        className="rounded-lg p-1.5 hover:bg-surface2"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-ink" />
      </button>
      <span className="text-sm font-semibold text-ink">Atlas</span>
    </div>
  );
}
