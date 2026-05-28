import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/queries/month";
import { getPeriodStartDay } from "@/lib/period-server";
import { periodBounds, periodOf, previousPeriod } from "@/lib/period";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CategoryCompareChart,
  type CategoryCompareRow,
} from "@/components/charts/category-compare-chart";
import {
  TrendLineChart,
  type TrendPoint,
} from "@/components/charts/trend-line-chart";

export const metadata = { title: "Analytics" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const periodStartDay = await getPeriodStartDay();
  const { isoMonth, startDate, endDate } = monthBounds(month, periodStartDay);

  // Range: 6 periods ending at the selected period (inclusive).
  const periodKeys: string[] = [isoMonth];
  for (let i = 0; i < 5; i++) {
    periodKeys.unshift(previousPeriod(periodKeys[0]));
  }
  const oldestPeriodKey = periodKeys[0];
  const trendStartIso = periodBounds(oldestPeriodKey, periodStartDay).startDate;

  const [{ data: expenses }, { data: categories }, { data: profile }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("amount_cents, occurred_at, category_id")
        .gte("occurred_at", trendStartIso)
        .lt("occurred_at", endDate),
      supabase.from("categories").select("id, name, color"),
      supabase
        .from("profiles")
        .select("currency, locale")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  const currency = profile?.currency ?? "USD";
  const locale = profile?.locale ?? "en-US";
  const cats = categories ?? [];
  const catMap = new Map(cats.map((c) => [c.id, c]));

  // Build 6-period trend (bucketed by the user's pay cycle)
  const trendBuckets = new Map<string, number>(periodKeys.map((k) => [k, 0]));
  for (const e of expenses ?? []) {
    const key = periodOf(e.occurred_at, periodStartDay);
    if (trendBuckets.has(key)) {
      trendBuckets.set(key, (trendBuckets.get(key) ?? 0) + e.amount_cents);
    }
  }
  const trendData: TrendPoint[] = Array.from(trendBuckets, ([key, cents]) => ({
    month: formatMonthLabel(key, locale).replace(/(\s)\d{4}$/, ""),
    cents,
  }));

  // Current vs previous period per category
  const prevBounds = periodBounds(previousPeriod(isoMonth), periodStartDay);
  const prevStart = prevBounds.startDate;
  const currentByCat = new Map<string, number>();
  const previousByCat = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (!e.category_id) continue;
    if (e.occurred_at >= startDate && e.occurred_at < endDate) {
      currentByCat.set(
        e.category_id,
        (currentByCat.get(e.category_id) ?? 0) + e.amount_cents,
      );
    } else if (e.occurred_at >= prevStart && e.occurred_at < startDate) {
      previousByCat.set(
        e.category_id,
        (previousByCat.get(e.category_id) ?? 0) + e.amount_cents,
      );
    }
  }
  const compareIds = new Set<string>([
    ...currentByCat.keys(),
    ...previousByCat.keys(),
  ]);
  const compareData: CategoryCompareRow[] = Array.from(compareIds)
    .map((id) => ({
      category: catMap.get(id)?.name ?? "Other",
      current: currentByCat.get(id) ?? 0,
      previous: previousByCat.get(id) ?? 0,
    }))
    .sort((a, b) => b.current + b.previous - (a.current + a.previous))
    .slice(0, 10);

  const totalCurrent = Array.from(currentByCat.values()).reduce((a, b) => a + b, 0);
  const totalPrev = Array.from(previousByCat.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Spot trends and compare months to see where your money goes."
      />

      {(expenses ?? []).length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No data to analyze yet"
          description="Add some expenses to see trends, comparisons, and category breakdowns."
          action={
            <Button asChild>
              <Link href="/expenses">Go to expenses</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This month
            </CardTitle>
          </CardHeader>
          <CardContent className="font-tabular text-3xl font-semibold tracking-tight">
            {formatCurrency(totalCurrent, currency, locale)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Previous month
            </CardTitle>
          </CardHeader>
          <CardContent className="font-tabular text-3xl font-semibold tracking-tight">
            {formatCurrency(totalPrev, currency, locale)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>This month vs previous month</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryCompareChart
            data={compareData}
            currency={currency}
            locale={locale}
          />
        </CardContent>
      </Card>

          <Card>
            <CardHeader>
              <CardTitle>6-month trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendLineChart data={trendData} currency={currency} locale={locale} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
