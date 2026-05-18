/**
 * Resolve the Supabase URL + public key for browser/SSR clients.
 *
 * Per Supabase's 2025 API key rotation:
 *   - The new, preferred key is the **publishable key** (`sb_publishable_...`).
 *   - The legacy `anon` JWT key is kept for backward compatibility.
 *
 * Skill source: `.agents/skills/supabase/SKILL.md` §6 — "Prefer publishable
 * keys for frontend code. Legacy `anon` keys are only for compatibility."
 *
 * We prefer the publishable key when set and fall back to the anon key so
 * existing deployments keep working without redeploying.
 */
/**
 * Public site URL used to build absolute redirect URLs (e.g. OAuth callbacks).
 * Required so redirects don't accidentally rely on `window.location.origin`,
 * which can be wrong behind proxies or in non-browser contexts.
 */
function resolveSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not configured. Set it in .env.local " +
        "(e.g. http://localhost:3000).",
    );
  }
  return url;
}

export const SITE_URL: string = resolveSiteUrl();

export function getSupabasePublicEnv(): {
  url: string;
  key: string;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }
  return { url, key };
}
