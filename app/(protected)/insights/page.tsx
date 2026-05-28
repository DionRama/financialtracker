import { redirect } from "next/navigation";
import { AlertCircle, AlertTriangle, Info, Lightbulb } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/queries/month";
import { getPeriodStartDay } from "@/lib/period-server";
import { previousPeriod } from "@/lib/period";
import { computeInsights, type Insight } from "@/lib/insights";
import { persistInsights } from "@/lib/insights/persist";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightCard } from "@/components/insights/insight-card";
import { NotificationRowActions } from "./row-actions";

export const metadata = { title: "Insights" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

function daysBetween(startDate: string, endDate: string): number {
  const a = new Date(`${startDate}T00:00:00Z`).getTime();
  const b = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

const SEVERITY_LABEL: Record<Insight["severity"], string> = {
  critical: "Critical",
  warning: "Warnings",
  info: "Heads up",
};

const SEVERITY_ICON = {
  critical: AlertTriangle,
  warning: AlertCircle,
  info: Info,
} as const;

const SEVERITY_TONE = {
  critical: "text-destructive",
  warning: "text-amber-500",
  info: "text-muted-foreground",
} as const;

export default async function InsightsPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const periodStartDay = await getPeriodStartDay();
  const { isoMonth, startDate, endDate } = monthBounds(month, periodStartDay);

  // 3 prior period keys (used for `monthly_totals` filter via the view).
  let threeMoKey = isoMonth;
  for (let i = 0; i < 3; i++) threeMoKey = previousPeriod(threeMoKey);
  const threeMoStart = threeMoKey;

  const [
    { data: expenses },
    { data: cats },
    { data: budgets },
    { data: profile },
    { data: incomeRows },
    { data: goals },
    { data: subscriptions },
    { data: monthlyTotals },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, amount_cents, occurred_at, note, category_id")
      .gte("occurred_at", startDate)
      .lt("occurred_at", endDate),
    supabase.from("categories").select("id, name").eq("is_archived", false),
    supabase
      .from("budgets")
      .select("category_id, amount_cents")
      .eq("month", isoMonth),
    supabase
      .from("profiles")
      .select("currency, locale, monthly_income_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("income_entries")
      .select("amount_cents")
      .eq("applies_to_month", isoMonth),
    supabase
      .from("savings_goals")
      .select("id, name, target_cents, saved_cents, deadline")
      .eq("is_archived", false),
    supabase
      .from("recurring_rules")
      .select("id, vendor, amount_cents")
      .eq("is_subscription", true)
      .eq("is_paused", false),
    supabase
      .from("monthly_totals")
      .select("month, category_id, total_cents")
      .gte("month", threeMoStart)
      .lt("month", isoMonth),
    supabase
      .from("notifications")
      .select("id, kind, severity, is_read, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const currency = profile?.currency ?? "USD";
  const locale = profile?.locale ?? "en-US";
  const totalDays = daysBetween(startDate, endDate);

  const expensesList = expenses ?? [];
  const totalCents = expensesList.reduce((s, e) => s + e.amount_cents, 0);
  const spentByCat = new Map<string, number>();
  for (const e of expensesList) {
    if (!e.category_id) continue;
    spentByCat.set(
      e.category_id,
      (spentByCat.get(e.category_id) ?? 0) + e.amount_cents,
    );
  }

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
  const spentByCatLast3MoAvg = new Map<string, number>();
  for (const [catId, sum] of sumByCat) {
    const n = monthsByCat.get(catId)?.size ?? 1;
    spentByCatLast3MoAvg.set(catId, sum / Math.max(n, 1));
  }

  const incomeFromEntries = (incomeRows ?? []).reduce(
    (s, r) => s + r.amount_cents,
    0,
  );
  const incomeCents =
    incomeFromEntries > 0
      ? incomeFromEntries
      : profile?.monthly_income_cents ?? 0;

  const catNamesById = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const todayIsoFull = new Date().toISOString().slice(0, 10);
  const isCurrentMonth = todayIsoFull >= startDate && todayIsoFull < endDate;
  const daysIntoMonth = isCurrentMonth
    ? daysBetween(startDate, todayIsoFull) || 1
    : totalDays;

  const recentLargeExpenses = [...expensesList]
    .sort((a, b) => b.amount_cents - a.amount_cents)
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      amount_cents: e.amount_cents,
      note: e.note,
      category_id: e.category_id,
    }));

  const insights: Insight[] = computeInsights({
    isoMonth,
    daysIntoMonth,
    daysInMonth: totalDays,
    currency,
    locale,
    incomeCentsThisMonth: incomeCents,
    spentCentsThisMonth: totalCents,
    spentCentsLastMonth: 0,
    spentByCatThisMonth: spentByCat,
    spentByCatLast3MoAvg,
    catNamesById,
    budgets: budgets ?? [],
    recentLargeExpenses,
    subscriptions: (subscriptions ?? []).map((s) => ({
      id: s.id,
      vendor: s.vendor,
      amount_cents: s.amount_cents,
      previous_amount_cents: null,
    })),
    goals: goals ?? [],
  });

  if (isCurrentMonth) {
    await persistInsights(insights);
  }

  const groups: Record<Insight["severity"], Insight[]> = {
    critical: [],
    warning: [],
    info: [],
  };
  for (const i of insights) groups[i.severity].push(i);

  const notifList = notifications ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        description="What changed this month and where to look next."
      />

      {insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No insights yet"
          description="Add expenses and budgets to start seeing them."
        />
      ) : (
        <div className="space-y-6">
          {(["critical", "warning", "info"] as const).map((sev) => {
            const list = groups[sev];
            if (!list.length) return null;
            const Icon = SEVERITY_ICON[sev];
            return (
              <section key={sev} className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Icon className={`h-4 w-4 ${SEVERITY_TONE[sev]}`} />
                  {SEVERITY_LABEL[sev]}
                  <span className="text-xs font-normal normal-case">
                    ({list.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((i) => (
                    <InsightCard key={i.id} insight={i} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Notification history</CardTitle>
          </CardHeader>
          <CardContent>
            {notifList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y">
                {notifList.map((n) => {
                  const Icon = SEVERITY_ICON[n.severity];
                  const tone = SEVERITY_TONE[n.severity];
                  const payload = (n.payload ?? {}) as {
                    title?: string;
                    body?: string;
                  };
                  return (
                    <li
                      key={n.id}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${
                            n.is_read ? "text-muted-foreground" : ""
                          }`}
                        >
                          {payload.title ?? n.kind}
                          {!n.is_read ? (
                            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                          ) : null}
                        </p>
                        {payload.body ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {payload.body}
                          </p>
                        ) : null}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <NotificationRowActions id={n.id} isRead={n.is_read} />
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
