import { afterEach, describe, expect, it, vi } from "vitest";

import { buildPostDeepLink, getPublicSiteOrigin } from "@/lib/app-url";

describe("app-url", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://arfarmhouse.example/");
    expect(getPublicSiteOrigin()).toBe("https://arfarmhouse.example");
  });

  it("builds post deep links from env origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://arfarmhouse.example");
    expect(buildPostDeepLink("abc123")).toBe("https://arfarmhouse.example/?post=abc123");
  });

  it("returns empty link without origin on server", () => {
    expect(buildPostDeepLink("abc123")).toBe("");
  });
});
