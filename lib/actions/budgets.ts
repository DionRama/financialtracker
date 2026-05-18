"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sanitizeDbError } from "@/lib/supabase/error";
import { budgetSchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function upsertBudget(input: unknown) {
  const data = budgetSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: user.id,
        category_id: data.category_id,
        month: data.month,
        amount_cents: data.amount_cents,
      },
      { onConflict: "user_id,category_id,month" },
    );
  if (error) throw sanitizeDbError(error, "budgets");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function deleteBudget(id: string) {
  z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "budgets");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function copyBudgetsFromPreviousMonth(targetMonth: string) {
  z.string().regex(/^\d{4}-\d{2}-01$/).parse(targetMonth);
  const { supabase, user } = await requireUser();

  const [y, m] = targetMonth.split("-").map(Number);
  const prev = new Date(Date.UTC(y, (m ?? 1) - 2, 1));
  const prevMonth = `${prev.getUTCFullYear()}-${String(
    prev.getUTCMonth() + 1,
  ).padStart(2, "0")}-01`;

  const { data: previous, error: fetchErr } = await supabase
    .from("budgets")
    .select("category_id, amount_cents")
    .eq("user_id", user.id)
    .eq("month", prevMonth);
  if (fetchErr) throw sanitizeDbError(fetchErr, "budgets");
  if (!previous || previous.length === 0) return 0;

  const rows = previous.map((b) => ({
    user_id: user.id,
    category_id: b.category_id,
    month: targetMonth,
    amount_cents: b.amount_cents,
  }));
  const { error } = await supabase
    .from("budgets")
    .upsert(rows, { onConflict: "user_id,category_id,month" });
  if (error) throw sanitizeDbError(error, "budgets");

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return rows.length;
}

// ----------------------------------------------------------------------------
// Smart budgets
// ----------------------------------------------------------------------------
const monthRe = /^\d{4}-\d{2}-01$/;

function monthOffset(isoMonth: string, deltaMonths: number): string {
  const [y, m] = isoMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1 + deltaMonths, 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Returns per-category mean spend (in cents, rounded) over the last 3 full
 * months ending at (but not including) targetMonth.
 */
export async function suggestBudgetsFromLast3Months(targetMonth: string) {
  z.string().regex(monthRe).parse(targetMonth);
  const { supabase, user } = await requireUser();

  const startIso = monthOffset(targetMonth, -3);
  const endIso = targetMonth;

  const { data: rows, error } = await supabase
    .from("expenses")
    .select("category_id, amount_cents")
    .eq("user_id", user.id)
    .gte("occurred_at", startIso)
    .lt("occurred_at", endIso);
  if (error) throw sanitizeDbError(error, "budgets");

  const totals = new Map<string, number>();
  for (const r of rows ?? []) {
    if (!r.category_id) continue;
    totals.set(r.category_id, (totals.get(r.category_id) ?? 0) + r.amount_cents);
  }
  const suggestions = Array.from(totals, ([category_id, total]) => ({
    category_id,
    amount_cents: Math.round(total / 3),
  })).filter((s) => s.amount_cents > 0);
  return suggestions;
}

/**
 * Distributes `incomeCents` proportionally to last-3-months average spend
 * per category. Returns suggested amounts (caller confirms then applies via
 * `applyBudgetSuggestions`).
 */
export async function autoBalanceBudgetsToIncome(
  targetMonth: string,
  incomeCents: number,
) {
  z.string().regex(monthRe).parse(targetMonth);
  z.number().int().positive().parse(incomeCents);

  const suggestions = await suggestBudgetsFromLast3Months(targetMonth);
  const total = suggestions.reduce((s, r) => s + r.amount_cents, 0);
  if (total === 0) return suggestions;
  return suggestions.map((s) => ({
    category_id: s.category_id,
    amount_cents: Math.round((s.amount_cents / total) * incomeCents),
  }));
}

const applySchema = z.object({
  month: z.string().regex(monthRe),
  rows: z
    .array(
      z.object({
        category_id: z.string().uuid(),
        amount_cents: z.coerce.number().int().nonnegative().max(1_000_000_000_000),
      }),
    )
    .max(200),
});

export async function applyBudgetSuggestions(input: unknown) {
  const data = applySchema.parse(input);
  const { supabase, user } = await requireUser();
  if (data.rows.length === 0) return 0;
  const rows = data.rows.map((r) => ({
    user_id: user.id,
    category_id: r.category_id,
    month: data.month,
    amount_cents: r.amount_cents,
  }));
  const { error } = await supabase
    .from("budgets")
    .upsert(rows, { onConflict: "user_id,category_id,month" });
  if (error) throw sanitizeDbError(error, "budgets");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return rows.length;
}

/**
 * Creates evenly-distributed budgets across all active categories for the
 * given month, summing to `incomeCents`. Used by onboarding.
 */
export async function suggestBudgets(
  targetMonth: string,
  incomeCents: number,
) {
  z.string().regex(monthRe).parse(targetMonth);
  z.number().int().nonnegative().parse(incomeCents);
  const { supabase, user } = await requireUser();

  const { data: cats, error: catsErr } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_archived", false);
  if (catsErr) throw sanitizeDbError(catsErr, "budgets");
  const list = cats ?? [];
  if (list.length === 0 || incomeCents <= 0) return 0;

  const per = Math.floor(incomeCents / list.length);
  const rows = list.map((c) => ({
    user_id: user.id,
    category_id: c.id,
    month: targetMonth,
    amount_cents: per,
  }));
  const { error } = await supabase
    .from("budgets")
    .upsert(rows, { onConflict: "user_id,category_id,month" });
  if (error) throw sanitizeDbError(error, "budgets");
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return rows.length;
}
