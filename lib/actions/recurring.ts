"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sanitizeDbError } from "@/lib/supabase/error";
import { recurringRuleSchema } from "@/lib/validation";
import { getPeriodStartDay } from "@/lib/period-server";
import { periodBounds, periodOf } from "@/lib/period";

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
  if (error) throw sanitizeDbError(error, "recurring");
  try {
    await supabase.rpc("materialize_recurring");
  } catch {
    // best-effort: don't undo the create if backfill hiccups
  }
  revalidateRecurring();
}

const updateSchema = recurringRuleSchema.and(z.object({ id: z.string().uuid() }));

export async function updateRecurring(id: string, input: unknown) {
  const merged = { ...(input as object), id };
  const data = updateSchema.parse(merged);
  const { supabase, user } = await requireUser();

  // Preserve the rule's schedule cursor: editing other fields (amount,
  // description, vendor...) must NOT rewind next_run_date. Only when the
  // user actually moves start_date earlier (and the existing cursor is now
  // wrong) do we accept the incoming next_run_date.
  const { data: existing } = await supabase
    .from("recurring_rules")
    .select("next_run_date, start_date")
    .eq("id", data.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const startChanged = existing?.start_date !== data.start_date;
  const nextRunDate =
    existing && !startChanged ? existing.next_run_date : data.next_run_date;

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
      next_run_date: nextRunDate,
      is_paused: data.is_paused,
      is_subscription: data.is_subscription,
      vendor: data.vendor ?? null,
    })
    .eq("id", data.id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "recurring");

  // Propagate edits (amount, category/source, vendor, description) to any
  // already-materialized rows for the CURRENT period and forward. Past
  // periods are left untouched as historical ledger truth.
  const startDay = await getPeriodStartDay();
  const todayIso = new Date().toISOString().slice(0, 10);
  const periodStart = periodBounds(periodOf(todayIso, startDay), startDay).startDate;

  if (data.kind === "expense") {
    await supabase
      .from("expenses")
      .update({
        amount_cents: data.amount_cents,
        category_id: data.category_id ?? null,
        note: data.description ?? null,
      })
      .eq("recurring_id", data.id)
      .eq("user_id", user.id)
      .gte("occurred_at", periodStart);
  } else {
    await supabase
      .from("income_entries")
      .update({
        amount_cents: data.amount_cents,
        source_id: data.source_id ?? null,
        note: data.description ?? null,
      })
      .eq("recurring_id", data.id)
      .eq("user_id", user.id)
      .gte("received_at", periodStart);
  }

  // Do NOT call materialize_recurring here. The cursor is unchanged, so
  // re-running would either no-op or (if the cursor is in the past for any
  // reason) duplicate this period's entry. The protected layout's
  // best-effort materialize on next page load covers any legitimate past-due
  // catch-up.
  revalidateRecurring();
}

export async function togglePauseRecurring(id: string, paused: boolean) {
  z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("recurring_rules")
    .update({ is_paused: paused })
    .eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "recurring");
  revalidateRecurring();
}

export async function deleteRecurring(id: string) {
  z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();

  const startDay = await getPeriodStartDay();
  const todayIso = new Date().toISOString().slice(0, 10);
  const { startDate: monthStart, endDate: nextMonthStart } = periodBounds(
    periodOf(todayIso, startDay),
    startDay,
  );

  // Best-effort: remove this period's materialized entries before deleting the rule.
  await supabase
    .from("expenses")
    .delete()
    .eq("recurring_id", id)
    .gte("occurred_at", monthStart)
    .lt("occurred_at", nextMonthStart);
  await supabase
    .from("income_entries")
    .delete()
    .eq("recurring_id", id)
    .gte("received_at", monthStart)
    .lt("received_at", nextMonthStart);

  const { error } = await supabase
    .from("recurring_rules")
    .delete()
    .eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "recurring");
  revalidateRecurring();
}

function addCycle(date: Date, cadence: string, intervalCount: number): Date {
  const n = Math.max(1, intervalCount || 1);
  const d = new Date(date);
  switch (cadence) {
    case "daily":
      d.setDate(d.getDate() + n);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7 * n);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14 * n);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + n);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + n);
      break;
    default:
      d.setMonth(d.getMonth() + n);
  }
  return d;
}

export async function skipRecurringThisMonth(
  ruleId: string,
  expenseId: string,
) {
  z.string().uuid().parse(ruleId);
  z.string().uuid().parse(expenseId);
  const { supabase, user } = await requireUser();

  const { data: rule, error: ruleErr } = await supabase
    .from("recurring_rules")
    .select("id, cadence, interval_count, next_run_date, kind")
    .eq("id", ruleId).eq("user_id", user.id)
    .single();
  if (ruleErr) throw sanitizeDbError(ruleErr, "recurring");
  if (!rule) throw new Error("Recurring rule not found");

  const table = rule.kind === "income" ? "income_entries" : "expenses";
  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .eq("id", expenseId).eq("user_id", user.id);
  if (delErr) throw sanitizeDbError(delErr, "recurring");

  const base = new Date(rule.next_run_date);
  const advanced = addCycle(base, rule.cadence, rule.interval_count ?? 1);
  const advancedYmd = advanced.toISOString().slice(0, 10);

  const { error: updErr } = await supabase
    .from("recurring_rules")
    .update({ next_run_date: advancedYmd })
    .eq("id", ruleId).eq("user_id", user.id);
  if (updErr) throw sanitizeDbError(updErr, "recurring");

  revalidateRecurring();
}

export async function deleteRecurringExpenseEntry(expenseId: string) {
  z.string().uuid().parse(expenseId);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "recurring");
  revalidateRecurring();
}

export async function runRecurringNow() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.rpc("materialize_recurring");
  if (error) throw sanitizeDbError(error, "recurring");
  revalidateRecurring();
  return data ?? 0;
}
