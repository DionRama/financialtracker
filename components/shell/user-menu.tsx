"use client";

import { LogOut, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  email: string;
  fullName?: string | null;
}

export function UserMenu({ email, fullName }: UserMenuProps) {
  const initials = (fullName || email)
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-2 px-2"
          aria-label="Account menu"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {initials || "U"}
          </span>
          <span className="hidden max-w-40 truncate text-sm sm:inline">
            {fullName || email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings" className="flex items-center gap-2">
            <User className="h-4 w-4" /> Profile & settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-left"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
