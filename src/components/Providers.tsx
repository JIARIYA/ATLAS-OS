"use client";

import { OverlayProvider } from "./ui/overlay";
import { ToastProvider } from "./ui/toast";
import { TimerProvider } from "@/context/TimerContext";
import { SidebarProvider } from "@/context/SidebarContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <OverlayProvider>
        <SidebarProvider>
          <TimerProvider>{children}</TimerProvider>
        </SidebarProvider>
      </OverlayProvider>
    </ToastProvider>
  );
}
