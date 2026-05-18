import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";
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
  const [{ data: recent }, { count: unread }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, severity, is_read, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false),
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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <Suspense fallback={null}>
          <MonthSwitcher />
        </Suspense>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell
          initialUnread={unread ?? 0}
          initialRecent={items}
        />
        <ThemeToggle />
        <UserMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
