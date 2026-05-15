import { describe, expect, it } from "vitest";

import { evaluateRegistrationGate, type RegistrationPolicy } from "@/lib/auth-gate";

const closed: RegistrationPolicy = {
  open: false,
  allowlistEmails: new Set(["allowed@family.com"]),
  allowlistDomains: new Set(["family.com"]),
};

const openNoList: RegistrationPolicy = {
  open: true,
  allowlistEmails: new Set(),
  allowlistDomains: new Set(),
};

const openAllowlist: RegistrationPolicy = {
  open: true,
  allowlistEmails: new Set(["alice@family.com"]),
  allowlistDomains: new Set(["family.com"]),
};

describe("evaluateRegistrationGate", () => {
  it("blocks signup when registration is closed", () => {
    const r = evaluateRegistrationGate("anyone@example.com", closed);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.message).toMatch(/invite-only/i);
  });

  it("allows any email when open with no allowlist", () => {
    expect(evaluateRegistrationGate("new@example.com", openNoList).allowed).toBe(true);
  });

  it("allows allowlisted email", () => {
    expect(evaluateRegistrationGate("alice@family.com", openAllowlist).allowed).toBe(true);
  });

  it("allows allowlisted domain", () => {
    expect(evaluateRegistrationGate("bob@family.com", openAllowlist).allowed).toBe(true);
  });

  it("blocks email not on allowlist when lists are configured", () => {
    const r = evaluateRegistrationGate("stranger@other.com", openAllowlist);
    expect(r.allowed).toBe(false);
  });
});
