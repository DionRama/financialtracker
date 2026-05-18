"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { recurringRuleSchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function revalidateRecurring() {
  revalidatePath("/recurring");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  revalidatePath("/income");
}

export async function createRecurring(input: unknown) {
  const data = recurringRuleSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("recurring_rules").insert({
    user_id: user.id,
    kind: data.kind,
    category_id: data.kind === "expense" ? data.category_id ?? null : null,
    source_id: data.kind === "income" ? data.source_id ?? null : null,
    amount_cents: data.amount_cents,
    currency: data.currency,
    description: data.description ?? null,
    cadence: data.cadence,
    interval_count: data.interval_count,
    day_of_month: data.day_of_month ?? null,
    weekday: data.weekday ?? null,
    start_date: data.start_date,
    end_date: data.end_date ?? null,
    next_run_date: data.next_run_date,
    is_paused: data.is_paused,
    is_subscription: data.is_subscription,
    vendor: data.vendor ?? null,
  });
  if (error) throw new Error(error.message);
  revalidateRecurring();
}

const updateSchema = recurringRuleSchema.and(z.object({ id: z.string().uuid() }));

export async function updateRecurring(id: string, input: unknown) {
  const merged = { ...(input as object), id };
  const data = updateSchema.parse(merged);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("recurring_rules")
    .update({
      kind: data.kind,
      category_id: data.kind === "expense" ? data.category_id ?? null : null,
      source_id: data.kind === "income" ? data.source_id ?? null : null,
      amount_cents: data.amount_cents,
      currency: data.currency,
      description: data.description ?? null,
      cadence: data.cadence,
      interval_count: data.interval_count,
      day_of_month: data.day_of_month ?? null,
      weekday: data.weekday ?? null,
      start_date: data.start_date,
      end_date: data.end_date ?? null,
      next_run_date: data.next_run_date,
      is_paused: data.is_paused,
      is_subscription: data.is_subscription,
      vendor: data.vendor ?? null,
    })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  revalidateRecurring();
}

export async function togglePauseRecurring(id: string, paused: boolean) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("recurring_rules")
    .update({ is_paused: paused })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateRecurring();
}

export async function deleteRecurring(id: string) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateRecurring();
}

export async function runRecurringNow() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("materialize_recurring");
  if (error) throw new Error(error.message);
  revalidateRecurring();
  return data ?? 0;
}
