"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Info,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  dismissNotification,
  markAllRead,
  markRead,
} from "@/lib/actions/notifications";

export interface NotificationItem {
  id: string;
  kind: string;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  created_at: string;
  payload: {
    title?: string;
    body?: string;
    actionHref?: string;
    [k: string]: unknown;
  };
}

interface Props {
  initialUnread: number;
  initialRecent: NotificationItem[];
}

const ICONS = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
} as const;

const TONE = {
  critical: "text-destructive",
  warning: "text-amber-500",
  info: "text-muted-foreground",
} as const;

export function NotificationsBell({ initialUnread, initialRecent }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      await dismissNotification(id);
      router.refresh();
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllRead();
      router.refresh();
    });
  };

  const handleRowClick = (n: NotificationItem) => {
    if (n.is_read) return;
    startTransition(async () => {
      await markRead(n.id);
      router.refresh();
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {initialUnread > 0 ? (
            <span
              className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
              aria-label={`${initialUnread} unread`}
            >
              {initialUnread > 9 ? "9+" : initialUnread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleMarkAll}
            disabled={initialUnread === 0}
          >
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {initialRecent.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y">
              {initialRecent.slice(0, 10).map((n) => {
                const Icon = ICONS[n.severity];
                const tone = TONE[n.severity];
                const title = n.payload.title ?? n.kind;
                const body = n.payload.body ?? "";
                const href = n.payload.actionHref;
                const inner = (
                  <div className="flex items-start gap-2 px-3 py-2">
                    <Icon
                      className={cn("mt-0.5 h-4 w-4 shrink-0", tone)}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-xs font-medium",
                          !n.is_read && "text-foreground",
                          n.is_read && "text-muted-foreground",
                        )}
                      >
                        {title}
                      </p>
                      {body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {body}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDismiss(n.id);
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Dismiss"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "transition-colors hover:bg-secondary/60",
                      !n.is_read && "bg-secondary/30",
                    )}
                  >
                    {href ? (
                      <Link
                        href={href}
                        onClick={() => {
                          handleRowClick(n);
                          setOpen(false);
                        }}
                        className="block"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRowClick(n)}
                        className="block w-full text-left"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border-t px-3 py-2">
          <Link
            href="/insights"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all insights
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
