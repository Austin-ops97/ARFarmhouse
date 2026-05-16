import { describe, expect, it } from "vitest";

import {
  getFirebaseAuthErrorCode,
  getFirebaseAuthErrorDiagnostic,
  getFirebaseAuthErrorMessage,
} from "@/lib/firebase/auth-errors";

function firebaseError(code: string, message = "Firebase error") {
  return { code, message };
}

describe("getFirebaseAuthErrorMessage", () => {
  it("maps wrong-password distinctly from user-not-found", () => {
    expect(getFirebaseAuthErrorMessage(firebaseError("auth/wrong-password"))).toContain("Incorrect password");
    expect(getFirebaseAuthErrorMessage(firebaseError("auth/user-not-found"))).toContain("No account exists");
  });

  it("maps network and internal errors separately", () => {
    expect(getFirebaseAuthErrorMessage(firebaseError("auth/network-request-failed"))).toContain("connection");
    expect(getFirebaseAuthErrorMessage(firebaseError("auth/internal-error"))).toContain("temporary server");
  });

  it("maps email-already-in-use and invalid-email", () => {
    expect(getFirebaseAuthErrorMessage(firebaseError("auth/email-already-in-use"))).toContain("already uses");
    expect(getFirebaseAuthErrorMessage(firebaseError("auth/invalid-email"))).toContain("valid email");
  });

  it("preserves code in diagnostic output", () => {
    const err = firebaseError("auth/too-many-requests", "Rate limited");
    expect(getFirebaseAuthErrorCode(err)).toBe("auth/too-many-requests");
    expect(getFirebaseAuthErrorDiagnostic(err)).toContain("auth/too-many-requests");
  });
});
