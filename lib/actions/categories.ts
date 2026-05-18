"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sanitizeDbError } from "@/lib/supabase/error";
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
  const parsed = categorySchema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .rpc("create_category_with_color", { p_name: parsed.name })
    .single();
  if (error) throw sanitizeDbError(error, "categories");
  revalidatePath("/categories");
  revalidatePath("/dashboard");
}

const updateSchema = categorySchema.extend({ id: z.string().uuid() });

export async function updateCategory(input: unknown) {
  const data = updateSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("categories")
    .update({ name: data.name })
    .eq("id", data.id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "categories");
  revalidatePath("/categories");
  revalidatePath("/dashboard");
}

export async function setCategoryArchived(id: string, archived: boolean) {
  z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("categories")
    .update({ is_archived: archived })
    .eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "categories");
  revalidatePath("/categories");
}

export async function deleteCategory(id: string) {
  z.string().uuid().parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "categories");
  revalidatePath("/categories");
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
}
