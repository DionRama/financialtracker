/**
 * Returns the input only when it is a safe relative path (starts with a
 * single `/` and does NOT start with `//` or `/\`), otherwise returns the
 * provided fallback.
 *
 * Prevents open-redirect attacks via `?next=` query parameters on auth
 * callback / confirm endpoints.
 */
export function safeRelativePath(input: string | null | undefined, fallback: string): string {
  if (!input) return fallback;
  if (typeof input !== "string") return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//") || input.startsWith("/\\")) return fallback;
  return input;
}
