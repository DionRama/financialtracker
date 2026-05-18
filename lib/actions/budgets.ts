"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
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
  if (error) throw new Error(error.message);
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
}

export async function deleteBudget(id: string) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw new Error(error.message);
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
  if (fetchErr) throw new Error(fetchErr.message);
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
  if (error) throw new Error(error.message);

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return rows.length;
}
