"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { suggestBudgets } from "@/lib/actions/budgets";

const onboardSchema = z.object({
  currency: z.string().length(3).toUpperCase(),
  locale: z.string().min(2).max(20),
  monthly_income_cents: z.coerce.number().int().nonnegative().max(1_000_000_000_000),
  suggest_budgets: z.boolean(),
});

export async function completeOnboarding(input: unknown) {
  const data = onboardSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({
      currency: data.currency,
      locale: data.locale,
      monthly_income_cents: data.monthly_income_cents || null,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  if (data.suggest_budgets && data.monthly_income_cents > 0) {
    const now = new Date();
    const isoMonth = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1,
    ).padStart(2, "0")}-01`;
    await suggestBudgets(isoMonth, data.monthly_income_cents);
  }

  revalidatePath("/", "layout");
}
