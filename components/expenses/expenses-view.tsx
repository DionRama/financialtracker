"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { Pencil, Plus, Trash2, Receipt } from "lucide-react";
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

import { ExpenseFormDialog } from "./expense-form-dialog";

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
}

interface ExpensesViewProps {
  expenses: ExpenseRow[];
  categories: Category[];
  currency: string;
  locale: string;
}

export function ExpensesView({
  expenses,
  categories,
  currency,
  locale,
}: ExpensesViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("__all__");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

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
        <div className="ml-auto">
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add expense
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={expenses.length ? "No matches" : "No expenses yet"}
          description={
            expenses.length
              ? "Try a different filter or search term."
              : "Add your first expense to start tracking."
          }
          action={
            expenses.length ? null : (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Add expense
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {filtered.map((e) => {
                const cat = categoryById.get(e.category_id ?? "");
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
                        <span className="truncate font-medium">
                          {cat?.name ?? "Uncategorized"}
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
                        onClick={() => {
                          if (!window.confirm("Delete this expense?")) return;
                          startTransition(async () => {
                            try {
                              await deleteExpense(e.id);
                              toast.success("Expense deleted");
                            } catch (err) {
                              toast.error(
                                err instanceof Error
                                  ? err.message
                                  : "Failed",
                              );
                            }
                          });
                        }}
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
    </>
  );
}
