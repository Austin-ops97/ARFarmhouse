import { describe, expect, it } from "vitest";

import { INVALID_INVITE_MESSAGE, INVITE_THROTTLED_MESSAGE } from "./invite-validation";

describe("invite validation messages", () => {
  it("exports stable user-facing copy", () => {
    expect(INVALID_INVITE_MESSAGE).toBe("Invalid invite code");
    expect(INVITE_THROTTLED_MESSAGE).toContain("Too many attempts");
  });
});
