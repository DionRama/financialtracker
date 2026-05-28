/**
 * Custom pay-cycle periods.
 *
 * A "period" is the user's budget window. For a calendar user (start day = 1)
 * a period is exactly a calendar month. For a user paid on day 26 with start
 * day = 26, the period labeled `2026-06-01` covers `2026-05-26` … `2026-06-26`
 * (inclusive start, exclusive end).
 *
 * The period key is `YYYY-MM-01` — the first day of the calendar month the
 * period ends in. This matches the existing `income_entries.applies_to_month`
 * schema, so no data migration is needed when start day = 1.
 *
 * Mirrors the Postgres `public.period_of(date, smallint)` function in
 * `supabase/migrations/0002_period_start_day.sql`. Keep these in sync.
 */

const PAD = (n: number) => String(n).padStart(2, "0");

export const MIN_PERIOD_START_DAY = 1;
export const MAX_PERIOD_START_DAY = 28;

export function clampStartDay(day: number | null | undefined): number {
  if (!day || !Number.isFinite(day)) return 1;
  const n = Math.trunc(day);
  if (n < MIN_PERIOD_START_DAY) return MIN_PERIOD_START_DAY;
  if (n > MAX_PERIOD_START_DAY) return MAX_PERIOD_START_DAY;
  return n;
}

/**
 * Return the period key (YYYY-MM-01) the given ISO date belongs to.
 *
 *   periodOf("2026-05-28", 26) → "2026-06-01"
 *   periodOf("2026-05-25", 26) → "2026-05-01"
 *   periodOf("2026-05-15", 1)  → "2026-05-01"
 */
export function periodOf(dateIso: string, startDay: number): string {
  const sd = clampStartDay(startDay);
  const year = Number(dateIso.slice(0, 4));
  const month = Number(dateIso.slice(5, 7)); // 1-12
  const day = Number(dateIso.slice(8, 10));
  let py = year;
  let pm = month;
  if (day >= sd) {
    pm += 1;
    if (pm > 12) {
      pm = 1;
      py += 1;
    }
  }
  return `${py}-${PAD(pm)}-01`;
}

/**
 * Return inclusive start and exclusive end ISO dates for a period.
 *
 *   periodBounds("2026-06-01", 26) → { startDate: "2026-05-26", endDate: "2026-06-26" }
 *   periodBounds("2026-06-01", 1)  → { startDate: "2026-06-01", endDate: "2026-07-01" }
 */
export function periodBounds(
  periodKey: string,
  startDay: number,
): { startDate: string; endDate: string } {
  const sd = clampStartDay(startDay);
  const py = Number(periodKey.slice(0, 4));
  const pm = Number(periodKey.slice(5, 7)); // 1-12
  // End = first day of period-key month + (startDay - 1) days, but easier as:
  // For startDay = 1, start = first of month (pm), end = first of next.
  // For startDay > 1, start = startDay of previous month, end = startDay of pm.
  if (sd === 1) {
    const startDate = `${py}-${PAD(pm)}-01`;
    const ny = pm === 12 ? py + 1 : py;
    const nm = pm === 12 ? 1 : pm + 1;
    const endDate = `${ny}-${PAD(nm)}-01`;
    return { startDate, endDate };
  }
  const prevY = pm === 1 ? py - 1 : py;
  const prevM = pm === 1 ? 12 : pm - 1;
  const startDate = `${prevY}-${PAD(prevM)}-${PAD(sd)}`;
  const endDate = `${py}-${PAD(pm)}-${PAD(sd)}`;
  return { startDate, endDate };
}

/** Previous period key. Pure calendar shift since keys are always YYYY-MM-01. */
export function previousPeriod(periodKey: string): string {
  const y = Number(periodKey.slice(0, 4));
  const m = Number(periodKey.slice(5, 7));
  const pm = m === 1 ? 12 : m - 1;
  const py = m === 1 ? y - 1 : y;
  return `${py}-${PAD(pm)}-01`;
}

/** Next period key. */
export function nextPeriod(periodKey: string): string {
  const y = Number(periodKey.slice(0, 4));
  const m = Number(periodKey.slice(5, 7));
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${PAD(nm)}-01`;
}

/** First day of the month the date is in (YYYY-MM-01). Util kept for legacy income code. */
export function firstOfMonth(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

/**
 * Format a period key for display. When startDay = 1, returns just the month
 * name ("June 2026"). Otherwise includes the range ("June 2026 (May 26 – Jun 25)").
 */
export function formatPeriodLabel(
  periodKey: string,
  startDay: number,
  locale: string,
): string {
  const sd = clampStartDay(startDay);
  const monthLabel = new Date(`${periodKey.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  if (sd === 1) return monthLabel;
  const { startDate, endDate } = periodBounds(periodKey, sd);
  // endDate is exclusive — show the previous day.
  const endY = Number(endDate.slice(0, 4));
  const endM = Number(endDate.slice(5, 7));
  const endD = Number(endDate.slice(8, 10));
  const endInclusive = new Date(Date.UTC(endY, endM - 1, endD));
  endInclusive.setUTCDate(endInclusive.getUTCDate() - 1);
  const startD = new Date(`${startDate}T00:00:00Z`);
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${monthLabel} (${fmt(startD)} – ${fmt(endInclusive)})`;
}

/** Short range label, e.g. "May 26 – Jun 25". */
export function formatPeriodRange(
  periodKey: string,
  startDay: number,
  locale: string,
): string {
  const sd = clampStartDay(startDay);
  if (sd === 1) {
    return new Date(`${periodKey.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const { startDate, endDate } = periodBounds(periodKey, sd);
  const endY = Number(endDate.slice(0, 4));
  const endM = Number(endDate.slice(5, 7));
  const endD = Number(endDate.slice(8, 10));
  const endInclusive = new Date(Date.UTC(endY, endM - 1, endD));
  endInclusive.setUTCDate(endInclusive.getUTCDate() - 1);
  const startD = new Date(`${startDate}T00:00:00Z`);
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(startD)} – ${fmt(endInclusive)}`;
}
