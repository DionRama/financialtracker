import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { GoalsView, type GoalRow } from "@/components/goals/goals-view";

export const metadata = { title: "Savings goals" };

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: goals }, { data: profile }] = await Promise.all([
    supabase
      .from("savings_goals")
      .select("id, name, target_cents, saved_cents, deadline, color")
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("currency, locale")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Savings goals"
        description="Track progress toward what matters."
      />
      <GoalsView
        goals={(goals ?? []) as GoalRow[]}
        currency={profile?.currency ?? "USD"}
        locale={profile?.locale ?? "en-US"}
      />
    </div>
  );
}
