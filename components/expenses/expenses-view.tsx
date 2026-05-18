"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Pencil, Plus, Trash2, Receipt, Upload, Repeat } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import { formatCurrency } from "@/lib/format";
import { deleteExpense } from "@/lib/actions/expenses";
import {
  deleteRecurring,
  deleteRecurringExpenseEntry,
  skipRecurringThisMonth,
  togglePauseRecurring,
} from "@/lib/actions/recurring";
import { useRouter } from "next/navigation";

import { ExpenseFormDialog } from "./expense-form-dialog";
import { CsvImport } from "./csv-import";
import {
  ExpenseDeleteDialog,
  type DeleteAction,
  type RecurringMeta,
} from "./expense-delete-dialog";

interface Category {
  id: string;
  name: string;
  color: string;
}

export interface ExpenseRow {
  id: string;
  amount_cents: number;
  occurred_at: string;
  note: string | null;
  tags: string[];
  category_id: string | null;
  recurring_id?: string | null;
}

interface ExpensesViewProps {
  expenses: ExpenseRow[];
  categories: Category[];
  currency: string;
  locale: string;
  recurringById?: Record<string, RecurringMeta>;
}

export function ExpensesView({
  expenses,
  categories,
  currency,
  locale,
  recurringById = {},
}: ExpensesViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (categoryFilter === "__none__" && e.category_id) return false;
      if (
        categoryFilter !== "__all__" &&
        categoryFilter !== "__none__" &&
        e.category_id !== categoryFilter
      ) {
        return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const hay = [
          e.note ?? "",
          ...e.tags,
          categoryById.get(e.category_id ?? "")?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, categoryFilter, search, categoryById]);

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search notes, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            <SelectItem value="__none__">Uncategorized</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={expenses.length === 0 ? "No expenses yet" : "No matches"}
          description="Track your first expense to see trends and breakdowns here."
          action={
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Add expense
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No matches"
          description="Try a different filter or search term."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {filtered.map((e) => {
                const cat = categoryById.get(e.category_id ?? "");
                const rule = e.recurring_id
                  ? recurringById[e.recurring_id]
                  : undefined;
                const ruleLabel =
                  rule?.vendor || rule?.description || "Recurring rule";
                return (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-3 sm:px-6"
                  >
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg"
                      style={{ backgroundColor: cat?.color ?? "#64748b" }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">
                            {cat?.name ?? "Uncategorized"}
                          </span>
                          {rule ? (
                            <Badge
                              variant="outline"
                              className="shrink-0 gap-1 font-normal"
                              title={ruleLabel}
                            >
                              <Repeat className="h-3 w-3" />
                              {rule.is_subscription
                                ? "Subscription"
                                : "Recurring"}
                            </Badge>
                          ) : null}
                        </span>
                        <span className="font-tabular font-semibold">
                          {formatCurrency(e.amount_cents, currency, locale)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(e.occurred_at), "PP")}
                        </span>
                        {e.note ? (
                          <>
                            <span>·</span>
                            <span className="truncate">{e.note}</span>
                          </>
                        ) : null}
                        {e.tags.length ? (
                          <div className="flex flex-wrap gap-1">
                            {e.tags.slice(0, 3).map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className="font-normal"
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(e);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete"
                        disabled={pending}
                        onClick={() => setDeleting(e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <ExpenseFormDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        categories={categories}
        initial={editing}
      />

      <CsvImport open={csvOpen} onOpenChange={setCsvOpen} />

      <ExpenseDeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        rule={
          deleting?.recurring_id
            ? recurringById[deleting.recurring_id] ?? null
            : null
        }
        pending={pending}
        onAction={(action: DeleteAction) => {
          const target = deleting;
          if (!target) return;
          const ruleId = target.recurring_id ?? null;
          startTransition(async () => {
            try {
              switch (action.type) {
                case "plain":
                  await deleteExpense(target.id);
                  toast.success("Expense deleted");
                  break;
                case "delete-both":
                  if (ruleId) await deleteRecurring(ruleId);
                  else await deleteExpense(target.id);
                  toast.success("Entry and recurring rule removed");
                  break;
                case "skip-month":
                  if (!ruleId) {
                    await deleteExpense(target.id);
                  } else {
                    await skipRecurringThisMonth(ruleId, target.id);
                  }
                  toast.success("Skipped this month");
                  break;
                case "pause-subscription":
                  if (ruleId) {
                    await togglePauseRecurring(ruleId, true);
                    await deleteRecurringExpenseEntry(target.id);
                  } else {
                    await deleteExpense(target.id);
                  }
                  toast.success("Subscription paused");
                  break;
                case "cancel-subscription":
                  if (ruleId) await deleteRecurring(ruleId);
                  else await deleteExpense(target.id);
                  toast.success("Subscription cancelled");
                  break;
                case "edit-subscription":
                  if (ruleId) router.push(`/recurring?edit=${ruleId}`);
                  break;
              }
              setDeleting(null);
            } catch (err) {
              (console.error(err), toast.error("Failed"));
            }
          });
        }}
      />
    </>
  );
}
