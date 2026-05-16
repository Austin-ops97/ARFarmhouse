import { describe, expect, it } from "vitest";

import { hashInviteCodeForStorage, normalizeInviteCode, verifyInviteCodeHash } from "./hash";

describe("invite hash", () => {
  const pepper = "test-pepper-for-unit-tests-only";

  it("normalizes by trimming", () => {
    expect(normalizeInviteCode("  abc  ")).toBe("abc");
  });

  it("verifies a stored hash", () => {
    const code = "family-test-code";
    const stored = hashInviteCodeForStorage(code, pepper);
    expect(verifyInviteCodeHash(code, stored, pepper)).toBe(true);
    expect(verifyInviteCodeHash("wrong", stored, pepper)).toBe(false);
    expect(verifyInviteCodeHash(code, stored, "other-pepper")).toBe(false);
  });

  it("supports multiple distinct codes via separate hashes", () => {
    const a = hashInviteCodeForStorage("code-a", pepper);
    const b = hashInviteCodeForStorage("code-b", pepper);
    expect(verifyInviteCodeHash("code-a", a, pepper)).toBe(true);
    expect(verifyInviteCodeHash("code-b", b, pepper)).toBe(true);
    expect(verifyInviteCodeHash("code-a", b, pepper)).toBe(false);
  });
});
