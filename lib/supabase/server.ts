import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabasePublicEnv();

  return createServerClient<Database>(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `cookies().set` throws when called from a Server Component.
            // Safe to ignore — the proxy will refresh the session next request.
          }
        },
      },
    },
  );
}
