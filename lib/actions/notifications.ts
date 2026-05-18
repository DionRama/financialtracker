"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { sanitizeDbError } from "@/lib/supabase/error";
import type { Json } from "@/types/database";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

const uuid = z.string().uuid();

export async function markRead(id: string) {
  uuid.parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "notifications");
  revalidatePath("/dashboard");
}

export async function markAllRead() {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw sanitizeDbError(error, "notifications");
  revalidatePath("/dashboard");
}

export async function dismissNotification(id: string) {
  uuid.parse(id);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id).eq("user_id", user.id);
  if (error) throw sanitizeDbError(error, "notifications");
  revalidatePath("/dashboard");
}

const upsertSchema = z.object({
  kind: z.string().min(1).max(60),
  payload: z.record(z.string(), z.unknown()).default({}),
  severity: z.enum(["info", "warning", "critical"]).default("info"),
  dedupe_key: z.string().min(1),
});

export async function upsertNotification(input: {
  kind: string;
  payload: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
  dedupe_key: string;
}): Promise<void> {
  const data = upsertSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notifications")
    .upsert(
      {
        user_id: user.id,
        kind: data.kind,
        payload: data.payload as Json,
        severity: data.severity,
        dedupe_key: data.dedupe_key,
      },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    );
  if (error) throw sanitizeDbError(error, "notifications");
  revalidatePath("/dashboard");
}
