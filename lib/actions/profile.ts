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
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.full_name ?? null,
      currency: data.currency,
      locale: data.locale,
    })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function deleteAllUserData() {
  const { supabase, user } = await requireUser();
  // RLS limits these to the current user.
  await supabase.from("expenses").delete().eq("user_id", user.id);
  await supabase.from("budgets").delete().eq("user_id", user.id);
  await supabase.from("categories").delete().eq("user_id", user.id);
  revalidatePath("/", "layout");
}
