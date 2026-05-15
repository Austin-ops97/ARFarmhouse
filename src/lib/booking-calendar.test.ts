import { describe, expect, it } from "vitest";

import { bookingEventTitle, rangesOverlap } from "@/lib/booking-calendar";

describe("rangesOverlap", () => {
  it("detects overlapping ranges", () => {
    expect(rangesOverlap(5, 8, 7, 10)).toBe(true);
    expect(rangesOverlap(5, 8, 9, 12)).toBe(false);
  });
});

describe("bookingEventTitle", () => {
  it("prefers trip purpose when provided", () => {
    expect(bookingEventTitle("Cousins weekend", "family", 6)).toBe("Cousins weekend");
  });

  it("falls back to trip label and guests", () => {
    expect(bookingEventTitle("", "family", 4)).toBe("Family stay · 4 guests");
  });
});
