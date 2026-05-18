/**
 * Convert a `?month=YYYY-MM` query param to the start (inclusive) and end
 * (exclusive) ISO dates for that month, defaulting to the current month.
 */
export function monthBounds(param: string | undefined | null): {
  isoMonth: string;
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-based
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [y, m] = param.split("-").map(Number);
    year = y;
    month = (m ?? 1) - 1;
  }
  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 1));
  const isoStart = startDate.toISOString().slice(0, 10);
  const isoEnd = endDate.toISOString().slice(0, 10);
  return { isoMonth: isoStart, startDate: isoStart, endDate: isoEnd };
}

export function previousMonth(isoMonth: string): string {
  const [y, m] = isoMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 2, 1));
  return d.toISOString().slice(0, 10);
}
