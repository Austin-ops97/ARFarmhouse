import { describe, expect, it } from "vitest";

import { notificationDocId } from "@/services/notifications";

describe("notifications", () => {
  it("dedupes doc ids from type, entity, and actor", () => {
    const id = notificationDocId({
      type: "feed_reaction",
      title: "t",
      body: "b",
      actorId: "user-abc",
      actorDisplayName: "Alex",
      actorAvatarUrl: null,
      entityKind: "post",
      entityId: "post-123",
      routeNav: "feed",
    });
    expect(id).toMatch(/^feed_reaction_post-123_user-abc/);
    expect(id.length).toBeLessThanOrEqual(120);
  });
});
