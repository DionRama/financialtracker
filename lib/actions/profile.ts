"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { sanitizeDbError } from "@/lib/supabase/error";
import { profileSchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function updateProfile(input: unknown) {
  const data = profileSchema.parse(input);
  const { supabase, user } = await requireUser();
  const update: {
    full_name: string | null;
    currency: string;
    locale: string;
    monthly_income_cents?: number | null;
  } = {
    full_name: data.full_name ?? null,
    currency: data.currency,
    locale: data.locale,
  };
  if (data.monthly_income_cents !== undefined) {
    update.monthly_income_cents = data.monthly_income_cents;
  }
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) throw sanitizeDbError(error, "profile");
  revalidatePath("/", "layout");
}

export async function deleteAllUserData() {
  const { supabase, user } = await requireUser();
  // Delete in dependency-safe order. RLS limits each delete to the caller's
  // rows; we also pin user_id for defense-in-depth. We deliberately KEEP:
  //   - profiles (account settings / display name / monthly_income_cents)
  //   - categories (so the user's custom taxonomy survives a reset)
  const tables = [
    "goal_contributions",
    "expenses",
    "income_entries",
    "savings_goals",
    "recurring_rules",
    "budgets",
    "notifications",
    "income_sources",
  ] as const;
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", user.id);
    if (error) throw sanitizeDbError(error, "profile");
  }
  revalidatePath("/", "layout");
}
