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
    period_start_day?: number;
  } = {
    full_name: data.full_name ?? null,
    currency: data.currency,
    locale: data.locale,
  };
  if (data.monthly_income_cents !== undefined) {
    update.monthly_income_cents = data.monthly_income_cents;
  }
  let recomputePeriods = false;
  if (data.period_start_day !== undefined) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("period_start_day")
      .eq("id", user.id)
      .maybeSingle();
    if ((existing?.period_start_day ?? 1) !== data.period_start_day) {
      update.period_start_day = data.period_start_day;
      recomputePeriods = true;
    }
  }
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) throw sanitizeDbError(error, "profile");
  if (recomputePeriods && data.period_start_day !== undefined) {
    // Re-bucket every income entry under the new pay cycle. RLS scopes to
    // the calling user via auth.uid().
    const { error: rpcErr } = await supabase.rpc("recompute_income_periods", {
      p_start_day: data.period_start_day,
    });
    if (rpcErr) throw sanitizeDbError(rpcErr, "profile");
  }
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
