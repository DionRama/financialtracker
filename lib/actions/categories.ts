"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { pickUniqueColor } from "@/lib/colors";
import { categorySchema } from "@/lib/validation";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

export async function createCategory(input: unknown) {
  const data = categorySchema.parse(input);
  const { supabase, user } = await requireUser();

  const { data: existing, error: fetchErr } = await supabase
    .from("categories")
    .select("color")
    .eq("user_id", user.id);
  if (fetchErr) throw new Error(fetchErr.message);

  const usedColors = (existing ?? []).map((c) => c.color);
  const color = pickUniqueColor(usedColors, data.name);

  const { error } = await supabase
    .from("categories")
    .insert({ name: data.name, color, user_id: user.id });
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  revalidatePath("/dashboard");
}

const updateSchema = categorySchema.extend({ id: z.string().uuid() });

export async function updateCategory(input: unknown) {
  const data = updateSchema.parse(input);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("categories")
    .update({ name: data.name })
    .eq("id", data.id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  revalidatePath("/dashboard");
}

export async function setCategoryArchived(id: string, archived: boolean) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("categories")
    .update({ is_archived: archived })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  z.string().uuid().parse(id);
  const { supabase } = await requireUser();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
