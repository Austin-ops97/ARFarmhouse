/** Mirror of src/lib/routine-schedule.ts for Cloud Functions (keep in sync). */

export type RoutineIntervalUnit = "days" | "weeks" | "months" | "years" | "quarterly";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addMonthsClampDay(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  return new Date(targetYear, normalizedMonth, Math.min(day, lastDay), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

export function calculateNextRunDate(
  currentDate: Date,
  intervalValue: number,
  intervalUnit: RoutineIntervalUnit
): Date {
  if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
    throw new Error("intervalValue must be a positive number");
  }
  const base = new Date(currentDate);
  if (Number.isNaN(base.getTime())) throw new Error("Invalid date");

  switch (intervalUnit) {
    case "days":
      return new Date(base.getTime() + intervalValue * MS_PER_DAY);
    case "weeks":
      return new Date(base.getTime() + intervalValue * 7 * MS_PER_DAY);
    case "months":
      return addMonthsClampDay(base, intervalValue);
    case "quarterly":
      return addMonthsClampDay(base, intervalValue * 3);
    case "years": {
      const next = new Date(base);
      const month = base.getMonth();
      const day = base.getDate();
      next.setFullYear(base.getFullYear() + intervalValue);
      if (month === 1 && day === 29) {
        const lastFeb = new Date(next.getFullYear(), 2, 0).getDate();
        next.setMonth(1, Math.min(day, lastFeb));
      }
      return next;
    }
    default:
      throw new Error(`Unknown interval unit: ${intervalUnit as string}`);
  }
}

export function advanceNextRunPastDue(
  dueAt: Date,
  intervalValue: number,
  intervalUnit: RoutineIntervalUnit,
  now: Date = new Date()
): Date {
  let next = new Date(dueAt);
  let guard = 0;
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  while (next.getTime() <= cutoff && guard < 500) {
    next = calculateNextRunDate(next, intervalValue, intervalUnit);
    guard++;
  }
  if (guard >= 500) throw new Error("Could not advance next run date");
  return next;
}

export function routineGeneratedTaskId(routineId: string, dueAtMs: number): string {
  return `routine_${routineId}_${dueAtMs}`;
}
