import { describe, expect, it } from "vitest";

import { hubSlugFromLinkedEventLabel } from "@/lib/linked-event-hub";

describe("hubSlugFromLinkedEventLabel", () => {
  it("maps memorial weekend labels", () => {
    expect(hubSlugFromLinkedEventLabel("Memorial Day weekend")).toBe("memorial-mdw");
  });

  it("maps fishing and deer camp keywords", () => {
    expect(hubSlugFromLinkedEventLabel("Willow fishing trip")).toBe("fishing-jun");
    expect(hubSlugFromLinkedEventLabel("deer camp prep")).toBe("deer-camp");
  });

  it("returns null for unrelated labels", () => {
    expect(hubSlugFromLinkedEventLabel("random Tuesday")).toBeNull();
  });
});
