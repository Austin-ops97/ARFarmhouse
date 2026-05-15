/**
 * Centralized registration policy for production-safe auth gating.
 *
 * Env (all optional; safe defaults close public registration):
 * - NEXT_PUBLIC_REGISTRATION_OPEN — "true" to allow sign-up at all (default: closed)
 * - NEXT_PUBLIC_SIGNUP_ALLOWLIST_EMAILS — comma-separated exact emails (lowercase match)
 * - NEXT_PUBLIC_SIGNUP_ALLOWLIST_DOMAINS — comma-separated domains without @ (e.g. family.com)
 */

export type RegistrationPolicy = {
  /** When false, new account creation is blocked (existing logins unaffected). */
  open: boolean;
  allowlistEmails: ReadonlySet<string>;
  allowlistDomains: ReadonlySet<string>;
};

export type RegistrationGateResult =
  | { allowed: true }
  | { allowed: false; message: string };

function normalizeEnvValue(raw: string | undefined): string {
  if (raw == null) return "";
  let v = raw.replace(/^\uFEFF/, "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function parseList(raw: string | undefined): ReadonlySet<string> {
  const v = normalizeEnvValue(raw);
  if (!v) return new Set();
  return new Set(
    v
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function readRegistrationPolicy(): RegistrationPolicy {
  const openRaw = normalizeEnvValue(process.env.NEXT_PUBLIC_REGISTRATION_OPEN);
  const open = openRaw === "true" || openRaw === "1";
  return {
    open,
    allowlistEmails: parseList(process.env.NEXT_PUBLIC_SIGNUP_ALLOWLIST_EMAILS),
    allowlistDomains: parseList(process.env.NEXT_PUBLIC_SIGNUP_ALLOWLIST_DOMAINS),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  return email.slice(at + 1).toLowerCase();
}

/** Evaluate whether an email may create a new account (client-side gate; pair with Console Auth settings). */
export function evaluateRegistrationGate(
  email: string,
  policy: RegistrationPolicy = readRegistrationPolicy()
): RegistrationGateResult {
  if (!policy.open) {
    return {
      allowed: false,
      message:
        "New accounts are invite-only. Ask a family admin for access, or sign in if you already have an account.",
    };
  }

  const normalized = normalizeEmail(email);
  const hasEmailList = policy.allowlistEmails.size > 0;
  const hasDomainList = policy.allowlistDomains.size > 0;

  if (!hasEmailList && !hasDomainList) {
    return { allowed: true };
  }

  if (hasEmailList && policy.allowlistEmails.has(normalized)) {
    return { allowed: true };
  }

  const domain = emailDomain(normalized);
  if (hasDomainList && domain && policy.allowlistDomains.has(domain)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message:
      "This email is not on the invite list for AR Farmhouse. Contact your family admin if you need access.",
  };
}

export function isRegistrationUiAvailable(policy: RegistrationPolicy = readRegistrationPolicy()): boolean {
  return policy.open;
}
