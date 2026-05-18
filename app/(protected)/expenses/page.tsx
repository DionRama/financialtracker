import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import {
  ExpensesView,
  type ExpenseRow,
} from "@/components/expenses/expenses-view";

export const metadata = { title: "Expenses" };

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function ExpensesPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const isoMonth =
    month && /^\d{4}-\d{2}$/.test(month)
      ? `${month}-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          "0",
        )}-01`;
  const startDate = isoMonth;
  const next = new Date(isoMonth);
  next.setMonth(next.getMonth() + 1);
  const endDate = next.toISOString().slice(0, 10);

  const [{ data: expenses }, { data: categories }, { data: profile }, { data: rules }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("id, amount_cents, occurred_at, note, tags, category_id, recurring_id")
        .gte("occurred_at", startDate)
        .lt("occurred_at", endDate)
        .order("occurred_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("categories")
        .select("id, name, color")
        .eq("is_archived", false)
        .order("name"),
      supabase
        .from("profiles")
        .select("currency, locale")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("recurring_rules")
        .select("id, kind, is_subscription, vendor, description, cadence, day_of_month, amount_cents, currency, is_paused"),
    ]);

  const rows: ExpenseRow[] = expenses ?? [];
  const recurringById: Record<
    string,
    {
      id: string;
      kind: "expense" | "income";
      is_subscription: boolean;
      vendor: string | null;
      description: string | null;
      cadence: string;
      day_of_month: number | null;
      amount_cents: number;
      currency: string;
      is_paused: boolean;
    }
  > = {};
  for (const r of rules ?? []) recurringById[r.id] = r;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Expenses"
        description="Every transaction this month."
      />
      <ExpensesView
        expenses={rows}
        categories={categories ?? []}
        currency={profile?.currency ?? "USD"}
        locale={profile?.locale ?? "en-US"}
        recurringById={recurringById}
      />
    </div>
  );
}
