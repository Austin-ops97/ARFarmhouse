import { describe, expect, it } from "vitest";

import { buildCoordinationHighlights, groupNotificationsByDay } from "@/lib/activity-coordination";
import type { FamilyNotification } from "@/models/notification";

function mockNotification(partial: Partial<FamilyNotification> & { id: string }): FamilyNotification {
  return {
    type: "feed_comment",
    title: "Test",
    body: "Body",
    actorId: "a1",
    actorDisplayName: "Alex",
    actorAvatarUrl: null,
    readAt: null,
    createdAt: Date.now(),
    entity: { kind: "post", id: "p1" },
    route: { nav: "feed", postId: "p1" },
    ...partial,
    id: partial.id,
  };
}

describe("activity-coordination", () => {
  it("builds trip and unread highlights", () => {
    const now = new Date(2026, 4, 15);
    const highlights = buildCoordinationHighlights({
      view: now,
      calendarEvents: [
        {
          id: "e1",
          title: "Memorial weekend",
          startDay: 20,
          endDay: 22,
          year: 2026,
          monthIndex: 4,
          kind: "family_booking",
          accent: "mint",
          status: "confirmed",
          guests: 4,
          tripId: "family",
          tripPurpose: "",
          notes: "",
          requestedBy: "u1",
          requestedByName: "Alex",
          attendeeLabels: [],
          attendeePetIds: [],
        },
      ],
      notifications: [mockNotification({ id: "n1", readAt: null })],
    });
    expect(highlights.some((h) => h.title.includes("stay"))).toBe(true);
    expect(highlights.some((h) => h.title.includes("new update"))).toBe(true);
  });

  it("groups notifications by day", () => {
    const startOfToday = new Date();
    startOfToday.setHours(12, 0, 0, 0);
    const groups = groupNotificationsByDay([
      mockNotification({ id: "t", createdAt: startOfToday.getTime() }),
      mockNotification({ id: "y", createdAt: startOfToday.getTime() - 86_400_000 }),
    ]);
    expect(groups.map((g) => g.label)).toContain("Today");
    expect(groups.map((g) => g.label)).toContain("Yesterday");
  });
});
