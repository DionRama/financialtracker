"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  goalContributionSchema,
  goalMoveSchema,
  savingsGoalSchema,
} from "@/lib/validation";

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
    emoji: data.emoji ?? null,
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
      emoji: data.emoji ?? null,
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

/**
 * Contribute to a goal (positive amount) or withdraw (negative amount).
 * Returns the inserted contribution's id so the UI can offer an Undo.
 */
export async function contributeToGoal(
  input: unknown,
): Promise<{ contribution_id: string; saved_cents: number }> {
  const data = goalContributionSchema.parse(input);
  const { supabase, user } = await requireUser();

  // RPC handles the insert + saved_cents update atomically.
  const { data: newSaved, error: rpcErr } = await supabase.rpc(
    "contribute_to_goal",
    {
      p_goal_id: data.goal_id,
      p_amount_cents: data.amount_cents,
      p_note: data.note ?? null,
    },
  );
  if (rpcErr) throw new Error(rpcErr.message);

  // Grab the row we just inserted to return its id for undo.
  const { data: row, error: selErr } = await supabase
    .from("goal_contributions")
    .select("id")
    .eq("user_id", user.id)
    .eq("goal_id", data.goal_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  revalidateGoals();
  return {
    contribution_id: row?.id ?? "",
    saved_cents: Number(newSaved ?? 0),
  };
}

export async function moveBetweenGoals(input: unknown) {
  const data = goalMoveSchema.parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("move_between_goals", {
    p_from: data.from_id,
    p_to: data.to_id,
    p_amount_cents: data.amount_cents,
    p_note: data.note ?? null,
  });
  if (error) throw new Error(error.message);
  revalidateGoals();
}

export async function deleteContribution(id: string) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_contribution", { p_id: id });
  if (error) throw new Error(error.message);
  revalidateGoals();
}
