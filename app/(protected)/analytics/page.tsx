import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/queries/month";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
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

  const { isoMonth, startDate, endDate } = monthBounds(month);
  const [year, mo] = isoMonth.split("-").map(Number);

  // Range: 6 months ending at the selected month (inclusive).
  const trendStart = new Date(Date.UTC(year, (mo ?? 1) - 6, 1));
  const trendStartIso = trendStart.toISOString().slice(0, 10);

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

  // Build 6-month trend
  const trendBuckets = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(year, (mo ?? 1) - 1 - i, 1));
    trendBuckets.set(d.toISOString().slice(0, 7), 0);
  }
  for (const e of expenses ?? []) {
    const ym = e.occurred_at.slice(0, 7);
    if (trendBuckets.has(ym)) {
      trendBuckets.set(ym, (trendBuckets.get(ym) ?? 0) + e.amount_cents);
    }
  }
  const trendData: TrendPoint[] = Array.from(trendBuckets, ([ym, cents]) => ({
    month: formatMonthLabel(`${ym}-01`, locale).replace(/(\s)\d{4}$/, ""),
    cents,
  }));

  // Current vs previous month per category
  const prevStart = new Date(Date.UTC(year, (mo ?? 1) - 2, 1))
    .toISOString()
    .slice(0, 10);
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
    </div>
  );
}
