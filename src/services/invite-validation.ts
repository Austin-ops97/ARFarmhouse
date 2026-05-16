import { httpsCallable } from "firebase/functions";

import { normalizeAuthEmail } from "@/lib/firebase/normalize-email";
import { tryGetFirebaseFunctions } from "@/lib/firebase/functions";

export const INVALID_INVITE_MESSAGE = "Invalid invite code";
export const INVITE_THROTTLED_MESSAGE = "Too many attempts. Try again in a few minutes.";

export type InviteValidationResult = {
  valid: true;
  redemptionId: string;
};

type ValidateInviteResponse = {
  valid: boolean;
  redemptionId?: string;
};

function mapInviteCallableError(err: unknown): string {
  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
      ? (err as { code: string }).code
      : "";

  const message =
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";

  if (code.includes("resource-exhausted") || message.includes("Too many attempts")) {
    return INVITE_THROTTLED_MESSAGE;
  }

  if (
    code.includes("permission-denied") ||
    code.includes("invalid-argument") ||
    code.includes("failed-precondition") ||
    message.includes("Invalid invite")
  ) {
    return INVALID_INVITE_MESSAGE;
  }

  return INVALID_INVITE_MESSAGE;
}

/**
 * Validates an invite code server-side. Never exposes the valid code to the client.
 * Returns a short-lived redemption id to attach to the Firestore profile on signup.
 */
export async function validateInviteCodeForSignup(
  inviteCode: string,
  email: string
): Promise<InviteValidationResult> {
  const functions = tryGetFirebaseFunctions();
  if (!functions) {
    throw new Error("Invite validation is not available. Check that this app is configured.");
  }

  const callable = httpsCallable<{ code: string; email: string }, ValidateInviteResponse>(
    functions,
    "validateInviteCode"
  );

  try {
    const result = await callable({ code: inviteCode, email: normalizeAuthEmail(email) });
    const data = result.data;
    if (data?.valid === true && typeof data.redemptionId === "string" && data.redemptionId.trim()) {
      return { valid: true, redemptionId: data.redemptionId.trim() };
    }
    throw new Error(INVALID_INVITE_MESSAGE);
  } catch (err) {
    if (err instanceof Error && err.message === INVALID_INVITE_MESSAGE) throw err;
    throw new Error(mapInviteCallableError(err));
  }
}
