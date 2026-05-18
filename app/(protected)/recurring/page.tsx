import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import {
  RecurringView,
  type RecurringRow,
  type LastEntryInfo,
} from "@/components/recurring/recurring-view";

export const metadata = { title: "Recurring" };

export default async function RecurringPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: rules },
    { data: categories },
    { data: sources },
    { data: profile },
    { data: expenseEntries },
    { data: incomeEntries },
  ] = await Promise.all([
    supabase
      .from("recurring_rules")
      .select(
        "id, kind, category_id, source_id, amount_cents, currency, description, cadence, interval_count, day_of_month, weekday, start_date, end_date, next_run_date, is_paused, is_subscription, vendor",
      )
      .order("next_run_date", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("income_sources")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("profiles")
      .select("currency, locale")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("recurring_id, occurred_at")
      .not("recurring_id", "is", null)
      .order("occurred_at", { ascending: false })
      .limit(2000),
    supabase
      .from("income_entries")
      .select("recurring_id, received_at")
      .not("recurring_id", "is", null)
      .order("received_at", { ascending: false })
      .limit(2000),
  ]);

  const lastEntries: Record<string, LastEntryInfo> = {};
  for (const row of expenseEntries ?? []) {
    if (!row.recurring_id) continue;
    const k = row.recurring_id as string;
    const existing = lastEntries[k];
    if (!existing) {
      lastEntries[k] = { lastDate: row.occurred_at as string, count: 1 };
    } else {
      existing.count += 1;
      if ((row.occurred_at as string) > existing.lastDate) {
        existing.lastDate = row.occurred_at as string;
      }
    }
  }
  for (const row of incomeEntries ?? []) {
    if (!row.recurring_id) continue;
    const k = row.recurring_id as string;
    const existing = lastEntries[k];
    if (!existing) {
      lastEntries[k] = { lastDate: row.received_at as string, count: 1 };
    } else {
      existing.count += 1;
      if ((row.received_at as string) > existing.lastDate) {
        existing.lastDate = row.received_at as string;
      }
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Recurring"
        description="Subscriptions, bills, and scheduled income."
      />
      <RecurringView
        rules={(rules ?? []) as RecurringRow[]}
        categories={categories ?? []}
        sources={sources ?? []}
        currency={profile?.currency ?? "USD"}
        locale={profile?.locale ?? "en-US"}
        lastEntries={lastEntries}
      />
    </div>
  );
}
