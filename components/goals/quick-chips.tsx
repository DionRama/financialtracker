"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MoneyInput } from "@/components/ui/money-input";
import { Label } from "@/components/ui/label";
import { contributeToGoal, deleteContribution } from "@/lib/actions/goals";

const PRESET_CENTS = [1000, 2500, 5000, 10000];

interface Props {
  goalId: string;
  goalName: string;
  currency: string;
  locale: string;
  color?: string;
  onOptimisticAdd?: (cents: number) => void;
  onOptimisticRevert?: (cents: number) => void;
}

function formatChip(cents: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `+${cents / 100}`;
  }
}

export function QuickChips({
  goalId,
  goalName,
  currency,
  locale,
  color,
  onOptimisticAdd,
  onOptimisticRevert,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState(0);

  function contribute(cents: number) {
    onOptimisticAdd?.(cents);
    startTransition(async () => {
      try {
        const res = await contributeToGoal({
          goal_id: goalId,
          amount_cents: cents,
        });
        toast.success(
          `Added ${formatChip(cents, currency, locale)} to ${goalName}`,
          {
            action: res.contribution_id
              ? {
                  label: "Undo",
                  onClick: () => {
                    onOptimisticRevert?.(cents);
                    deleteContribution(res.contribution_id).catch((e: unknown) =>
                      toast.error(
                        e instanceof Error ? e.message : "Undo failed",
                      ),
                    );
                  },
                }
              : undefined,
            duration: 5000,
          },
        );
      } catch (e) {
        onOptimisticRevert?.(cents);
        toast.error(e instanceof Error ? e.message : "Failed to contribute");
      }
    });
  }

  function submitCustom() {
    if (customAmount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    contribute(customAmount);
    setCustomAmount(0);
    setCustomOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESET_CENTS.map((c) => (
        <Button
          key={c}
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => contribute(c)}
          className="h-8 px-2.5 text-xs font-medium"
          style={color ? { borderColor: `${color}55` } : undefined}
        >
          +{formatChip(c, currency, locale)}
        </Button>
      ))}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="h-8 px-2.5 text-xs"
          >
            Custom…
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`custom-${goalId}`}>Amount</Label>
            <MoneyInput
              id={`custom-${goalId}`}
              value={customAmount}
              onChange={setCustomAmount}
              currency={currency}
              locale={locale}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCustomOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submitCustom}>
              Add
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
