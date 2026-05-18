import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Receipt,
  Target,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { monthBounds, previousMonth } from "@/lib/queries/month";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DailySpendChart,
  type DailySpendPoint,
} from "@/components/charts/daily-spend-chart";
import {
  CategoryPieChart,
  type CategorySlice,
} from "@/components/charts/category-pie-chart";

export const metadata = { title: "Dashboard" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

interface ExpenseRow {
  id: string;
  amount_cents: number;
  occurred_at: string;
  note: string | null;
  category_id: string | null;
}

interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

interface BudgetRow {
  category_id: string;
  amount_cents: number;
}

function daysInMonth(isoMonth: string): number {
  const [y, m] = isoMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m ?? 1, 0)).getUTCDate();
}

export default async function DashboardPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isoMonth, startDate, endDate } = monthBounds(month);
  const prevIsoMonth = previousMonth(isoMonth);
  const prevBounds = monthBounds(prevIsoMonth.slice(0, 7));

  const [
    { data: thisMonth },
    { data: prevMonth },
    { data: categories },
    { data: budgets },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount_cents, occurred_at, note, category_id")
      .gte("occurred_at", startDate)
      .lt("occurred_at", endDate)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("amount_cents, category_id")
      .gte("occurred_at", prevBounds.startDate)
      .lt("occurred_at", prevBounds.endDate),
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("is_archived", false),
    supabase
      .from("budgets")
      .select("category_id, amount_cents")
      .eq("month", isoMonth),
    supabase
      .from("profiles")
      .select("currency, locale, full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const currency = profile?.currency ?? "USD";
  const locale = profile?.locale ?? "en-US";
  const expenses: ExpenseRow[] = thisMonth ?? [];
  const prevExpenses: { amount_cents: number; category_id: string | null }[] =
    prevMonth ?? [];
  const cats: CategoryRow[] = categories ?? [];
  const buds: BudgetRow[] = budgets ?? [];
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const totalCents = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const prevTotalCents = prevExpenses.reduce((s, e) => s + e.amount_cents, 0);
  const deltaCents = totalCents - prevTotalCents;

  // Spend per category this month
  const spentByCat = new Map<string, number>();
  for (const e of expenses) {
    if (!e.category_id) continue;
    spentByCat.set(
      e.category_id,
      (spentByCat.get(e.category_id) ?? 0) + e.amount_cents,
    );
  }

  // Top category by spend
  let topCategory: { name: string; cents: number } | null = null;
  for (const [id, cents] of spentByCat) {
    const c = catMap.get(id);
    if (!c) continue;
    if (!topCategory || cents > topCategory.cents) {
      topCategory = { name: c.name, cents };
    }
  }

  // Over-budget categories
  const overBudget = buds.filter(
    (b) => b.amount_cents > 0 && (spentByCat.get(b.category_id) ?? 0) > b.amount_cents,
  ).length;

  // Daily spend series
  const totalDays = daysInMonth(isoMonth);
  const dailyMap = new Map<number, number>();
  for (const e of expenses) {
    const d = Number(e.occurred_at.slice(8, 10));
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + e.amount_cents);
  }
  const dailyData: DailySpendPoint[] = Array.from(
    { length: totalDays },
    (_, i) => {
      const day = i + 1;
      return {
        day: String(day),
        date: `${isoMonth.slice(0, 7)}-${String(day).padStart(2, "0")}`,
        cents: dailyMap.get(day) ?? 0,
      };
    },
  );

  // Pie data
  const pieData: CategorySlice[] = Array.from(spentByCat, ([id, cents]) => {
    const c = catMap.get(id);
    return {
      category_id: id,
      name: c?.name ?? "Uncategorized",
      color: c?.color ?? "#94a3b8",
      cents,
    };
  })
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 8);

  const recent = expenses.slice(0, 8);
  const deltaPct =
    prevTotalCents > 0
      ? Math.round(((totalCents - prevTotalCents) / prevTotalCents) * 100)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi ${profile?.full_name?.split(" ")[0] ?? "there"}`}
        description={`Here's your ${formatMonthLabel(isoMonth, locale)} at a glance.`}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Spent this month"
          value={formatCurrency(totalCents, currency, locale)}
          delta={
            deltaPct === null
              ? null
              : {
                  value: `${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs last`,
                  positive: deltaPct > 0,
                }
          }
          hint={`${expenses.length} transactions`}
        />
        <KpiCard
          icon={Receipt}
          label="Last month"
          value={formatCurrency(prevTotalCents, currency, locale)}
          hint={`Δ ${deltaCents >= 0 ? "+" : ""}${formatCurrency(
            Math.abs(deltaCents),
            currency,
            locale,
          )}`}
        />
        <KpiCard
          icon={Target}
          label="Top category"
          value={topCategory?.name ?? "—"}
          hint={
            topCategory
              ? formatCurrency(topCategory.cents, currency, locale)
              : "No spending yet"
          }
        />
        <KpiCard
          icon={AlertTriangle}
          label="Over budget"
          value={String(overBudget)}
          hint={overBudget === 1 ? "category" : "categories"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daily spend</CardTitle>
            <span className="text-xs text-muted-foreground">
              {formatMonthLabel(isoMonth, locale)}
            </span>
          </CardHeader>
          <CardContent>
            <DailySpendChart data={dailyData} currency={currency} locale={locale} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={pieData} currency={currency} locale={locale} />
            {pieData.length > 0 ? (
              <ul className="mt-4 space-y-1 text-sm">
                {pieData.slice(0, 5).map((d) => (
                  <li
                    key={d.category_id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="font-tabular tabular-nums text-muted-foreground">
                      {formatCurrency(d.cents, currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent expenses</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/expenses">
                See all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Add your first transaction to see it here."
              />
            ) : (
              <ul className="divide-y">
                {recent.map((e) => {
                  const c = e.category_id ? catMap.get(e.category_id) : null;
                  return (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div
                        className="h-9 w-9 shrink-0 rounded-lg"
                        style={{ backgroundColor: c?.color ?? "#64748b" }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {e.note || c?.name || "Expense"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c?.name ?? "Uncategorized"} ·{" "}
                          {new Date(e.occurred_at).toLocaleDateString(locale, {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-tabular">
                        {formatCurrency(e.amount_cents, currency, locale)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
