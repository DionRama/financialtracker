import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Privileged Supabase client. Bypasses RLS — use only from trusted server
 * entry points (webhooks, cron, internal admin tools). Never imported,
 * directly or transitively, from a Client Component.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
