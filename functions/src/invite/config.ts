import { defineSecret } from "firebase-functions/params";

import { parseStoredInviteHashes } from "./hash";

export const invitePepperSecret = defineSecret("INVITE_PEPPER");
export const inviteCodeHashesSecret = defineSecret("INVITE_CODE_HASHES");

/** Redemption documents expire after this window (ms). */
export const SIGNUP_REDEMPTION_TTL_MS = 15 * 60 * 1000;

export function readInvitePepper(): string {
  const value = invitePepperSecret.value()?.trim();
  if (!value) {
    throw new Error("INVITE_PEPPER is not configured.");
  }
  return value;
}

export function readStoredInviteHashes(): string[] {
  const raw = inviteCodeHashesSecret.value()?.trim();
  if (!raw) {
    throw new Error("INVITE_CODE_HASHES is not configured.");
  }
  const hashes = parseStoredInviteHashes(raw);
  if (hashes.length === 0) {
    throw new Error("INVITE_CODE_HASHES is empty.");
  }
  return hashes;
}
