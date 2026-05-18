"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  Target,
  Repeat,
  Tags,
  BarChart3,
  Settings,
  Plus,
  SunMoon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "Navigate" | "Actions" | "Theme";
  perform: () => void;
  keywords?: string[];
};

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();
  const { toggle } = useTheme();

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const run = React.useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  const items: CommandItem[] = React.useMemo(
    () => [
      { id: "nav-dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Navigate", perform: () => router.push("/dashboard") },
      { id: "nav-expenses", label: "Expenses", icon: Receipt, group: "Navigate", perform: () => router.push("/expenses") },
      { id: "nav-income", label: "Income", icon: Wallet, group: "Navigate", perform: () => router.push("/income") },
      { id: "nav-budgets", label: "Budgets", icon: PiggyBank, group: "Navigate", perform: () => router.push("/budgets") },
      { id: "nav-goals", label: "Goals", icon: Target, group: "Navigate", perform: () => router.push("/goals") },
      { id: "nav-recurring", label: "Recurring", icon: Repeat, group: "Navigate", perform: () => router.push("/recurring") },
      { id: "nav-categories", label: "Categories", icon: Tags, group: "Navigate", perform: () => router.push("/categories") },
      { id: "nav-analytics", label: "Analytics", icon: BarChart3, group: "Navigate", perform: () => router.push("/analytics") },
      { id: "nav-settings", label: "Settings", icon: Settings, group: "Navigate", perform: () => router.push("/settings") },
      { id: "act-add-expense", label: "Add expense", icon: Plus, group: "Actions", perform: () => router.push("/expenses?new=1") },
      { id: "act-add-income", label: "Add income", icon: Plus, group: "Actions", perform: () => router.push("/income?new=1") },
      { id: "act-new-budget", label: "New budget", icon: Plus, group: "Actions", perform: () => router.push("/budgets?new=1") },
      { id: "theme-toggle", label: "Toggle theme", icon: SunMoon, group: "Theme", perform: () => toggle() },
    ],
    [router, toggle],
  );

  const grouped = React.useMemo(() => {
    const m = new Map<CommandItem["group"], CommandItem[]>();
    for (const it of items) {
      const arr = m.get(it.group) ?? [];
      arr.push(it);
      m.set(it.group, arr);
    }
    return m;
  }, [items]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <Command
        label="Command palette"
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-lg border bg-background shadow-2xl",
        )}
      >
        <div className="border-b px-3">
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search…"
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          {Array.from(grouped.entries()).map(([group, list]) => (
            <Command.Group
              key={group}
              heading={group}
              className="px-1 pb-2 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {list.map((it) => {
                const Icon = it.icon;
                return (
                  <Command.Item
                    key={it.id}
                    value={`${it.group} ${it.label}`}
                    onSelect={() => run(it.perform)}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{it.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>,
    document.body,
  );
}
