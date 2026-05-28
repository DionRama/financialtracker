import { clampStartDay, periodBounds, periodOf, previousPeriod } from "@/lib/period";

/**
 * Convert a `?month=YYYY-MM` query param to the start (inclusive) and end
 * (exclusive) ISO dates for that PERIOD, defaulting to the current period.
 *
 * The semantics are now period-aware: when the user's `period_start_day` is
 * not 1, the start/end dates will straddle a calendar boundary. Pass the
 * user's `period_start_day` (1-28). Defaults to 1 for backwards compatibility
 * (= classic calendar month).
 */
export function monthBounds(
  param: string | undefined | null,
  periodStartDay: number = 1,
): {
  isoMonth: string;
  startDate: string;
  endDate: string;
} {
  const startDay = clampStartDay(periodStartDay);
  let isoMonth: string;
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    isoMonth = `${param}-01`;
  } else {
    const today = new Date();
    const todayIso = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
      2,
      "0",
    )}-${String(today.getUTCDate()).padStart(2, "0")}`;
    isoMonth = periodOf(todayIso, startDay);
  }
  const { startDate, endDate } = periodBounds(isoMonth, startDay);
  return { isoMonth, startDate, endDate };
}

/** Previous period key (pure month shift since keys are always YYYY-MM-01). */
export function previousMonth(isoMonth: string): string {
  return previousPeriod(isoMonth);
}
