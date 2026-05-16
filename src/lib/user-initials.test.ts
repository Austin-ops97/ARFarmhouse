import { describe, expect, it } from "vitest";

import { normalizeAvatarColorId } from "@/lib/avatar-colors";
import { userInitials } from "@/lib/user-initials";

describe("userInitials", () => {
  it("returns up to two initials", () => {
    expect(userInitials("Austin Alexander")).toBe("AA");
    expect(userInitials("Madonna")).toBe("MA");
    expect(userInitials("")).toBe("?");
  });
});

describe("normalizeAvatarColorId", () => {
  it("falls back to slate for unknown values", () => {
    expect(normalizeAvatarColorId("sage")).toBe("sage");
    expect(normalizeAvatarColorId("not-a-color")).toBe("slate");
  });
});
