"use client";

import {
  BarChart3,
  LayoutDashboard,
  PiggyBank,
  Receipt,
  Settings,
  Sparkles,
  Tags,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 self-start border-r bg-card md:flex md:flex-col">
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-2 border-b px-5 font-semibold"
      >
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Wallet className="h-4 w-4" />
        </div>
        Financial Tracker
      </Link>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-lg border bg-linear-to-br from-primary/15 to-transparent p-4 text-xs">
        <div className="mb-1 flex items-center gap-1.5 font-medium">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Pro tip
        </div>
        <p className="text-muted-foreground">
          Set a budget per category to spot overspending before month-end.
        </p>
      </div>
    </aside>
  );
}
