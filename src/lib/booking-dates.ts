import { Timestamp } from "firebase/firestore";

/** Inclusive calendar day range within a single month (1-based day numbers). */
export function calendarDayRangeToDates(
  year: number,
  monthIndex: number,
  startDay: number,
  endDay: number
): { startDate: Date; endDate: Date } {
  const lo = Math.min(startDay, endDay);
  const hi = Math.max(startDay, endDay);
  const startDate = new Date(year, monthIndex, lo, 0, 0, 0, 0);
  const endDate = new Date(year, monthIndex, hi, 23, 59, 59, 999);
  return { startDate, endDate };
}

export function calendarDayRangeToTimestamps(
  year: number,
  monthIndex: number,
  startDay: number,
  endDay: number
): { startDate: Timestamp; endDate: Timestamp } {
  const { startDate, endDate } = calendarDayRangeToDates(year, monthIndex, startDay, endDay);
  return {
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
  };
}

export function formatBookingDateRange(start: Date, end: Date): string {
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

export function timestampToDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  return null;
}
