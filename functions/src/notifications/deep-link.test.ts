import { describe, expect, it } from "vitest";

import { buildDeepLinkPath } from "./deep-link";

const ORIGIN = "https://arfarmhouse.com";

describe("buildDeepLinkPath", () => {
  it("builds absolute booking deep links", () => {
    expect(buildDeepLinkPath({ bookingId: "bk_123" }, ORIGIN)).toBe(
      "https://arfarmhouse.com/?booking=bk_123"
    );
  });

  it("builds absolute post deep links", () => {
    expect(buildDeepLinkPath({ postId: "post_456" }, ORIGIN)).toBe(
      "https://arfarmhouse.com/?post=post_456"
    );
  });

  it("prefers postId over bookingId when both are set", () => {
    expect(buildDeepLinkPath({ postId: "p1", bookingId: "b1" }, ORIGIN)).toBe(
      "https://arfarmhouse.com/?post=p1"
    );
  });

  it("strips trailing slash from site origin", () => {
    expect(buildDeepLinkPath({ bookingId: "x" }, "https://arfarmhouse.com/")).toBe(
      "https://arfarmhouse.com/?booking=x"
    );
  });

  it("falls back to relative path when origin is unset", () => {
    expect(buildDeepLinkPath({ bookingId: "bk_123" })).toBe("/?booking=bk_123");
    expect(buildDeepLinkPath({ postId: "post_456" })).toBe("/?post=post_456");
  });

  it("returns site root when no entity id is provided", () => {
    expect(buildDeepLinkPath({}, ORIGIN)).toBe("https://arfarmhouse.com/");
  });
});
