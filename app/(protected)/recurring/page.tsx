import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import {
  RecurringView,
  type RecurringRow,
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
  ]);

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
      />
    </div>
  );
}
