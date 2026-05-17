import { describe, expect, it } from "vitest";

import {
  addMonthsClampDay,
  advanceNextRunPastDue,
  calculateNextRunDate,
  resolveInitialNextRunAt,
} from "@/lib/routine-schedule";

describe("calculateNextRunDate", () => {
  it("adds days", () => {
    const base = new Date(2026, 0, 15);
    const next = calculateNextRunDate(base, 1, "days");
    expect(next.getDate()).toBe(16);
  });

  it("adds weeks", () => {
    const base = new Date(2026, 0, 1);
    const next = calculateNextRunDate(base, 2, "weeks");
    expect(next.getDate()).toBe(15);
  });

  it("clamps Jan 31 + 1 month to Feb 28 in non-leap year", () => {
    const base = new Date(2025, 0, 31);
    const next = calculateNextRunDate(base, 1, "months");
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it("clamps Jan 31 + 1 month to Feb 29 in leap year", () => {
    const base = new Date(2024, 0, 31);
    const next = calculateNextRunDate(base, 1, "months");
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(29);
  });

  it("quarterly behaves as 3 months", () => {
    const base = new Date(2026, 0, 31);
    const next = calculateNextRunDate(base, 1, "quarterly");
    expect(next.getMonth()).toBe(3);
    expect(next.getDate()).toBe(30);
  });

  it("adds years preserving month/day when valid", () => {
    const base = new Date(2024, 5, 15);
    const next = calculateNextRunDate(base, 1, "years");
    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(15);
  });
});

describe("resolveInitialNextRunAt", () => {
  it("returns future start date unchanged", () => {
    const start = new Date(2026, 5, 1);
    const now = new Date(2026, 0, 1);
    const next = resolveInitialNextRunAt(start, 1, "months", now);
    expect(next.getTime()).toBe(startOfDay(start).getTime());
  });

  it("advances past start when start is in the past", () => {
    const start = new Date(2026, 0, 1);
    const now = new Date(2026, 2, 15);
    const next = resolveInitialNextRunAt(start, 1, "months", now);
    expect(next.getMonth()).toBeGreaterThanOrEqual(2);
    expect(next.getTime()).toBeGreaterThan(startOfDay(now).getTime());
  });
});

describe("advanceNextRunPastDue", () => {
  it("skips multiple missed months to one future date", () => {
    const due = new Date(2026, 0, 1);
    const now = new Date(2026, 4, 1);
    const next = advanceNextRunPastDue(due, 1, "months", now);
    expect(next.getMonth()).toBeGreaterThanOrEqual(4);
    expect(next.getTime()).toBeGreaterThan(startOfDay(now).getTime());
  });
});

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

describe("addMonthsClampDay", () => {
  it("Jan 31 + 3 months → Apr 30", () => {
    const next = addMonthsClampDay(new Date(2025, 0, 31), 3);
    expect(next.getMonth()).toBe(3);
    expect(next.getDate()).toBe(30);
  });
});
