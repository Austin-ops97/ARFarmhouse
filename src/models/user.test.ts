import { describe, expect, it } from "vitest";

import { normalizeUserRole } from "@/models/user";

describe("normalizeUserRole", () => {
  it("maps legacy owner to admin", () => {
    expect(normalizeUserRole("owner")).toBe("admin");
    expect(normalizeUserRole("admin")).toBe("admin");
  });

  it("maps member and guest to user", () => {
    expect(normalizeUserRole("member")).toBe("user");
    expect(normalizeUserRole("guest")).toBe("user");
    expect(normalizeUserRole("user")).toBe("user");
    expect(normalizeUserRole(undefined)).toBe("user");
  });
});
