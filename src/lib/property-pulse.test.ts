import { describe, expect, it } from "vitest";

import { buildPropertyPulseLines } from "@/lib/property-pulse";

describe("property-pulse", () => {
  it("merges status, inventory low, and calendar", () => {
    const lines = buildPropertyPulseLines({
      statusCards: [{ id: "1", title: "Gate", value: "Closed", icon: "lock" }],
      inventory: [{ id: "i", label: "Propane", pct: 10, unit: "tank", lastUpdatedBy: "A", lastUpdated: "Today", low: true }],
      calendarEvent: {
        id: "e",
        title: "Memorial Day",
        startDay: 23,
        endDay: 26,
        kind: "family_booking",
        accent: "mint",
        status: "confirmed",
        guests: 8,
        tripId: "t",
        tripPurpose: "",
        notes: "",
        requestedBy: "u",
        requestedByName: "Alex",
        attendeeLabels: [],
        attendeePetIds: [],
        year: 2026,
        monthIndex: 4,
      },
    });
    expect(lines.some((l) => l.label === "Gate")).toBe(true);
    expect(lines.some((l) => l.value.includes("low"))).toBe(true);
    expect(lines.some((l) => l.label === "Next stay")).toBe(true);
  });
});
