import { describe, expect, it } from "vitest";

import { buildAttendeeLabels, countBookingGuests } from "@/models/family-profile";

describe("countBookingGuests", () => {
  it("counts self and selected members", () => {
    expect(
      countBookingGuests({ includeSelf: true, memberIds: ["a", "b"], petIds: [] })
    ).toBe(3);
  });

  it("requires at least one guest", () => {
    expect(countBookingGuests({ includeSelf: false, memberIds: [], petIds: [] })).toBe(1);
  });
});

describe("buildAttendeeLabels", () => {
  it("includes pets in labels", () => {
    const labels = buildAttendeeLabels(
      {
        displayName: "Alex",
        familyMembers: [{ id: "c1", name: "Sam", relationship: "child", photoUrl: null, birthday: null, notes: null }],
        pets: [{ id: "p1", name: "Bo", species: "Dog", breed: null, notes: null, photoUrl: null }],
      },
      { includeSelf: true, memberIds: ["c1"], petIds: ["p1"] }
    );
    expect(labels).toEqual(["Alex", "Sam", "Bo (pet)"]);
  });
});
