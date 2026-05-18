import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

type DbErrorLike =
  | PostgrestError
  | { message: string; code?: string | null; details?: string | null; hint?: string | null };

const USER_MESSAGES: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "Cannot complete this action because related records depend on it.",
  "23514": "Some values are not allowed. Please check your input.",
  "22P02": "Invalid value provided.",
  "PGRST116": "Record not found.",
  "PGRST301": "You do not have permission to perform this action.",
  "42501": "You do not have permission to perform this action.",
};

/**
 * Convert a raw Supabase / Postgrest error into a user-safe Error.
 *
 * - The original error is logged server-side with the supplied context so
 *   debugging info is preserved.
 * - The thrown Error message is a generic, user-facing string. Raw
 *   Postgres messages (which can contain schema/column names, constraint
 *   identifiers, or PII) are never surfaced to the client.
 */
export function sanitizeDbError(error: DbErrorLike, context: string): Error {
  const code = (error as { code?: string | null }).code ?? "";
  console.error(`[db:${context}]`, {
    code,
    message: error.message,
    details: (error as { details?: string | null }).details ?? undefined,
    hint: (error as { hint?: string | null }).hint ?? undefined,
  });

  const friendly = USER_MESSAGES[code] ?? "Something went wrong. Please try again.";
  return new Error(friendly);
}
