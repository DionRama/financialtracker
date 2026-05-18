"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/common/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  archiveGoal,
  contributeToGoal,
  createGoal,
  updateGoal,
} from "@/lib/actions/goals";
import { GoalCard, type GoalCardData } from "@/components/goals/goal-card";
import { EmojiPicker } from "@/components/goals/emoji-picker";
import {
  MoveDialog,
  type MoveTarget,
} from "@/components/goals/move-dialog";

export type GoalRow = GoalCardData;

interface Props {
  goals: GoalRow[];
  currency: string;
  locale: string;
}

export function GoalsView({ goals, currency, locale }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [edit, setEdit] = useState<GoalRow | null>(null);
  const [moveFrom, setMoveFrom] = useState<GoalRow | null>(null);
  const [withdrawFrom, setWithdrawFrom] = useState<GoalRow | null>(null);
  const [pending, startTransition] = useTransition();

  function archive(id: string) {
    startTransition(async () => {
      try {
        await archiveGoal(id);
        toast.success("Goal archived");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const moveTargets: MoveTarget[] = goals.map((g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji,
    saved_cents: g.saved_cents,
    target_cents: g.target_cents,
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No goals yet"
          description="Set a savings target to track progress toward what matters."
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> New goal
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={currency}
              locale={locale}
              onEdit={() => setEdit(g)}
              onMove={() => setMoveFrom(g)}
              onWithdraw={() => setWithdrawFrom(g)}
              onArchive={() => archive(g.id)}
            />
          ))}
        </div>
      )}

      <GoalDialog
        open={newOpen || edit !== null}
        onOpenChange={(o) => {
          if (!o) {
            setNewOpen(false);
            setEdit(null);
          }
        }}
        currency={currency}
        locale={locale}
        initial={edit}
      />
      <MoveDialog
        open={moveFrom !== null}
        onOpenChange={(o) => !o && setMoveFrom(null)}
        from={moveFrom}
        goals={moveTargets}
        currency={currency}
        locale={locale}
      />
      <WithdrawDialog
        goal={withdrawFrom}
        onClose={() => setWithdrawFrom(null)}
        currency={currency}
        locale={locale}
      />
      <span className="sr-only" aria-live="polite">
        {pending ? "Updating goal…" : ""}
      </span>
    </div>
  );
}

interface GoalFormValues {
  name: string;
  target_cents: number;
  deadline: string;
  color: string;
  emoji: string | null;
}

function GoalDialog({
  open,
  onOpenChange,
  currency,
  locale,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currency: string;
  locale: string;
  initial: GoalRow | null;
}) {
  const isEdit = Boolean(initial?.id);
  const [pending, startTransition] = useTransition();
  const form = useForm<GoalFormValues>({
    defaultValues: {
      name: "",
      target_cents: 0,
      deadline: "",
      color: "#16a34a",
      emoji: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: initial?.name ?? "",
      target_cents: initial?.target_cents ?? 0,
      deadline: initial?.deadline ?? "",
      color: initial?.color ?? "#16a34a",
      emoji: initial?.emoji ?? null,
    });
  }, [open, initial, form]);

  function onSubmit(values: GoalFormValues) {
    if (!values.name.trim()) {
      form.setError("name", { message: "Name is required" });
      return;
    }
    if (!values.target_cents || values.target_cents <= 0) {
      form.setError("target_cents", { message: "Set a positive target" });
      return;
    }
    const payload = {
      name: values.name.trim(),
      target_cents: values.target_cents,
      deadline: values.deadline || null,
      color: values.color,
      emoji: values.emoji,
      is_archived: false,
    };
    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateGoal(initial.id, payload);
          toast.success("Goal updated");
        } else {
          await createGoal(payload);
          toast.success("Goal created");
        }
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>
            Set a target amount and optional deadline. Pick an emoji to make it
            yours.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <EmojiPicker
                value={form.watch("emoji")}
                onChange={(e) => form.setValue("emoji", e)}
              />
              <Input
                id="name"
                autoFocus
                className="flex-1"
                {...form.register("name")}
              />
            </div>
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Target</Label>
              <MoneyInput
                value={form.watch("target_cents")}
                onChange={(c) => form.setValue("target_cents", c)}
                currency={currency}
                locale={locale}
              />
              {form.formState.errors.target_cents ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.target_cents.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Deadline (optional)</Label>
              <DatePicker
                value={form.watch("deadline") || undefined}
                onChange={(d) => form.setValue("deadline", d)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              type="color"
              className="h-10 w-20"
              {...form.register("color")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WithdrawDialog({
  goal,
  onClose,
  currency,
  locale,
}: {
  goal: GoalRow | null;
  onClose: () => void;
  currency: string;
  locale: string;
}) {
  const [amount, setAmount] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (goal) setAmount(0);
  }, [goal]);

  function submit() {
    if (!goal) return;
    if (amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    if (amount > goal.saved_cents) {
      toast.error(
        `Only ${new Intl.NumberFormat(locale, { style: "currency", currency }).format(goal.saved_cents / 100)} available`,
      );
      return;
    }
    startTransition(async () => {
      try {
        await contributeToGoal({
          goal_id: goal.id,
          amount_cents: -amount,
          note: "Withdrawal",
        });
        toast.success("Withdrawal saved");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <Dialog open={goal !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw from {goal?.name ?? "goal"}</DialogTitle>
          <DialogDescription>
            Decrease the saved balance for this goal. Money is returned to your
            available balance.
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
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            Withdraw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
