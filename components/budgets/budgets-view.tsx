"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
import {
  deleteBudget,
  upsertBudget,
} from "@/lib/actions/budgets";
import { SmartBudgetsActions } from "./smart-budgets-actions";
import {
  formatCurrency,
  parseAmountToCents,
  percent,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
}
export interface BudgetRow {
  id: string;
  category_id: string;
  amount_cents: number;
}
export interface SpentRow {
  category_id: string | null;
  total_cents: number;
}

interface BudgetsViewProps {
  month: string;
  categories: Category[];
  budgets: BudgetRow[];
  spent: SpentRow[];
  currency: string;
  locale: string;
  monthlyIncomeCents: number | null;
}

export function BudgetsView({
  month,
  categories,
  budgets,
  spent,
  currency,
  locale,
  monthlyIncomeCents,
}: BudgetsViewProps) {
  const spentMap = useMemo(
    () =>
      new Map(spent.map((s) => [s.category_id ?? "__none__", s.total_cents])),
    [spent],
  );
  const budgetByCat = useMemo(
    () => new Map(budgets.map((b) => [b.category_id, b])),
    [budgets],
  );

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Plus}
        title="Create categories first"
        description="Budgets are set per category. Add a category to start."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SmartBudgetsActions
        month={month}
        categories={categories}
        monthlyIncomeCents={monthlyIncomeCents}
      />
      {budgets.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No budgets set for this month"
          description="Set a budget for each category to spot overspending before month-end. Use the smart actions above to suggest budgets from your last 3 months of history."
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {categories.map((c) => (
          <BudgetCard
            key={c.id}
            month={month}
            category={c}
            budget={budgetByCat.get(c.id) ?? null}
            spentCents={spentMap.get(c.id) ?? 0}
            currency={currency}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetCard({
  month,
  category,
  budget,
  spentCents,
  currency,
  locale,
}: {
  month: string;
  category: Category;
  budget: BudgetRow | null;
  spentCents: number;
  currency: string;
  locale: string;
}) {
  const [draft, setDraft] = useState<string>(
    budget ? (budget.amount_cents / 100).toFixed(2) : "",
  );
  const [pending, startTransition] = useTransition();
  const limitCents = budget?.amount_cents ?? 0;
  const pct = percent(spentCents, limitCents);
  const over = limitCents > 0 && spentCents > limitCents;

  function save() {
    const cents = parseAmountToCents(draft);
    if (cents === null || cents < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    startTransition(async () => {
      try {
        await upsertBudget({
          category_id: category.id,
          month,
          amount_cents: cents,
        });
        toast.success("Budget saved");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  function remove() {
    if (!budget) return;
    startTransition(async () => {
      try {
        await deleteBudget(budget.id);
        setDraft("");
        toast.success("Budget removed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="h-9 w-9 shrink-0 rounded-lg"
              style={{ backgroundColor: category.color }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground">
                Spent {formatCurrency(spentCents, currency, locale)}
                {limitCents > 0
                  ? ` of ${formatCurrency(limitCents, currency, locale)}`
                  : ""}
              </p>
            </div>
          </div>
          {over ? <Badge variant="destructive">Over</Badge> : null}
        </div>

        {limitCents > 0 ? (
          <Progress
            value={pct}
            indicatorClassName={cn(
              over ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-success",
            )}
          />
        ) : null}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label
              htmlFor={`b-${category.id}`}
              className="text-xs text-muted-foreground"
            >
              Monthly limit
            </Label>
            <Input
              id={`b-${category.id}`}
              inputMode="decimal"
              placeholder="0.00"
              className="font-tabular"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
          <Button onClick={save} disabled={pending}>
            Save
          </Button>
          {budget ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove budget"
              disabled={pending}
              onClick={remove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
