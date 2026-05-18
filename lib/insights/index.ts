import { formatCurrency } from "../format";

export type InsightKind =
  | "category_spike"
  | "budget_warning"
  | "budget_exceeded"
  | "large_expense"
  | "subscription_price_change"
  | "savings_on_track"
  | "savings_off_track"
  | "goal_pace";

export type Insight = {
  id: string;
  kind: InsightKind;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  actionHref?: string;
  payload: Record<string, unknown>;
};

export interface InsightInput {
  isoMonth: string;
  daysIntoMonth: number;
  daysInMonth: number;
  currency: string;
  locale: string;
  incomeCentsThisMonth: number;
  spentCentsThisMonth: number;
  spentCentsLastMonth: number;
  spentByCatThisMonth: Map<string, number>;
  spentByCatLast3MoAvg: Map<string, number>;
  catNamesById: Map<string, string>;
  budgets: { category_id: string; amount_cents: number }[];
  recentLargeExpenses: {
    id: string;
    amount_cents: number;
    note: string | null;
    category_id: string | null;
  }[];
  subscriptions: {
    id: string;
    vendor: string | null;
    amount_cents: number;
    previous_amount_cents: number | null;
  }[];
  goals: {
    id: string;
    name: string;
    target_cents: number;
    saved_cents: number;
    deadline: string | null;
  }[];
}

function monthsBetween(fromIsoMonth: string, deadlineIso: string): number {
  const [fy, fm] = fromIsoMonth.split("-").map(Number);
  const d = new Date(deadlineIso);
  if (Number.isNaN(d.getTime())) return 0;
  const dy = d.getUTCFullYear();
  const dm = d.getUTCMonth() + 1;
  const diff = (dy - fy) * 12 + (dm - fm);
  return Math.max(0, Math.ceil(diff));
}

export function computeInsights(input: InsightInput): Insight[] {
  const {
    isoMonth,
    daysIntoMonth,
    daysInMonth,
    currency,
    locale,
    incomeCentsThisMonth,
    spentCentsThisMonth,
    spentByCatThisMonth,
    spentByCatLast3MoAvg,
    catNamesById,
    budgets,
    recentLargeExpenses,
    subscriptions,
    goals,
  } = input;

  const fmt = (c: number) => formatCurrency(c, currency, locale);
  const daysLeft = Math.max(0, daysInMonth - daysIntoMonth);
  const insights: Insight[] = [];

  // 1 & 2: Budget warnings and exceedances
  for (const b of budgets) {
    if (b.amount_cents <= 0) continue;
    const spent = spentByCatThisMonth.get(b.category_id) ?? 0;
    const ratio = spent / b.amount_cents;
    const catName = catNamesById.get(b.category_id) ?? "Category";

    if (spent > b.amount_cents) {
      insights.push({
        id: `budget_exceeded:${b.category_id}:${isoMonth}`,
        kind: "budget_exceeded",
        severity: "critical",
        title: `${catName} over budget`,
        body: `Spent ${fmt(spent)} of ${fmt(b.amount_cents)} budget.`,
        actionHref: "/budgets",
        payload: {
          category_id: b.category_id,
          spent_cents: spent,
          amount_cents: b.amount_cents,
        },
      });
    } else if (ratio > 0.8 && ratio < 1.0) {
      insights.push({
        id: `budget_warning:${b.category_id}:${isoMonth}`,
        kind: "budget_warning",
        severity: "warning",
        title: `${catName} at ${Math.round(ratio * 100)}% of budget`,
        body: `${daysLeft} days left in the month.`,
        actionHref: "/budgets",
        payload: {
          category_id: b.category_id,
          spent_cents: spent,
          amount_cents: b.amount_cents,
          pct: ratio,
        },
      });
    }
  }

  // 3: Category spikes
  for (const [catId, spent] of spentByCatThisMonth) {
    const avg = spentByCatLast3MoAvg.get(catId) ?? 0;
    if (avg >= 5000 && spent > 1.5 * avg) {
      const catName = catNamesById.get(catId) ?? "Category";
      insights.push({
        id: `category_spike:${catId}:${isoMonth}`,
        kind: "category_spike",
        severity: "info",
        title: `${catName} spending spike`,
        body: `${fmt(spent)} this month vs ${fmt(Math.round(avg))} avg over the last 3 months.`,
        payload: {
          category_id: catId,
          spent_cents: spent,
          avg_cents: avg,
        },
      });
    }
  }

  // 4: Large expenses.
  // Heuristic: an expense is "unusual" if it exceeds 2 * dailyAvg * 10,
  // i.e. 20x the running daily spending pace for the month.
  // dailyAvg = spentThisMonth / max(daysIntoMonth, 1).
  const dailyAvg = spentCentsThisMonth / Math.max(daysIntoMonth, 1);
  const largeThreshold = 2 * dailyAvg * 10;
  const flagged = recentLargeExpenses
    .filter((e) => e.amount_cents > largeThreshold && largeThreshold > 0)
    .sort((a, b) => b.amount_cents - a.amount_cents)
    .slice(0, 3);
  for (const e of flagged) {
    const catName = e.category_id
      ? catNamesById.get(e.category_id) ?? null
      : null;
    const label = e.note?.trim() || catName || "Expense";
    insights.push({
      id: `large_expense:${e.id}:${isoMonth}`,
      kind: "large_expense",
      severity: "info",
      title: `Large expense: ${label}`,
      body: `${fmt(e.amount_cents)} — well above your daily average of ${fmt(Math.round(dailyAvg))}.`,
      payload: {
        expense_id: e.id,
        amount_cents: e.amount_cents,
        daily_avg_cents: dailyAvg,
        threshold_cents: largeThreshold,
      },
    });
  }

  // 5: Subscription price changes
  for (const s of subscriptions) {
    if (s.previous_amount_cents == null) continue;
    if (s.previous_amount_cents === s.amount_cents) continue;
    const increased = s.amount_cents > s.previous_amount_cents;
    const vendor = s.vendor?.trim() || "Subscription";
    const delta = s.amount_cents - s.previous_amount_cents;
    insights.push({
      id: `subscription_price_change:${s.id}:${isoMonth}`,
      kind: "subscription_price_change",
      severity: increased ? "warning" : "info",
      title: `${vendor} price ${increased ? "increased" : "decreased"}`,
      body: `${fmt(s.previous_amount_cents)} → ${fmt(s.amount_cents)} (${
        increased ? "+" : ""
      }${fmt(delta)}).`,
      actionHref: "/recurring",
      payload: {
        subscription_id: s.id,
        previous_amount_cents: s.previous_amount_cents,
        amount_cents: s.amount_cents,
        delta_cents: delta,
      },
    });
  }

  // 6: Savings on/off track
  const projectedSpend =
    daysIntoMonth > 0
      ? spentCentsThisMonth * (daysInMonth / daysIntoMonth)
      : spentCentsThisMonth;
  const projectedSavings = incomeCentsThisMonth - projectedSpend;
  if (projectedSavings > incomeCentsThisMonth * 0.1) {
    insights.push({
      id: `savings_on_track:user:${isoMonth}`,
      kind: "savings_on_track",
      severity: "info",
      title: "You're on track to save this month",
      body: `Projected end-of-month savings: ${fmt(Math.round(projectedSavings))}.`,
      payload: {
        projected_savings_cents: projectedSavings,
        income_cents: incomeCentsThisMonth,
      },
    });
  } else if (projectedSavings < 0) {
    insights.push({
      id: `savings_off_track:user:${isoMonth}`,
      kind: "savings_off_track",
      severity: "warning",
      title: "Spending is outpacing income",
      body: `Projected end-of-month shortfall: ${fmt(Math.round(Math.abs(projectedSavings)))}.`,
      payload: {
        projected_savings_cents: projectedSavings,
        income_cents: incomeCentsThisMonth,
      },
    });
  }

  // 7: Goal pace
  for (const g of goals) {
    if (!g.deadline) continue;
    const monthsLeft = monthsBetween(isoMonth, g.deadline);
    if (monthsLeft <= 0) continue;
    const remaining = g.target_cents - g.saved_cents;
    if (remaining <= 0) continue;
    const requiredPerMonth = remaining / monthsLeft;
    if (requiredPerMonth > 0) {
      insights.push({
        id: `goal_pace:${g.id}:${isoMonth}`,
        kind: "goal_pace",
        severity: "info",
        title: `${g.name}: ${fmt(Math.round(requiredPerMonth))}/mo to reach goal`,
        body: `${fmt(remaining)} remaining over ${monthsLeft} month${monthsLeft === 1 ? "" : "s"}.`,
        actionHref: "/goals",
        payload: {
          goal_id: g.id,
          required_per_month_cents: requiredPerMonth,
          remaining_cents: remaining,
          months_left: monthsLeft,
        },
      });
    }
  }

  return insights;
}
