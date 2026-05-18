"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validation";

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
