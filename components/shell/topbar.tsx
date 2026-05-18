import { Suspense } from "react";

import { MonthSwitcher } from "./month-switcher";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  email: string;
  fullName?: string | null;
}

export function Topbar({ email, fullName }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Suspense fallback={null}>
          <MonthSwitcher />
        </Suspense>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
