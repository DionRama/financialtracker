import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { monthBounds } from "@/lib/queries/month";
import { PageHeader } from "@/components/common/page-header";
import {
  BudgetsView,
  type BudgetRow,
  type SpentRow,
} from "@/components/budgets/budgets-view";

export const metadata = { title: "Budgets" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function BudgetsPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { isoMonth, startDate, endDate } = monthBounds(month);

  const [{ data: categories }, { data: budgets }, { data: expenses }, { data: profile }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name, color")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("budgets")
        .select("id, category_id, amount_cents")
        .eq("month", isoMonth),
      supabase
        .from("expenses")
        .select("category_id, amount_cents")
        .gte("occurred_at", startDate)
        .lt("occurred_at", endDate),
      supabase
        .from("profiles")
        .select("currency, locale, monthly_income_cents")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

  // Aggregate spending per category in JS (no need for a server view here).
  const spentMap = new Map<string | null, number>();
  for (const e of expenses ?? []) {
    spentMap.set(
      e.category_id,
      (spentMap.get(e.category_id) ?? 0) + e.amount_cents,
    );
  }
  const spent: SpentRow[] = Array.from(spentMap, ([category_id, total_cents]) => ({
    category_id,
    total_cents,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Budgets"
        description="Set monthly limits per category and watch your progress."
      />
      <BudgetsView
        month={isoMonth}
        categories={categories ?? []}
        budgets={(budgets ?? []) as BudgetRow[]}
        spent={spent}
        currency={profile?.currency ?? "USD"}
        locale={profile?.locale ?? "en-US"}
        monthlyIncomeCents={profile?.monthly_income_cents ?? null}
      />
    </div>
  );
}
