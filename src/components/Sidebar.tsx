"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CalendarRange,
  Gauge,
  History,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Scale,
  Search,
  Sparkles,
  Target,
  Users,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/auth-actions";
import { SearchDialog } from "./SearchDialog";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/", label: "My work", icon: LayoutDashboard },
      { href: "/capture", label: "Capture", icon: Sparkles },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/calendar", label: "Planner", icon: CalendarRange },
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/team", label: "Team", icon: Users },
    ],
  },
  {
    title: "Atlas",
    items: [
      { href: "/domains", label: "Life Balance", icon: Scale },
      { href: "/review", label: "Review", icon: History },
      { href: "/settings", label: "Capacity", icon: Gauge },
    ],
  },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "U";
}

export function Sidebar({
  user,
  members,
  options,
}: {
  user: { name: string; email: string };
  members: { id: string; name: string; color: string }[];
  options: { members: { id: string; name: string; color: string }[]; projects: { id: string; title: string }[] };
}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <aside
      data-app-sidebar
      className="atlas-nav sticky top-0 z-30 flex h-screen w-[72px] shrink-0 flex-col px-2.5 py-3 md:w-[244px] md:px-3"
    >
      {/* Workspace header */}
      <div className="mb-3 flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-sm font-bold text-white"
          style={{ background: "linear-gradient(140deg,#2d7ff9,#5b5fda)" }}
        >
          A
        </div>
        <div className="hidden min-w-0 md:block">
          <div className="truncate text-[14px] font-semibold leading-tight text-white">Atlas</div>
          <div className="truncate text-[11px] leading-tight" style={{ color: "var(--nav-faint)" }}>
            {user.name}
          </div>
        </div>
      </div>

      {/* Search */}
      <button onClick={() => setSearchOpen(true)} className="mb-3 hidden items-center gap-2 rounded-lg px-2.5 py-2 text-sm md:flex" style={{ background: "var(--nav-input)", color: "var(--nav-faint)" }}>
        <Search size={15} /> Search… <span className="ml-auto text-[10px] opacity-70">⌘K</span>
      </button>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} options={options} />

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {SECTIONS.map((section, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {section.title && (
              <div className="mb-1 hidden px-2.5 text-[10px] font-semibold uppercase tracking-wider md:block" style={{ color: "var(--nav-faint)" }}>
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="atlas-nav-item flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-sm transition-colors"
                  data-active={active}
                >
                  <Icon size={18} className="shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Members */}
        <div className="hidden flex-col gap-1.5 md:flex">
          <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--nav-faint)" }}>
            Team
          </div>
          <div className="flex flex-wrap items-center gap-1.5 px-1.5">
            {members.slice(0, 8).map((m) => (
              <span
                key={m.id}
                title={m.name}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2"
                style={{ background: m.color, ["--tw-ring-color" as string]: "var(--nav-bg)" }}
              >
                {initials(m.name)}
              </span>
            ))}
            <Link href="/team" className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed text-xs" style={{ color: "var(--nav-faint)", borderColor: "var(--nav-border)" }}>
              <Plus size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: "var(--nav-border)" }}>
        <ThemeToggle />
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: "#2d7ff9" }}>
            {initials(user.name)}
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
            <div className="truncate text-xs font-medium text-white">{user.name}</div>
            <div className="truncate text-[11px]" style={{ color: "var(--nav-faint)" }}>{user.email}</div>
          </div>
          <form action={logout} className="hidden md:block">
            <button type="submit" title="Sign out" className="atlas-nav-item flex h-7 w-7 items-center justify-center rounded-md">
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
