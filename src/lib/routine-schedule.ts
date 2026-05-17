export type RoutineIntervalUnit = "days" | "weeks" | "months" | "years" | "quarterly";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Add calendar months while clamping day-of-month (Jan 31 + 1 month → Feb 28/29). */
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

function assertPositiveInterval(intervalValue: number) {
  if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
    throw new Error("intervalValue must be a positive number");
  }
}

function assertValidDate(date: Date) {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
}

/**
 * Deterministic next occurrence from `currentDate` (exclusive anchor — result is strictly after anchor
 * when used in a loop from a due date that has passed).
 */
export function calculateNextRunDate(
  currentDate: Date,
  intervalValue: number,
  intervalUnit: RoutineIntervalUnit
): Date {
  assertPositiveInterval(intervalValue);
  const base = new Date(currentDate);
  assertValidDate(base);

  switch (intervalUnit) {
    case "days": {
      const next = new Date(base.getTime() + intervalValue * MS_PER_DAY);
      return next;
    }
    case "weeks": {
      const next = new Date(base.getTime() + intervalValue * 7 * MS_PER_DAY);
      return next;
    }
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
    default: {
      const _exhaustive: never = intervalUnit;
      throw new Error(`Unknown interval unit: ${_exhaustive}`);
    }
  }
}

/** First scheduled run on or after `startDate`; if start is in the past, advances to the next future slot. */
export function resolveInitialNextRunAt(
  startDate: Date,
  intervalValue: number,
  intervalUnit: RoutineIntervalUnit,
  now: Date = new Date()
): Date {
  assertValidDate(startDate);
  let next = startOfDay(startDate);
  const today = startOfDay(now);
  if (next.getTime() > today.getTime()) return next;

  let guard = 0;
  while (next.getTime() <= today.getTime() && guard < 500) {
    next = calculateNextRunDate(next, intervalValue, intervalUnit);
    guard++;
  }
  if (guard >= 500) throw new Error("Could not resolve initial next run date");
  return next;
}

/** Advance `dueAt` until strictly after `now` (handles missed scheduler runs). */
export function advanceNextRunPastDue(
  dueAt: Date,
  intervalValue: number,
  intervalUnit: RoutineIntervalUnit,
  now: Date = new Date()
): Date {
  let next = new Date(dueAt);
  let guard = 0;
  const cutoff = startOfDay(now).getTime();
  while (next.getTime() <= cutoff && guard < 500) {
    next = calculateNextRunDate(next, intervalValue, intervalUnit);
    guard++;
  }
  if (guard >= 500) throw new Error("Could not advance next run date");
  return next;
}

export function formatRoutineSchedule(intervalValue: number, intervalUnit: RoutineIntervalUnit): string {
  const unitLabel: Record<RoutineIntervalUnit, string> = {
    days: intervalValue === 1 ? "day" : "days",
    weeks: intervalValue === 1 ? "week" : "weeks",
    months: intervalValue === 1 ? "month" : "months",
    years: intervalValue === 1 ? "year" : "years",
    quarterly: intervalValue === 1 ? "quarter" : "quarters",
  };
  if (intervalUnit === "quarterly" && intervalValue === 1) return "Every quarter (3 months)";
  return `Every ${intervalValue} ${unitLabel[intervalUnit]}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function routineGeneratedTaskId(routineId: string, dueAtMs: number): string {
  return `routine_${routineId}_${dueAtMs}`;
}
