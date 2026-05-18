"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/common/empty-state";
import { formatCurrency, todayIsoDate } from "@/lib/format";
import {
  createRecurring,
  deleteRecurring,
  runRecurringNow,
  togglePauseRecurring,
  updateRecurring,
} from "@/lib/actions/recurring";

export interface RecurringRow {
  id: string;
  kind: "expense" | "income";
  category_id: string | null;
  source_id: string | null;
  amount_cents: number;
  currency: string;
  description: string | null;
  cadence: "weekly" | "biweekly" | "monthly" | "yearly";
  interval_count: number;
  day_of_month: number | null;
  weekday: number | null;
  start_date: string;
  end_date: string | null;
  next_run_date: string;
  is_paused: boolean;
  is_subscription: boolean;
  vendor: string | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
}
interface Source {
  id: string;
  name: string;
}

interface Props {
  rules: RecurringRow[];
  categories: Category[];
  sources: Source[];
  currency: string;
  locale: string;
}

function monthlyEquivalent(r: RecurringRow): number {
  const n = r.interval_count || 1;
  switch (r.cadence) {
    case "weekly":
      return Math.round((r.amount_cents * 52) / (12 * n));
    case "biweekly":
      return Math.round((r.amount_cents * 26) / (12 * n));
    case "monthly":
      return Math.round(r.amount_cents / n);
    case "yearly":
      return Math.round(r.amount_cents / (12 * n));
  }
}

export function RecurringView({
  rules,
  categories,
  sources,
  currency,
  locale,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edit, setEdit] = useState<RecurringRow | null>(null);
  const [pending, startTransition] = useTransition();

  const subs = rules.filter((r) => r.is_subscription);
  const others = rules.filter((r) => !r.is_subscription);

  function openNew() {
    setEdit(null);
    setDialogOpen(true);
  }

  function runNow() {
    startTransition(async () => {
      try {
        const n = await runRecurringNow();
        toast.success(n ? `Generated ${n} transactions` : "Nothing due");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={runNow} disabled={pending}>
          <RefreshCw className="mr-1 h-4 w-4" /> Run now
        </Button>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> New recurring
        </Button>
      </div>

      <Tabs defaultValue="subscriptions">
        <TabsList>
          <TabsTrigger value="subscriptions">
            Subscriptions ({subs.length})
          </TabsTrigger>
          <TabsTrigger value="bills">
            Bills &amp; income ({others.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="subscriptions" className="mt-4">
          <RuleList
            rules={subs}
            currency={currency}
            locale={locale}
            onNew={openNew}
            emptyTitle="No subscriptions tracked"
            emptyDescription="Track subscriptions and recurring bills to see what you spend each month."
            onEdit={(r) => {
              setEdit(r);
              setDialogOpen(true);
            }}
          />
        </TabsContent>
        <TabsContent value="bills" className="mt-4">
          <RuleList
            rules={others}
            currency={currency}
            locale={locale}
            onNew={openNew}
            emptyTitle="Nothing scheduled"
            emptyDescription="Add recurring bills or expected income to automate entries."
            onEdit={(r) => {
              setEdit(r);
              setDialogOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <RecurringDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        sources={sources}
        currency={currency}
        locale={locale}
        initial={edit}
      />
    </div>
  );
}

function RuleList({
  rules,
  currency,
  locale,
  onEdit,
  onNew,
  emptyTitle,
  emptyDescription,
}: {
  rules: RecurringRow[];
  currency: string;
  locale: string;
  onEdit: (r: RecurringRow) => void;
  onNew: () => void;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [pending, startTransition] = useTransition();

  function toggle(id: string, paused: boolean) {
    startTransition(async () => {
      try {
        await togglePauseRecurring(id, paused);
        toast.success(paused ? "Paused" : "Resumed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }
  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteRecurring(id);
        toast.success("Deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  if (rules.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button onClick={onNew}>
            <Plus className="mr-1 h-4 w-4" /> New recurring
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rules.map((r) => (
        <Card key={r.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {r.vendor || r.description || "Recurring"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.kind === "income" ? "Income" : "Expense"} ·{" "}
                  {r.interval_count > 1
                    ? `every ${r.interval_count} `
                    : "every "}
                  {r.cadence}
                </p>
              </div>
              <Badge variant={r.is_paused ? "secondary" : "default"}>
                {r.is_paused ? "paused" : "active"}
              </Badge>
            </div>
            <div className="flex items-baseline justify-between font-tabular">
              <span className="text-lg font-semibold">
                {formatCurrency(r.amount_cents, currency, locale)}
              </span>
              <span className="text-xs text-muted-foreground">
                ≈ {formatCurrency(monthlyEquivalent(r), currency, locale)}/mo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Next:{" "}
              {new Date(r.next_run_date).toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <div className="flex justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => toggle(r.id, !r.is_paused)}
              >
                {r.is_paused ? (
                  <>
                    <Play className="mr-1 h-4 w-4" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="mr-1 h-4 w-4" /> Pause
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit"
                onClick={() => onEdit(r)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Delete"
                disabled={pending}
                onClick={() => remove(r.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface RecForm {
  kind: "expense" | "income";
  category_id: string;
  source_id: string;
  amount_cents: number;
  description: string;
  cadence: RecurringRow["cadence"];
  interval_count: number;
  day_of_month: string;
  weekday: string;
  start_date: string;
  next_run_date: string;
  is_paused: boolean;
  is_subscription: boolean;
  vendor: string;
}

function RecurringDialog({
  open,
  onOpenChange,
  categories,
  sources,
  currency,
  locale,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: Category[];
  sources: Source[];
  currency: string;
  locale: string;
  initial: RecurringRow | null;
}) {
  const isEdit = Boolean(initial?.id);
  const [pending, startTransition] = useTransition();
  const today = todayIsoDate();

  const form = useForm<RecForm>({
    defaultValues: makeDefaults(initial, today),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(makeDefaults(initial, today));
  }, [open, initial, form, today]);

  function onSubmit(v: RecForm) {
    if (!v.amount_cents || v.amount_cents <= 0) {
      form.setError("amount_cents", { message: "Enter an amount" });
      return;
    }
    const payload = {
      kind: v.kind,
      category_id: v.kind === "expense" ? v.category_id || null : null,
      source_id: v.kind === "income" ? v.source_id || null : null,
      amount_cents: v.amount_cents,
      currency,
      description: v.description || null,
      cadence: v.cadence,
      interval_count: Number(v.interval_count) || 1,
      day_of_month: v.day_of_month ? Number(v.day_of_month) : null,
      weekday: v.weekday !== "" ? Number(v.weekday) : null,
      start_date: v.start_date,
      end_date: null,
      next_run_date: v.next_run_date || v.start_date,
      is_paused: v.is_paused,
      is_subscription: v.is_subscription,
      vendor: v.vendor || null,
    };
    startTransition(async () => {
      try {
        if (isEdit && initial?.id) {
          await updateRecurring(initial.id, payload);
          toast.success("Updated");
        } else {
          await createRecurring(payload);
          toast.success("Created");
        }
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  const kind = form.watch("kind");
  const cadence = form.watch("cadence");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit rule" : "New recurring"}</DialogTitle>
          <DialogDescription>
            Schedule expenses, subscriptions, or income to auto-generate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Kind</Label>
              <Select
                value={kind}
                onValueChange={(v) =>
                  form.setValue("kind", v as "expense" | "income")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <MoneyInput
                value={form.watch("amount_cents")}
                onChange={(c) => form.setValue("amount_cents", c)}
                currency={currency}
                locale={locale}
              />
              {form.formState.errors.amount_cents ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.amount_cents.message}
                </p>
              ) : null}
            </div>
          </div>

          {kind === "expense" ? (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.watch("category_id") || "__none__"}
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
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={form.watch("source_id") || "__none__"}
                onValueChange={(v) =>
                  form.setValue("source_id", v === "__none__" ? "" : v)
                }
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
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cadence</Label>
              <Select
                value={cadence}
                onValueChange={(v) =>
                  form.setValue("cadence", v as RecurringRow["cadence"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Every (interval)</Label>
              <Input
                type="number"
                min={1}
                max={24}
                {...form.register("interval_count")}
              />
            </div>
          </div>

          {(cadence === "monthly" || cadence === "yearly") ? (
            <div className="space-y-2">
              <Label htmlFor="dom">Day of month (optional)</Label>
              <Input
                id="dom"
                type="number"
                min={1}
                max={31}
                {...form.register("day_of_month")}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Weekday (0=Sun … 6=Sat, optional)</Label>
              <Input
                type="number"
                min={0}
                max={6}
                {...form.register("weekday")}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePicker
                value={form.watch("start_date")}
                onChange={(d) => {
                  form.setValue("start_date", d);
                  if (!form.getValues("next_run_date") || !isEdit) {
                    form.setValue("next_run_date", d);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Next run</Label>
              <DatePicker
                value={form.watch("next_run_date")}
                onChange={(d) => form.setValue("next_run_date", d)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" {...form.register("vendor")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input id="desc" {...form.register("description")} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              {...form.register("is_subscription")}
              className="h-4 w-4"
            />
            This is a subscription
          </label>

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

function makeDefaults(initial: RecurringRow | null, today: string): RecForm {
  return {
    kind: initial?.kind ?? "expense",
    category_id: initial?.category_id ?? "",
    source_id: initial?.source_id ?? "",
    amount_cents: initial?.amount_cents ?? 0,
    description: initial?.description ?? "",
    cadence: initial?.cadence ?? "monthly",
    interval_count: initial?.interval_count ?? 1,
    day_of_month: initial?.day_of_month ? String(initial.day_of_month) : "",
    weekday: initial?.weekday !== null && initial?.weekday !== undefined
      ? String(initial.weekday)
      : "",
    start_date: initial?.start_date ?? today,
    next_run_date: initial?.next_run_date ?? today,
    is_paused: initial?.is_paused ?? false,
    is_subscription: initial?.is_subscription ?? false,
    vendor: initial?.vendor ?? "",
  };
}
