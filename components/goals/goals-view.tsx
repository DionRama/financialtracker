"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { formatCurrency, percent } from "@/lib/format";
import {
  archiveGoal,
  contributeToGoal,
  createGoal,
  updateGoal,
} from "@/lib/actions/goals";

export interface GoalRow {
  id: string;
  name: string;
  target_cents: number;
  saved_cents: number;
  deadline: string | null;
  color: string;
}

interface Props {
  goals: GoalRow[];
  currency: string;
  locale: string;
}

export function GoalsView({ goals, currency, locale }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [edit, setEdit] = useState<GoalRow | null>(null);
  const [contribute, setContribute] = useState<GoalRow | null>(null);
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
          {goals.map((g) => {
            const pct = percent(g.saved_cents, g.target_cents);
            return (
              <Card key={g.id}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-9 w-9 shrink-0 rounded-lg"
                      style={{ backgroundColor: g.color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(g.saved_cents, currency, locale)} /{" "}
                        {formatCurrency(g.target_cents, currency, locale)}
                        {g.deadline ? ` · by ${g.deadline}` : ""}
                      </p>
                    </div>
                  </div>
                  <Progress value={pct} />
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setContribute(g)}
                    >
                      <Plus className="mr-1 h-4 w-4" /> Contribute
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => setEdit(g)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Archive"
                      disabled={pending}
                      onClick={() => archive(g.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
      <ContributeDialog
        goal={contribute}
        onClose={() => setContribute(null)}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}

interface GoalFormValues {
  name: string;
  target_cents: number;
  deadline: string;
  color: string;
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
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: initial?.name ?? "",
      target_cents: initial?.target_cents ?? 0,
      deadline: initial?.deadline ?? "",
      color: initial?.color ?? "#16a34a",
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
            Set a target amount and optional deadline.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoFocus {...form.register("name")} />
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

function ContributeDialog({
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

  function save() {
    if (!goal) return;
    if (!amount || amount <= 0) {
      toast.error("Enter a positive amount");
      return;
    }
    startTransition(async () => {
      try {
        await contributeToGoal({ goal_id: goal.id, amount_cents: amount });
        toast.success("Contribution saved");
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
          <DialogTitle>
            Contribute to {goal?.name ?? "goal"}
          </DialogTitle>
          <DialogDescription>
            Updates the saved balance for this goal.
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
          <Button onClick={save} disabled={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
