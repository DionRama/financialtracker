import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Lightbulb,
  PiggyBank,
  Receipt,
  Target,
  Wallet,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { monthBounds, previousMonth } from "@/lib/queries/month";
import { formatCurrency, formatMonthLabel, percent } from "@/lib/format";
import { computeInsights, type Insight } from "@/lib/insights";
import { persistInsights } from "@/lib/insights/persist";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DailySpendChart,
  type DailySpendPoint,
} from "@/components/charts/daily-spend-chart";
import {
  CategoryPieChart,
  type CategorySlice,
} from "@/components/charts/category-pie-chart";
import {
  DashboardGoalsList,
  type DashboardGoal,
} from "@/components/dashboard/dashboard-goals-list";
import { InsightCard } from "@/components/insights/insight-card";

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

  // Onboarding gate: send brand-new users to /onboarding once. Anyone with
  // monthly income set OR at least one recorded expense is considered onboarded.
  const [{ data: onboardingProfile }, { count: onboardingExpenses }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("monthly_income_cents")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("expenses")
        .select("id", { count: "exact", head: true }),
    ]);
  if (
    (onboardingProfile?.monthly_income_cents ?? 0) === 0 &&
    (onboardingExpenses ?? 0) === 0
  ) {
    redirect("/onboarding");
  }

  const { isoMonth, startDate, endDate } = monthBounds(month);
  const prevIsoMonth = previousMonth(isoMonth);
  const prevBounds = monthBounds(prevIsoMonth.slice(0, 7));

  const [
    { data: thisMonth },
    { data: prevMonth },
    { data: categories },
    { data: budgets },
    { data: profile },
    { data: incomeRows },
    { data: goals },
    { data: upcoming },
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
      .select("currency, locale, full_name, monthly_income_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("income_entries")
      .select("amount_cents")
      .gte("received_at", startDate)
      .lt("received_at", endDate),
    supabase
      .from("savings_goals")
      .select("id, name, color, emoji, saved_cents, target_cents, deadline")
      .eq("is_archived", false)
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("upcoming_recurring_30d")
      .select(
        "id, vendor, description, amount_cents, next_run_date, kind, is_subscription",
      )
      .order("next_run_date", { ascending: true }),
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

  // Spend per category this month
  const spentByCat = new Map<string, number>();
  for (const e of expenses) {
    if (!e.category_id) continue;
    spentByCat.set(
      e.category_id,
      (spentByCat.get(e.category_id) ?? 0) + e.amount_cents,
    );
  }

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

  // Income (this month). Fallback to profile.monthly_income_cents when no entries.
  const incomeFromEntries = (incomeRows ?? []).reduce(
    (s, r) => s + r.amount_cents,
    0,
  );
  const incomeCents =
    incomeFromEntries > 0
      ? incomeFromEntries
      : profile?.monthly_income_cents ?? 0;
  const moneyLeftCents = incomeCents - totalCents;
  const spentVsIncomePct = Math.min(percent(totalCents, incomeCents), 100);
  const savingsRate =
    incomeCents > 0 ? ((incomeCents - totalCents) / incomeCents) * 100 : null;

  const goalsList: DashboardGoal[] = (goals ?? []) as DashboardGoal[];

  // Upcoming this week (next 7 days from today)
  const todayIso = new Date().toISOString().slice(0, 10);
  const in7 = new Date();
  in7.setUTCDate(in7.getUTCDate() + 7);
  const in7Iso = in7.toISOString().slice(0, 10);
  const upcomingRows = (upcoming ?? []).filter(
    (u) => u.next_run_date >= todayIso && u.next_run_date <= in7Iso,
  );
  const upcomingTotal = upcomingRows.reduce(
    (s, u) => s + (u.kind === "income" ? -u.amount_cents : u.amount_cents),
    0,
  );

  // Insights: gather extra data, compute, persist (best-effort).
  const threeMoStart = (() => {
    const [y, m] = isoMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, (m ?? 1) - 4, 1));
    return d.toISOString().slice(0, 10);
  })();
  const [{ data: monthlyTotals }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("monthly_totals")
      .select("month, category_id, total_cents")
      .gte("month", threeMoStart)
      .lt("month", isoMonth),
    supabase
      .from("recurring_rules")
      .select("id, vendor, amount_cents")
      .eq("is_subscription", true)
      .eq("is_paused", false),
  ]);

  const spentByCatLast3MoAvg = new Map<string, number>();
  const sumByCat = new Map<string, number>();
  const monthsByCat = new Map<string, Set<string>>();
  for (const row of monthlyTotals ?? []) {
    if (!row.category_id) continue;
    sumByCat.set(
      row.category_id,
      (sumByCat.get(row.category_id) ?? 0) + (row.total_cents ?? 0),
    );
    let set = monthsByCat.get(row.category_id);
    if (!set) {
      set = new Set();
      monthsByCat.set(row.category_id, set);
    }
    set.add(row.month);
  }
  for (const [catId, sum] of sumByCat) {
    const n = monthsByCat.get(catId)?.size ?? 1;
    spentByCatLast3MoAvg.set(catId, sum / Math.max(n, 1));
  }

  const recentLargeExpenses = [...expenses]
    .sort((a, b) => b.amount_cents - a.amount_cents)
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      amount_cents: e.amount_cents,
      note: e.note,
      category_id: e.category_id,
    }));

  const catNamesById = new Map(cats.map((c) => [c.id, c.name]));
  const todayDate = new Date();
  const isCurrentMonth =
    isoMonth.slice(0, 7) ===
    `${todayDate.getUTCFullYear()}-${String(todayDate.getUTCMonth() + 1).padStart(2, "0")}`;
  const daysIntoMonth = isCurrentMonth ? todayDate.getUTCDate() : totalDays;

  const insights: Insight[] = computeInsights({
    isoMonth,
    daysIntoMonth,
    daysInMonth: totalDays,
    currency,
    locale,
    incomeCentsThisMonth: incomeCents,
    spentCentsThisMonth: totalCents,
    spentCentsLastMonth: prevTotalCents,
    spentByCatThisMonth: spentByCat,
    spentByCatLast3MoAvg,
    catNamesById,
    budgets: buds,
    recentLargeExpenses,
    subscriptions: (subscriptions ?? []).map((s) => ({
      id: s.id,
      vendor: s.vendor,
      amount_cents: s.amount_cents,
      previous_amount_cents: null,
    })),
    goals: (goals ?? []).map((g) => ({
      id: g.id,
      name: g.name,
      target_cents: g.target_cents,
      saved_cents: g.saved_cents,
      deadline: (g as { deadline?: string | null }).deadline ?? null,
    })),
  });

  // Persist for the notifications surface; only for current month to avoid
  // re-persisting historical data when the user browses past months.
  if (isCurrentMonth) {
    await persistInsights(insights);
  }

  const severityRank: Record<Insight["severity"], number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  const topInsights = [...insights]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hi ${profile?.full_name?.split(" ")[0] ?? "there"}`}
        description={`Here's your ${formatMonthLabel(isoMonth, locale)} at a glance.`}
      />

      {topInsights.length > 0 ? (
        <section>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Insights
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/insights">
                  See all <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {topInsights.map((i) => (
                  <InsightCard key={i.id} insight={i} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {upcomingRows.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Upcoming this week
            </CardTitle>
            <span className="font-tabular text-sm text-muted-foreground">
              Net {formatCurrency(upcomingTotal, currency, locale)}
            </span>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {upcomingRows.slice(0, 6).map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {u.vendor || u.description || "Recurring"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.next_run_date).toLocaleDateString(locale, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {u.is_subscription ? " · subscription" : ""}
                    </p>
                  </div>
                  <Badge
                    variant={u.kind === "income" ? "default" : "secondary"}
                    className="font-tabular"
                  >
                    {u.kind === "income" ? "+" : "-"}
                    {formatCurrency(u.amount_cents, currency, locale)}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Banknote}
          label="Income"
          value={formatCurrency(incomeCents, currency, locale)}
          hint={
            incomeFromEntries > 0
              ? `${(incomeRows ?? []).length} entries`
              : profile?.monthly_income_cents
                ? "default monthly"
                : "no income yet"
          }
        />
        <KpiCard
          icon={Wallet}
          label="Spent"
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
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Money left
              </span>
              <div className="grid h-8 w-8 place-items-center rounded-md bg-muted text-muted-foreground">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="font-tabular text-2xl font-semibold tracking-tight sm:text-3xl">
              {formatCurrency(moneyLeftCents, currency, locale)}
            </div>
            <Progress value={spentVsIncomePct} />
          </CardContent>
        </Card>
        <KpiCard
          icon={Target}
          label="Savings rate"
          value={
            savingsRate === null ? "—" : `${savingsRate.toFixed(1)}%`
          }
          hint={savingsRate === null ? "Set income to track" : "of income kept"}
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
            <CardTitle>Savings goals</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/goals">
                See all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {goalsList.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No goals yet"
                description="Create one to start saving toward something specific."
                action={
                  <Button asChild size="sm">
                    <Link href="/goals">New goal</Link>
                  </Button>
                }
              />
            ) : (
              <DashboardGoalsList
                goals={goalsList}
                currency={currency}
                locale={locale}
              />
            )}
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
