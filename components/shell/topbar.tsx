import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
import { getPeriodStartDay } from "@/lib/period-server";
import { MonthSwitcher } from "./month-switcher";
import {
  NotificationsBell,
  type NotificationItem,
} from "./notifications-bell";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  email: string;
  fullName?: string | null;
}

export async function Topbar({ email, fullName }: TopbarProps) {
  const supabase = await createClient();
  const [{ data: recent }, { count: unread }, periodStartDay] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, severity, is_read, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
    getPeriodStartDay(),
  ]);

  const items: NotificationItem[] = (recent ?? []).map((n) => ({
    id: n.id,
    kind: n.kind,
    severity: n.severity,
    is_read: n.is_read,
    created_at: n.created_at,
    payload: (n.payload ?? {}) as NotificationItem["payload"],
  }));

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b bg-background/80 px-5 backdrop-blur sm:gap-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Suspense fallback={null}>
          <MonthSwitcher periodStartDay={periodStartDay} />
        </Suspense>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <NotificationsBell
          initialUnread={unread ?? 0}
          initialRecent={items}
        />
        <ThemeToggle className="hidden sm:inline-flex" />
        <UserMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
