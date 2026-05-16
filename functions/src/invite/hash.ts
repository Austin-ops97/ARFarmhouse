import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_KEY_LEN = 32;
const SCRYPT_COST = 16384;

/** Normalize user input before hashing (trim only; case-sensitive codes). */
export function normalizeInviteCode(code: string): string {
  return code.trim();
}

/**
 * Derive a salted scrypt hash for storage. Format: `<saltHex>:<keyHex>`.
 * Pepper is required server-side — hashes alone are not sufficient without it.
 */
export function hashInviteCodeForStorage(code: string, pepper: string): string {
  const normalized = normalizeInviteCode(code);
  if (!normalized) throw new Error("Invite code cannot be empty.");
  const salt = randomBytes(16);
  const key = scryptSync(normalized, pepper + salt.toString("hex"), SCRYPT_KEY_LEN, {
    N: SCRYPT_COST,
  });
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Compare a candidate code against a stored `salt:key` hash using the server pepper. */
export function verifyInviteCodeHash(code: string, storedHash: string, pepper: string): boolean {
  const normalized = normalizeInviteCode(code);
  if (!normalized || !storedHash || !pepper) return false;

  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const [saltHex, keyHex] = parts;
  if (!saltHex || !keyHex) return false;

  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(keyHex, "hex");
    if (expected.length !== SCRYPT_KEY_LEN) return false;

    const derived = scryptSync(normalized, pepper + salt.toString("hex"), SCRYPT_KEY_LEN, {
      N: SCRYPT_COST,
    });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Parse comma-separated stored hashes from secret config. */
export function parseStoredInviteHashes(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
