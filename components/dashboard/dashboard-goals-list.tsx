"use client";

import { useState } from "react";

import { Progress } from "@/components/ui/progress";
import { QuickChips } from "@/components/goals/quick-chips";
import { formatCurrency, percent } from "@/lib/format";

export interface DashboardGoal {
  id: string;
  name: string;
  color: string;
  emoji: string | null;
  saved_cents: number;
  target_cents: number;
}

export function DashboardGoalsList({
  goals,
  currency,
  locale,
}: {
  goals: DashboardGoal[];
  currency: string;
  locale: string;
}) {
  return (
    <ul className="divide-y">
      {goals.map((g) => (
        <DashboardGoalRow
          key={g.id}
          goal={g}
          currency={currency}
          locale={locale}
        />
      ))}
    </ul>
  );
}

function DashboardGoalRow({
  goal,
  currency,
  locale,
}: {
  goal: DashboardGoal;
  currency: string;
  locale: string;
}) {
  const [delta, setDelta] = useState(0);
  const saved = Math.max(0, goal.saved_cents + delta);
  const pct = percent(saved, goal.target_cents);

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base"
          style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
          aria-hidden
        >
          {goal.emoji ?? "🎯"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{goal.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(saved, currency, locale)} /{" "}
            {formatCurrency(goal.target_cents, currency, locale)} · {pct}%
          </p>
          <Progress value={pct} className="mt-1 h-1.5" />
        </div>
      </div>
      <div className="pl-11">
        <QuickChips
          goalId={goal.id}
          goalName={goal.name}
          currency={currency}
          locale={locale}
          color={goal.color}
          onOptimisticAdd={(c) => setDelta((d) => d + c)}
          onOptimisticRevert={(c) => setDelta((d) => d - c)}
        />
      </div>
    </li>
  );
}
