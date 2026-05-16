#!/usr/bin/env node
/**
 * Generate a salted scrypt hash for an invite code (server-side storage only).
 *
 * Usage:
 *   INVITE_PEPPER='your-long-random-pepper' node functions/scripts/hash-invite-code.mjs 'your-invite-code'
 *
 * Set the output hash in Firebase secret INVITE_CODE_HASHES (comma-separated for multiple codes).
 * Never commit INVITE_PEPPER or plaintext invite codes to git.
 */
import { randomBytes, scryptSync } from "node:crypto";

const SCRYPT_KEY_LEN = 32;
const SCRYPT_COST = 16384;

function normalizeInviteCode(code) {
  return code.trim();
}

function hashInviteCodeForStorage(code, pepper) {
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    console.error("Invite code cannot be empty.");
    process.exit(1);
  }
  const salt = randomBytes(16);
  const key = scryptSync(normalized, pepper + salt.toString("hex"), SCRYPT_KEY_LEN, {
    N: SCRYPT_COST,
  });
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

const pepper = process.env.INVITE_PEPPER?.trim();
const code = process.argv[2];

if (!pepper) {
  console.error("Set INVITE_PEPPER to a long random secret before running this script.");
  process.exit(1);
}
if (!code) {
  console.error("Usage: INVITE_PEPPER='...' node functions/scripts/hash-invite-code.mjs '<invite-code>'");
  process.exit(1);
}

const hash = hashInviteCodeForStorage(code, pepper);
console.log(hash);
