"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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
import { MoneyInput } from "@/components/ui/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import { todayIsoDate } from "@/lib/format";
import {
  addIncomeEntry,
  addIncomeSource,
  updateIncomeEntry,
  updateIncomeSource,
} from "@/lib/actions/income";
import { formatPeriodLabel, nextPeriod, periodOf } from "@/lib/period";

export interface IncomeEntryValue {
  id?: string;
  source_id: string | null;
  amount_cents: number;
  received_at: string;
  applies_to_month?: string;
  note: string | null;
}

interface Source {
  id: string;
  name: string;
  default_amount_cents: number;
}

interface EntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: Source[];
  currency: string;
  locale: string;
  /** User's pay-cycle start day (1-28). Defaults to 1 = calendar month. */
  periodStartDay?: number;
  initial?: IncomeEntryValue | null;
}

interface EntryFormValues {
  amount_cents: number;
  source_id: string;
  received_at: string;
  applies_to_month: string;
  note: string;
}

export function IncomeEntryDialog({
  open,
  onOpenChange,
  sources,
  currency,
  locale,
  periodStartDay = 1,
  initial,
}: EntryProps) {
  const isEdit = Boolean(initial?.id);
  const [pending, startTransition] = useTransition();

  const form = useForm<EntryFormValues>({
    defaultValues: {
      amount_cents: initial?.amount_cents ?? 0,
      source_id: initial?.source_id ?? "",
      received_at: initial?.received_at ?? todayIsoDate(),
      applies_to_month:
        initial?.applies_to_month ??
        periodOf(initial?.received_at ?? todayIsoDate(), periodStartDay),
      note: initial?.note ?? "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      amount_cents: initial?.amount_cents ?? 0,
      source_id: initial?.source_id ?? "",
      received_at: initial?.received_at ?? todayIsoDate(),
      applies_to_month:
        initial?.applies_to_month ??
        periodOf(initial?.received_at ?? todayIsoDate(), periodStartDay),
      note: initial?.note ?? "",
    });
  }, [open, initial, form, periodStartDay]);

  function onSubmit(values: EntryFormValues) {
    if (!values.amount_cents || values.amount_cents <= 0) {
      form.setError("amount_cents", { message: "Enter an amount" });
      return;
    }
    const payload = {
      source_id: values.source_id || null,
      amount_cents: values.amount_cents,
      received_at: values.received_at,
      applies_to_month:
        values.applies_to_month || periodOf(values.received_at, periodStartDay),
      note: values.note || null,
    };
    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateIncomeEntry(initial.id, payload);
          toast.success("Income updated");
        } else {
          await addIncomeEntry(payload);
          toast.success("Income added");
        }
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const sourceId = form.watch("source_id");
  const amount = form.watch("amount_cents");
  const receivedAt = form.watch("received_at");
  const appliesToMonth = form.watch("applies_to_month");
  const samePeriodKey = periodOf(receivedAt, periodStartDay);
  const nextPeriodKey = nextPeriod(samePeriodKey);
  const sameMonth = samePeriodKey === appliesToMonth;
  const nextMonth = nextPeriodKey === appliesToMonth;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit income" : "Add income"}</DialogTitle>
          <DialogDescription>Money received this period.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <MoneyInput
                id="amount"
                value={amount}
                onChange={(c) => form.setValue("amount_cents", c)}
                currency={currency}
                locale={locale}
                autoFocus
              />
              {form.formState.errors.amount_cents ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount_cents.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Date received</Label>
              <DatePicker
                value={form.watch("received_at")}
                onChange={(d) => form.setValue("received_at", d)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={sourceId || "__none__"}
              onValueChange={(v) => {
                const id = v === "__none__" ? "" : v;
                form.setValue("source_id", id);
                if (id && !amount) {
                  const s = sources.find((x) => x.id === id);
                  if (s) form.setValue("amount_cents", s.default_amount_cents);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="No source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No source</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Counts toward period</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={sameMonth ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  form.setValue("applies_to_month", samePeriodKey, {
                    shouldDirty: true,
                  })
                }
              >
                This period
              </Button>
              <Button
                type="button"
                variant={nextMonth ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  form.setValue("applies_to_month", nextPeriodKey, {
                    shouldDirty: true,
                  })
                }
              >
                Next period
              </Button>
              <span className="text-xs text-muted-foreground">
                {formatPeriodLabel(appliesToMonth, periodStartDay, locale)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {periodStartDay === 1
                ? "Used for monthly totals (e.g. salary paid on the 26th that covers next month). Receive date stays accurate."
                : "Used for period totals. Your pay-cycle setting already picks the right period automatically — only change this for one-off exceptions."}
            </p>
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

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {isEdit ? "Save" : "Add income"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Source dialog
// ---------------------------------------------------------------------------
export interface IncomeSourceValue {
  id?: string;
  name: string;
  kind: "salary" | "freelance" | "investment" | "other";
  default_amount_cents: number;
  currency: string;
  is_active: boolean;
}

interface SourceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  locale: string;
  initial?: IncomeSourceValue | null;
}

interface SourceFormValues {
  name: string;
  kind: IncomeSourceValue["kind"];
  default_amount_cents: number;
  currency: string;
  is_active: boolean;
}

export function IncomeSourceDialog({
  open,
  onOpenChange,
  currency,
  locale,
  initial,
}: SourceProps) {
  const isEdit = Boolean(initial?.id);
  const [pending, startTransition] = useTransition();
  const form = useForm<SourceFormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      kind: initial?.kind ?? "salary",
      default_amount_cents: initial?.default_amount_cents ?? 0,
      currency: initial?.currency ?? currency,
      is_active: initial?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: initial?.name ?? "",
      kind: initial?.kind ?? "salary",
      default_amount_cents: initial?.default_amount_cents ?? 0,
      currency: initial?.currency ?? currency,
      is_active: initial?.is_active ?? true,
    });
  }, [open, initial, form, currency]);

  function onSubmit(values: SourceFormValues) {
    const payload = {
      name: values.name.trim(),
      kind: values.kind,
      default_amount_cents: values.default_amount_cents || 0,
      currency: values.currency || currency,
      is_active: values.is_active,
    };
    if (!payload.name) {
      form.setError("name", { message: "Name is required" });
      return;
    }
    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateIncomeSource(initial.id, payload);
          toast.success("Source updated");
        } else {
          await addIncomeSource(payload);
          toast.success("Source added");
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
          <DialogTitle>{isEdit ? "Edit source" : "Add source"}</DialogTitle>
          <DialogDescription>
            Salary, retainer, dividend account — anything that pays you.
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
              <Label>Kind</Label>
              <Select
                value={form.watch("kind")}
                onValueChange={(v) =>
                  form.setValue("kind", v as SourceFormValues["kind"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="investment">Investment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default amount</Label>
              <MoneyInput
                value={form.watch("default_amount_cents")}
                onChange={(c) => form.setValue("default_amount_cents", c)}
                currency={currency}
                locale={locale}
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
            <Button type="submit" disabled={pending}>
              {isEdit ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
