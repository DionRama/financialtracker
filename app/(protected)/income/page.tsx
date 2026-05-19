import { redirect } from "next/navigation";
import { TrendingUp, Wallet, Calendar } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/queries/month";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { IncomeView } from "@/components/income/income-view";

export const metadata = { title: "Income" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function IncomePage({ searchParams }: Props) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isoMonth, startDate, endDate } = monthBounds(month);
  const year = Number(isoMonth.slice(0, 4));
  const monthNum = Number(isoMonth.slice(5, 7));
  const ytdStart = `${year}-01-01`;
  const trendStart = new Date(Date.UTC(year, monthNum - 6, 1))
    .toISOString()
    .slice(0, 10);

  const [
    { data: profile },
    { data: sources },
    { data: entries },
    { data: trend },
    { data: ytd },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency, locale, monthly_income_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("income_sources")
      .select("id, name, kind, default_amount_cents, currency, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("income_entries")
      .select("id, source_id, amount_cents, received_at, applies_to_month, note")
      .gte("applies_to_month", startDate)
      .lt("applies_to_month", endDate)
      .order("received_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("monthly_income_totals")
      .select("month, total_cents")
      .gte("month", trendStart)
      .lt("month", endDate),
    supabase
      .from("income_entries")
      .select("amount_cents")
      .gte("applies_to_month", ytdStart)
      .lt("applies_to_month", endDate),
  ]);

  const currency = profile?.currency ?? "USD";
  const locale = profile?.locale ?? "en-US";

  const monthTotal =
    (entries ?? []).reduce((s, e) => s + e.amount_cents, 0) ||
    profile?.monthly_income_cents ||
    0;

  // Avg last 3 full months (excluding current)
  const trendRows = (trend ?? []) as { month: string; total_cents: number }[];
  const last3 = trendRows
    .filter((r) => r.month < isoMonth)
    .slice(-3);
  const avg3 = last3.length
    ? Math.round(last3.reduce((s, r) => s + r.total_cents, 0) / last3.length)
    : 0;

  const ytdTotal = (ytd ?? []).reduce((s, e) => s + e.amount_cents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description={`Money in for ${formatMonthLabel(isoMonth, locale)}.`}
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Wallet}
          label="Income this month"
          value={formatCurrency(monthTotal, currency, locale)}
          hint={`${(entries ?? []).length} entries`}
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg last 3 months"
          value={formatCurrency(avg3, currency, locale)}
          hint={last3.length ? `${last3.length}-month average` : "Not enough data"}
        />
        <KpiCard
          icon={Calendar}
          label="YTD income"
          value={formatCurrency(ytdTotal, currency, locale)}
          hint={`${year}`}
        />
      </section>

      <IncomeView
        sources={sources ?? []}
        entries={entries ?? []}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}
