import { Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import { buildActivityEntry } from "@/lib/booking-activity";
import { assertFirestoreWriteSafe } from "@/lib/datetime/firestore-write";

describe("buildActivityEntry", () => {
  it("uses a concrete Timestamp (not serverTimestamp) for array writes", () => {
    const entry = buildActivityEntry("created", "u1", "Alex");
    expect(entry.timestamp).toBeInstanceOf(Timestamp);
    expect(() => assertFirestoreWriteSafe({ activityLog: [entry] })).not.toThrow();
  });
});
