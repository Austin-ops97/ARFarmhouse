/** Inclusive date-range overlap (local timezone). */
export function dateRangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

/** Clips a booking range to day numbers within a calendar month (1-based). */
export function clipRangeToMonthDays(
  rangeStart: Date,
  rangeEnd: Date,
  year: number,
  monthIndex: number,
  daysInMonth: number
): { startDay: number; endDay: number } | null {
  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIndex, daysInMonth, 23, 59, 59, 999);
  if (!dateRangesOverlap(rangeStart, rangeEnd, monthStart, monthEnd)) return null;

  const clipStart = rangeStart < monthStart ? monthStart : rangeStart;
  const clipEnd = rangeEnd > monthEnd ? monthEnd : rangeEnd;
  return {
    startDay: clipStart.getDate(),
    endDay: clipEnd.getDate(),
  };
}
