"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  dismissNotification,
  markRead,
} from "@/lib/actions/notifications";

export function NotificationRowActions({
  id,
  isRead,
}: {
  id: string;
  isRead: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-1">
      {!isRead ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markRead(id);
              router.refresh();
            })
          }
        >
          Mark read
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await dismissNotification(id);
            router.refresh();
          })
        }
      >
        Dismiss
      </Button>
    </div>
  );
}
