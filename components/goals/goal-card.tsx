"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  MinusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickChips } from "@/components/goals/quick-chips";
import { Sparkline } from "@/components/goals/sparkline";
import { formatCurrency, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ContributionRow {
  id: string;
  amount_cents: number;
  occurred_at: string;
  note: string | null;
}

export interface GoalCardData {
  id: string;
  name: string;
  emoji: string | null;
  color: string;
  target_cents: number;
  saved_cents: number;
  deadline: string | null;
  weekly_velocity: number[]; // length 8, oldest → newest
  recent_contributions: ContributionRow[]; // up to 5, newest first
}

interface Props {
  goal: GoalCardData;
  currency: string;
  locale: string;
  onEdit: () => void;
  onMove: () => void;
  onArchive: () => void;
  onWithdraw: () => void;
}

export function GoalCard({
  goal,
  currency,
  locale,
  onEdit,
  onMove,
  onArchive,
  onWithdraw,
}: Props) {
  // Optimistic delta layered on top of server-supplied saved_cents.
  const [delta, setDelta] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const savedCents = Math.max(0, goal.saved_cents + delta);
  const pct = percent(savedCents, goal.target_cents);
  const isFunded = savedCents >= goal.target_cents;

  const projection = useMemo(
    () =>
      computeProjection(
        savedCents,
        goal.target_cents,
        goal.weekly_velocity,
        goal.deadline,
      ),
    [savedCents, goal.target_cents, goal.weekly_velocity, goal.deadline],
  );

  return (
    <Card
      className={cn(
        "overflow-hidden transition",
        isFunded && "ring-2 ring-offset-2",
      )}
      style={isFunded ? { boxShadow: `0 0 0 1px ${goal.color}` } : undefined}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl"
            style={{
              backgroundColor: `${goal.color}22`,
              color: goal.color,
            }}
            aria-hidden
          >
            {goal.emoji ?? "🎯"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium">{goal.name}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Goal actions"
                    className="h-7 w-7"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onMove}>
                    <ArrowLeftRight className="mr-2 h-4 w-4" /> Move to other goal
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onWithdraw}>
                    <MinusCircle className="mr-2 h-4 w-4" /> Withdraw
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={onArchive}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatCurrency(savedCents, currency, locale)}
              </span>{" "}
              of {formatCurrency(goal.target_cents, currency, locale)} ·{" "}
              {pct}%
              {isFunded ? " · 🎉 Funded" : ""}
            </p>
          </div>
        </div>

        <Progress value={pct} />

        <QuickChips
          goalId={goal.id}
          goalName={goal.name}
          currency={currency}
          locale={locale}
          color={goal.color}
          onOptimisticAdd={(c) => {
            setDelta((d) => d + c);
            if (savedCents + c >= goal.target_cents && !isFunded) {
              toast.success(`🎉 ${goal.name} fully funded!`);
            }
          }}
          onOptimisticRevert={(c) => setDelta((d) => d - c)}
        />

        <div className="flex items-end justify-between gap-3 text-xs text-muted-foreground">
          <Sparkline weeklyCents={goal.weekly_velocity} color={goal.color} />
          <div className="text-right">
            {projection.text ? (
              <p>
                <span className="text-muted-foreground">Projected: </span>
                <span className="font-medium text-foreground">
                  {projection.text}
                </span>
              </p>
            ) : null}
            {goal.deadline ? <p>Deadline: {goal.deadline}</p> : null}
          </div>
        </div>

        {goal.recent_contributions.length > 0 ? (
          <div className="-mb-1 border-t pt-2">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              <span>Recent contributions</span>
              {showHistory ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {showHistory ? (
              <ul className="mt-2 space-y-1 text-xs">
                {goal.recent_contributions.map((c) => (
                  <li key={c.id} className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {formatDate(c.occurred_at, locale)}
                      {c.note ? ` · ${c.note}` : ""}
                    </span>
                    <span
                      className={cn(
                        "font-medium",
                        c.amount_cents < 0 && "text-destructive",
                      )}
                    >
                      {c.amount_cents < 0 ? "−" : "+"}
                      {formatCurrency(
                        Math.abs(c.amount_cents),
                        currency,
                        locale,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function computeProjection(
  saved: number,
  target: number,
  weekly: number[],
  deadline: string | null,
): { text: string | null } {
  if (saved >= target) return { text: "Funded" };
  const positive = weekly.filter((v) => v > 0);
  if (positive.length === 0) return { text: deadline ? null : null };
  const avgPerWeek =
    positive.reduce((sum, v) => sum + v, 0) / Math.max(1, positive.length);
  if (avgPerWeek <= 0) return { text: null };
  const remaining = target - saved;
  const weeks = Math.ceil(remaining / avgPerWeek);
  if (!Number.isFinite(weeks) || weeks > 520) return { text: "10+ years" };
  const eta = new Date();
  eta.setDate(eta.getDate() + weeks * 7);
  try {
    return {
      text: new Intl.DateTimeFormat(undefined, {
        month: "short",
        year: "numeric",
      }).format(eta),
    };
  } catch {
    return { text: `${weeks}w` };
  }
}
