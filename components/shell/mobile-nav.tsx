"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { NAV } from "./sidebar";

const MOBILE_HREFS = [
  "/dashboard",
  "/expenses",
  "/income",
  "/budgets",
  "/goals",
] as const;
const MOBILE_NAV = MOBILE_HREFS.map((h) => NAV.find((n) => n.href === h)).filter(
  (n): n is (typeof NAV)[number] => Boolean(n),
);

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-30 flex h-16 items-center justify-around border-t bg-card/95 px-2 backdrop-blur md:hidden"
    >
      {MOBILE_NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-xs transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <item.icon className={cn("h-5 w-5", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
