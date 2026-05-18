/**
 * Money helpers. Everything is stored as integer cents.
 */
export function centsToNumber(cents: number): number {
  return cents / 100;
}

export function formatCurrency(
  cents: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(centsToNumber(cents));
}

export function formatCompactCurrency(
  cents: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(centsToNumber(cents));
}

export function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "").replace(/,/g, ".");
  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export function formatMonthLabel(
  isoMonth: string,
  locale: string = "en-US",
): string {
  const [y, m] = isoMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function isoMonthFromDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.max(0, (part / whole) * 100));
}
