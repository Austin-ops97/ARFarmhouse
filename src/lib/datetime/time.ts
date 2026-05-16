import { Timestamp } from "firebase/firestore";

/** Default locale for family-facing date/time labels (device local timezone). */
export const APP_LOCALE = "en-US";

export function now(): Date {
  return new Date();
}

export function nowTimestamp(): Timestamp {
  return Timestamp.now();
}

export function timestampFromDate(date: Date = now()): Timestamp {
  return Timestamp.fromDate(date);
}

export function timestampToDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate();
  }
  return null;
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Inclusive calendar day range within a single month (1-based day numbers, local timezone). */
export function calendarDayRangeToDates(
  year: number,
  monthIndex: number,
  startDay: number,
  endDay: number
): { startDate: Date; endDate: Date } {
  const lo = Math.min(startDay, endDay);
  const hi = Math.max(startDay, endDay);
  return {
    startDate: startOfLocalDay(new Date(year, monthIndex, lo)),
    endDate: endOfLocalDay(new Date(year, monthIndex, hi)),
  };
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

export function formatLocalDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
): string {
  return date.toLocaleDateString(APP_LOCALE, options);
}

export function formatLocalDateTime(date: Date): string {
  return date.toLocaleString(APP_LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLocalDateRange(start: Date, end: Date): string {
  const startLabel = formatLocalDate(start, { month: "short", day: "numeric" });
  const endLabel = formatLocalDate(end, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

/** @deprecated Use formatLocalDateRange */
export const formatBookingDateRange = formatLocalDateRange;
