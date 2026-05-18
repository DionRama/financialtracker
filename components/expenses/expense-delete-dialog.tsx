"use client";

import * as React from "react";
import { CalendarClock, Pause, Pencil, SkipForward, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RecurringMeta {
  id: string;
  kind: "expense" | "income";
  is_subscription: boolean;
  vendor: string | null;
  description: string | null;
  cadence: string;
  day_of_month: number | null;
  amount_cents: number;
  currency: string;
  is_paused: boolean;
}

export type DeleteAction =
  | { type: "plain" }
  | { type: "delete-both" }
  | { type: "skip-month" }
  | { type: "edit-subscription" }
  | { type: "pause-subscription" }
  | { type: "cancel-subscription" };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rule: RecurringMeta | null;
  pending?: boolean;
  onAction: (action: DeleteAction) => void;
}

export function ExpenseDeleteDialog({
  open,
  onOpenChange,
  rule,
  pending = false,
  onAction,
}: Props) {
  const label = rule?.vendor || rule?.description || "this rule";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!rule ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete this expense?</DialogTitle>
              <DialogDescription>
                This expense will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => onAction({ type: "plain" })}
              >
                Delete
              </Button>
            </div>
          </>
        ) : !rule.is_subscription ? (
          <>
            <DialogHeader>
              <DialogTitle>Delete this recurring entry?</DialogTitle>
              <DialogDescription>
                This expense came from the recurring rule{" "}
                <span className="font-medium">&ldquo;{label}&rdquo;</span>.
                Deleting it will also stop the recurring rule from creating
                future entries.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                onClick={() => onAction({ type: "delete-both" })}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete entry & rule
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                <span className="font-medium">&ldquo;{label}&rdquo;</span> is a
                subscription
              </DialogTitle>
              <DialogDescription>
                What would you like to do with this month&rsquo;s charge?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="default"
                disabled={pending}
                className="justify-start"
                onClick={() => onAction({ type: "skip-month" })}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Skip this month&rsquo;s charge
                <span className="ml-auto text-xs opacity-70">Recommended</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="justify-start"
                onClick={() => onAction({ type: "edit-subscription" })}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit subscription
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending || rule.is_paused}
                className="justify-start"
                onClick={() => onAction({ type: "pause-subscription" })}
              >
                <Pause className="mr-2 h-4 w-4" />
                {rule.is_paused
                  ? "Subscription already paused"
                  : "Pause subscription"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                className="justify-start"
                onClick={() => onAction({ type: "cancel-subscription" })}
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                Cancel subscription entirely
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Keep everything
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
