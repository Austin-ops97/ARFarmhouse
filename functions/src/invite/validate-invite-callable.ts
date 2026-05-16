import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import {
  inviteCodeHashesSecret,
  invitePepperSecret,
  readInvitePepper,
  readStoredInviteHashes,
} from "./config";
import { normalizeInviteCode, verifyInviteCodeHash } from "./hash";
import { checkInviteValidationRateLimit } from "./rate-limit";
import { createSignupRedemption } from "./redemptions";

const GENERIC_INVALID = "Invalid invite code";
const GENERIC_THROTTLED = "Too many attempts. Try again in a few minutes.";

const MIN_CODE_LEN = 4;
const MAX_CODE_LEN = 128;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function matchesAnyStoredHash(code: string, pepper: string, hashes: string[]): boolean {
  for (const stored of hashes) {
    if (verifyInviteCodeHash(code, stored, pepper)) return true;
  }
  return false;
}

export const validateInviteCode = onCall(
  {
    region: "us-central1",
    secrets: [invitePepperSecret, inviteCodeHashesSecret],
    invoker: "public",
  },
  async (request) => {
    const raw = request.data as { code?: unknown; email?: unknown } | null;
    const code = typeof raw?.code === "string" ? raw.code : "";
    const email = typeof raw?.email === "string" ? raw.email : "";

    const normalizedCode = normalizeInviteCode(code);
    const emailLower = normalizeEmail(email);

    if (!isValidEmail(emailLower)) {
      throw new HttpsError("invalid-argument", GENERIC_INVALID);
    }
    if (normalizedCode.length < MIN_CODE_LEN || normalizedCode.length > MAX_CODE_LEN) {
      throw new HttpsError("permission-denied", GENERIC_INVALID);
    }

    const rate = await checkInviteValidationRateLimit({
      ip: request.rawRequest.ip,
      forwardedFor: request.rawRequest.headers["x-forwarded-for"] as string | undefined,
    });
    if (!rate.allowed) {
      throw new HttpsError("resource-exhausted", GENERIC_THROTTLED);
    }

    let pepper: string;
    let hashes: string[];
    try {
      pepper = readInvitePepper();
      hashes = readStoredInviteHashes();
    } catch (err) {
      logger.error("invite validation misconfigured", { err: String(err) });
      throw new HttpsError("failed-precondition", GENERIC_INVALID);
    }

    const valid = matchesAnyStoredHash(normalizedCode, pepper, hashes);
    if (!valid) {
      throw new HttpsError("permission-denied", GENERIC_INVALID);
    }

    const redemptionId = await createSignupRedemption(emailLower);
    return { valid: true as const, redemptionId };
  }
);
