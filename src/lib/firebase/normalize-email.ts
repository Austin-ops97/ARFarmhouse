/** Canonical email for Firebase Auth, invites, and Firestore (trim + lowercase). */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}
