"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { goalContributionSchema, savingsGoalSchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function revalidateGoals() {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export async function createGoal(input: unknown) {
  const data = savingsGoalSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name: data.name,
    target_cents: data.target_cents,
    deadline: data.deadline ?? null,
    color: data.color,
    is_archived: data.is_archived,
  });
  if (error) throw new Error(error.message);
  revalidateGoals();
}

const updateSchema = savingsGoalSchema.extend({ id: z.string().uuid() });

export async function updateGoal(id: string, input: unknown) {
  const data = updateSchema.parse({ ...(input as object), id });
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("savings_goals")
    .update({
      name: data.name,
      target_cents: data.target_cents,
      deadline: data.deadline ?? null,
      color: data.color,
      is_archived: data.is_archived,
    })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  revalidateGoals();
}

export async function archiveGoal(id: string) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("savings_goals")
    .update({ is_archived: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGoals();
}

export async function deleteGoal(id: string) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateGoals();
}

export async function contributeToGoal(input: unknown) {
  const data = goalContributionSchema.parse(input);
  const { supabase } = await requireUser();

  // Read-modify-write within RLS scope. Single round-trip would need an RPC;
  // doing it in two steps still respects RLS because the update WHERE id=...
  // is constrained by row-level policy (user_id must match auth.uid()).
  const { data: row, error: readErr } = await supabase
    .from("savings_goals")
    .select("saved_cents")
    .eq("id", data.goal_id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!row) throw new Error("Goal not found");

  const { error } = await supabase
    .from("savings_goals")
    .update({ saved_cents: row.saved_cents + data.amount_cents })
    .eq("id", data.goal_id);
  if (error) throw new Error(error.message);
  revalidateGoals();
}
