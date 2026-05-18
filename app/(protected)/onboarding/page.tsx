import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/common/page-header";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { count: expensesCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("currency, locale, monthly_income_cents")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true }),
  ]);

  if ((profile?.monthly_income_cents ?? 0) > 0 || (expensesCount ?? 0) > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Welcome to Financial Tracker"
        description="Three quick steps so the dashboard makes sense from day one."
      />
      <OnboardingForm
        initial={{
          currency: profile?.currency ?? "USD",
          locale: profile?.locale ?? "en-US",
        }}
      />
    </div>
  );
}
