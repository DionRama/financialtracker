"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
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
  } = {
    full_name: data.full_name ?? null,
    currency: data.currency,
    locale: data.locale,
  };
  if (data.monthly_income_cents !== undefined) {
    update.monthly_income_cents = data.monthly_income_cents;
  }
  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteAllUserData() {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_all_user_data");
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
