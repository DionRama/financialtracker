"use client";

import { useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { expenseSchema, type ExpenseInput } from "@/lib/validation";
import { parseAmountToCents, todayIsoDate } from "@/lib/format";
import { createExpense, updateExpense } from "@/lib/actions/expenses";

interface Category {
  id: string;
  name: string;
  color: string;
}

export interface ExpenseDialogValue {
  id?: string;
  amount_cents: number;
  category_id: string | null;
  occurred_at: string;
  note: string | null;
  tags: string[];
}

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  initial?: ExpenseDialogValue | null;
}

type FormValues = {
  amountText: string;
  category_id: string;
  occurred_at: string;
  note: string;
  tagsText: string;
};

export function ExpenseFormDialog({
  open,
  onOpenChange,
  categories,
  initial,
}: ExpenseFormDialogProps) {
  const isEdit = Boolean(initial?.id);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    defaultValues: {
      amountText: initial ? (initial.amount_cents / 100).toFixed(2) : "",
      category_id: initial?.category_id ?? "",
      occurred_at: initial?.occurred_at ?? todayIsoDate(),
      note: initial?.note ?? "",
      tagsText: initial?.tags.join(", ") ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      amountText: initial ? (initial.amount_cents / 100).toFixed(2) : "",
      category_id: initial?.category_id ?? "",
      occurred_at: initial?.occurred_at ?? todayIsoDate(),
      note: initial?.note ?? "",
      tagsText: initial?.tags.join(", ") ?? "",
    });
  }, [open, initial, form]);

  function onSubmit(values: FormValues) {
    const cents = parseAmountToCents(values.amountText);
    if (!cents || cents <= 0) {
      form.setError("amountText", { message: "Enter a positive amount." });
      return;
    }
    const payload: ExpenseInput = {
      amount_cents: cents,
      category_id: values.category_id || null,
      occurred_at: values.occurred_at,
      note: values.note || null,
      tags: values.tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 20),
    };
    const parsed = expenseSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateExpense({ id: initial.id, ...parsed.data });
          toast.success("Expense updated");
        } else {
          await createExpense(parsed.data);
          toast.success("Expense added");
        }
        onOpenChange(false);
        form.reset({
          amountText: "",
          category_id: "",
          occurred_at: todayIsoDate(),
          note: "",
          tagsText: "",
        });
      } catch (err) {
        (console.error(err), toast.error("Something went wrong"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Amounts are stored as cents for accuracy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                className="font-tabular"
                {...form.register("amountText", { required: true })}
              />
              {form.formState.errors.amountText ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amountText.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurred_at">Date</Label>
              <Input
                id="occurred_at"
                type="date"
                className="font-tabular"
                {...form.register("occurred_at", { required: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch("category_id") || ""}
              onValueChange={(v) =>
                form.setValue("category_id", v === "__none__" ? "" : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Uncategorized</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              rows={2}
              placeholder="Optional"
              {...form.register("note")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="comma, separated, tags"
              {...form.register("tagsText")}
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
              {isEdit ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
