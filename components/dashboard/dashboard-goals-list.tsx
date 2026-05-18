"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { MoneyInput } from "@/components/ui/money-input";
import { formatCurrency, percent } from "@/lib/format";
import { contributeToGoal } from "@/lib/actions/goals";

export interface DashboardGoal {
  id: string;
  name: string;
  color: string;
  saved_cents: number;
  target_cents: number;
}

export function DashboardGoalsList({
  goals,
  currency,
  locale,
}: {
  goals: DashboardGoal[];
  currency: string;
  locale: string;
}) {
  const [open, setOpen] = useState<DashboardGoal | null>(null);
  const [amount, setAmount] = useState(0);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!open) return;
    if (!amount || amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    startTransition(async () => {
      try {
        await contributeToGoal({ goal_id: open.id, amount_cents: amount });
        toast.success("Saved");
        setOpen(null);
        setAmount(0);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <>
      <ul className="divide-y">
        {goals.map((g) => {
          const pct = percent(g.saved_cents, g.target_cents);
          return (
            <li
              key={g.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className="h-8 w-8 shrink-0 rounded-md"
                style={{ backgroundColor: g.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(g.saved_cents, currency, locale)} /{" "}
                  {formatCurrency(g.target_cents, currency, locale)}
                </p>
                <Progress value={pct} className="mt-1 h-1.5" />
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Contribute"
                onClick={() => {
                  setOpen(g);
                  setAmount(0);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribute to {open?.name}</DialogTitle>
            <DialogDescription>
              Adds to the saved balance for this goal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Amount</Label>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              currency={currency}
              locale={locale}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
