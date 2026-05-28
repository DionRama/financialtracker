import "server-only";

import { createClient } from "@/lib/supabase/server";
import { clampStartDay } from "@/lib/period";

/**
 * Read the current user's `period_start_day` from `profiles`. Falls back to
 * 1 (calendar month) for unauthenticated callers or any read error — never
 * throws, so dashboards still render under partial failures.
 */
export async function getPeriodStartDay(): Promise<number> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 1;
    const { data } = await supabase
      .from("profiles")
      .select("period_start_day")
      .eq("id", user.id)
      .maybeSingle();
    return clampStartDay(data?.period_start_day ?? 1);
  } catch {
    return 1;
  }
}
