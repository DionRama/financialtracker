"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { expenseSchema, importRowsSchema, type ImportRow } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function createExpense(input: unknown) {
  const data = expenseSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    category_id: data.category_id ?? null,
    amount_cents: data.amount_cents,
    occurred_at: data.occurred_at,
    note: data.note ?? null,
    tags: data.tags,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/analytics");
}

const updateSchema = expenseSchema.extend({ id: z.string().uuid() });

export async function updateExpense(input: unknown) {
  const data = updateSchema.parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("expenses")
    .update({
      category_id: data.category_id ?? null,
      amount_cents: data.amount_cents,
      occurred_at: data.occurred_at,
      note: data.note ?? null,
      tags: data.tags,
    })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/analytics");
}

export async function importExpenses(
  rows: ImportRow[],
): Promise<{ inserted: number; skipped: number }> {
  const parsed = importRowsSchema.parse(rows);
  const { supabase, user } = await requireUser();

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id);
  if (catErr) throw new Error(catErr.message);

  const catByName = new Map<string, string>();
  for (const c of categories ?? []) {
    catByName.set(c.name.toLowerCase(), c.id);
  }

  const payload = parsed.map((r) => ({
    user_id: user.id,
    category_id: r.category_name
      ? catByName.get(r.category_name.toLowerCase()) ?? null
      : null,
    amount_cents: r.amount_cents,
    occurred_at: r.date,
    note: r.note ?? null,
    tags: r.tags ?? [],
  }));

  if (payload.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  const { error, count } = await supabase
    .from("expenses")
    .insert(payload, { count: "exact" });
  if (error) throw new Error(error.message);

  const inserted = count ?? payload.length;
  revalidatePath("/expenses");
  revalidatePath("/dashboard");

  return { inserted, skipped: rows.length - inserted };
}

export async function deleteExpense(id: string) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/budgets");
  revalidatePath("/analytics");
}
