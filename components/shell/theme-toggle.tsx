"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className }: { className?: string } = {}) {
  const { resolvedTheme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={toggle}
      suppressHydrationWarning
      className={className}
    >
      {isDark ? (
        <Sun className="h-4 w-4" suppressHydrationWarning />
      ) : (
        <Moon className="h-4 w-4" suppressHydrationWarning />
      )}
    </Button>
  );
}
