import { describe, expect, it } from "vitest";

import {
  calendarDayRangeToDates,
  formatLocalDateRange,
  startOfLocalDay,
} from "@/lib/datetime/time";

describe("calendarDayRangeToDates", () => {
  it("anchors inclusive days in local timezone without UTC day shift", () => {
    const { startDate, endDate } = calendarDayRangeToDates(2026, 4, 16, 16);
    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(4);
    expect(startDate.getDate()).toBe(16);
    expect(startDate.getHours()).toBe(0);
    expect(endDate.getDate()).toBe(16);
    expect(endDate.getHours()).toBe(23);
  });

  it("normalizes reversed day inputs", () => {
    const { startDate, endDate } = calendarDayRangeToDates(2026, 4, 18, 16);
    expect(startDate.getDate()).toBe(16);
    expect(endDate.getDate()).toBe(18);
  });
});

describe("formatLocalDateRange", () => {
  it("collapses same-day ranges to a single label", () => {
    const day = startOfLocalDay(new Date(2026, 4, 16));
    expect(formatLocalDateRange(day, day)).toMatch(/May 16/);
  });
});
