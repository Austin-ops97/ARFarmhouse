import { serverTimestamp, Timestamp } from "firebase/firestore";
import { describe, expect, it } from "vitest";

import {
  assertFirestoreWriteSafe,
  findFirestoreWriteIssues,
} from "@/lib/datetime/firestore-write";

describe("findFirestoreWriteIssues", () => {
  it("flags serverTimestamp inside arrays", () => {
    const issues = findFirestoreWriteIssues({
      activityLog: [{ timestamp: serverTimestamp() }],
    });
    expect(issues).toEqual([
      { kind: "server_timestamp_in_array", path: "root.activityLog[0].timestamp" },
    ]);
  });

  it("allows serverTimestamp at document top level", () => {
    const issues = findFirestoreWriteIssues({
      updatedAt: serverTimestamp(),
      activityLog: [{ timestamp: Timestamp.now() }],
    });
    expect(issues).toHaveLength(0);
  });

  it("flags undefined nested values", () => {
    const issues = findFirestoreWriteIssues({ notes: undefined });
    expect(issues).toEqual([{ kind: "undefined_value", path: "root.notes" }]);
  });
});

describe("assertFirestoreWriteSafe", () => {
  it("throws with a clear message for invalid activity logs", () => {
    expect(() =>
      assertFirestoreWriteSafe({ activityLog: [{ timestamp: serverTimestamp() }] }, "booking")
    ).toThrow(/serverTimestamp\(\) at root\.activityLog\[0\]\.timestamp/);
  });
});
