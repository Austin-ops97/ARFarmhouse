import { describe, expect, it } from "vitest";

import {
  capabilitiesForRole,
  hasCapability,
  normalizePlatformRole,
} from "@/platform/permissions/capabilities";

describe("platform capabilities", () => {
  it("normalizes legacy owner to admin capabilities", () => {
    expect(normalizePlatformRole("owner")).toBe("admin");
    expect(hasCapability("owner", "admin.access")).toBe(true);
    expect(hasCapability("owner", "bookings.approve")).toBe(true);
  });

  it("grants moderators approval without full settings", () => {
    expect(hasCapability("moderator", "bookings.approve")).toBe(true);
    expect(hasCapability("moderator", "admin.settings")).toBe(false);
    expect(hasCapability("moderator", "admin.analytics")).toBe(true);
  });

  it("limits standard users to upload only", () => {
    const caps = capabilitiesForRole("user");
    expect(caps.has("media.upload")).toBe(true);
    expect(caps.has("admin.access")).toBe(false);
  });

  it("grants property managers booking ops without user role management", () => {
    expect(hasCapability("property_manager", "bookings.manage_blackouts")).toBe(true);
    expect(hasCapability("property_manager", "users.manage_roles")).toBe(false);
  });
});
