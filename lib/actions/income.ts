"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sanitizeDbError } from "@/lib/supabase/error";
import { incomeEntrySchema, incomeSourceSchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function revalidateIncome() {
  revalidatePath("/income");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Income sources
// ---------------------------------------------------------------------------
export async function addIncomeSource(input: unknown) {
  const data = incomeSourceSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("income_sources").insert({
    user_id: user.id,
    name: data.name,
    kind: data.kind,
    default_amount_cents: data.default_amount_cents,
    currency: data.currency,
    is_active: data.is_active,
  });
  if (error) throw sanitizeDbError(error, "income");
  revalidateIncome();
  revalidatePath("/settings");
}

const sourceUpdateSchema = incomeSourceSchema.extend({ id: z.string().uuid() });

export async function updateIncomeSource(id: string, input: unknown) {
  const data = sourceUpdateSchema.parse({ ...(input as object), id });
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("income_sources")
    .update({
      name: data.name,
      kind: data.kind,
      default_amount_cents: data.default_amount_cents,
      currency: data.currency,
      is_active: data.is_active,
    })
    .eq("id", data.id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "income");
  revalidateIncome();
  revalidatePath("/settings");
}

export async function archiveIncomeSource(id: string) {
  z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("income_sources")
    .update({ is_active: false })
    .eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "income");
  revalidateIncome();
  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Income entries
// ---------------------------------------------------------------------------
export async function addIncomeEntry(input: unknown) {
  const data = incomeEntrySchema.parse(input);
  const { supabase, user } = await requireUser();
  const appliesTo =
    data.applies_to_month ?? `${data.received_at.slice(0, 7)}-01`;
  const { error } = await supabase.from("income_entries").insert({
    user_id: user.id,
    source_id: data.source_id ?? null,
    amount_cents: data.amount_cents,
    received_at: data.received_at,
    applies_to_month: appliesTo,
    note: data.note ?? null,
  });
  if (error) throw sanitizeDbError(error, "income");
  revalidateIncome();
}

const entryUpdateSchema = incomeEntrySchema.extend({ id: z.string().uuid() });

export async function updateIncomeEntry(id: string, input: unknown) {
  const data = entryUpdateSchema.parse({ ...(input as object), id });
  const appliesTo =
    data.applies_to_month ?? `${data.received_at.slice(0, 7)}-01`;
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("income_entries")
    .update({
      source_id: data.source_id ?? null,
      amount_cents: data.amount_cents,
      received_at: data.received_at,
      applies_to_month: appliesTo,
      note: data.note ?? null,
    })
    .eq("id", data.id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "income");
  revalidateIncome();
}

export async function deleteIncomeEntry(id: string) {
  z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("income_entries")
    .delete()
    .eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "income");
  revalidateIncome();
}
