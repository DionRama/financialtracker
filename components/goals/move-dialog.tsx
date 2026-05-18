"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { moveBetweenGoals } from "@/lib/actions/goals";

export interface MoveTarget {
  id: string;
  name: string;
  emoji: string | null;
  saved_cents: number;
  target_cents: number;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  from: MoveTarget | null;
  goals: MoveTarget[];
  currency: string;
  locale: string;
}

export function MoveDialog({
  open,
  onOpenChange,
  from,
  goals,
  currency,
  locale,
}: Props) {
  const [toId, setToId] = useState<string>("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const others = goals.filter((g) => g.id !== from?.id);

  useEffect(() => {
    if (open) {
      setToId(others[0]?.id ?? "");
      setAmount(0);
      setNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, from?.id]);

  function submit() {
    if (!from || !toId) {
      toast.error("Pick a destination goal");
      return;
    }
    if (amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    if (amount > from.saved_cents) {
      toast.error(
        `Only ${formatCurrency(from.saved_cents, currency, locale)} available`,
      );
      return;
    }
    startTransition(async () => {
      try {
        await moveBetweenGoals({
          from_id: from.id,
          to_id: toId,
          amount_cents: amount,
          note: note.trim() || null,
        });
        const dest = others.find((g) => g.id === toId);
        toast.success(
          `Moved ${formatCurrency(amount, currency, locale)} from ${from.name} to ${dest?.name ?? "goal"}`,
        );
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Move failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move money between goals</DialogTitle>
          <DialogDescription>
            Transfer funds from one goal to another. The source goal&apos;s
            balance decreases and the destination&apos;s increases atomically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>From</Label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {from?.emoji ? <span className="mr-2">{from.emoji}</span> : null}
              <span className="font-medium">{from?.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {from
                  ? formatCurrency(from.saved_cents, currency, locale) +
                    " available"
                  : ""}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">To</Label>
            {others.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You need at least two active goals to move money.
              </p>
            ) : (
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger id="to">
                  <SelectValue placeholder="Pick a destination goal" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.emoji ? `${g.emoji} ` : ""}
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1">
            <Label>Amount</Label>
            <MoneyInput
              value={amount}
              onChange={setAmount}
              currency={currency}
              locale={locale}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for transfer"
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={pending || others.length === 0}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
