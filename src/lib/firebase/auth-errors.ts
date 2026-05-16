/**
 * Maps Firebase Auth error codes to user-facing copy.
 * Preserves original codes for developer diagnostics.
 */

export function getFirebaseAuthErrorCode(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code?: string }).code ?? "");
  }
  return "";
}

/** Developer-oriented detail (console / debug). Never shown raw to end users. */
export function getFirebaseAuthErrorDiagnostic(e: unknown): string {
  const code = getFirebaseAuthErrorCode(e);
  const message = e instanceof Error ? e.message : String(e);
  if (code) return `[${code}] ${message}`;
  return message;
}

export function getFirebaseAuthErrorMessage(e: unknown): string {
  const code = getFirebaseAuthErrorCode(e);

  switch (code) {
    case "auth/wrong-password":
      return "Incorrect password. Try again or use Forgot password.";

    case "auth/user-not-found":
      return "No account exists for this email. Check the address or sign up with a family invite code.";

    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "That email or password is incorrect. Try again or use Forgot password.";

    case "auth/email-already-in-use":
      return "An account already uses this email. Sign in instead, or use Forgot password if you do not remember the password.";

    case "auth/weak-password":
      return "Choose a stronger password — at least 6 characters.";

    case "auth/invalid-email":
      return "Enter a valid email address.";

    case "auth/missing-email":
      return "Enter your email address.";

    case "auth/too-many-requests":
      return "Too many attempts from this device. Please wait a few minutes and try again.";

    case "auth/network-request-failed":
      return "We could not reach the server. Check your connection and try again.";

    case "auth/internal-error":
      return "A temporary server error occurred. Please try again in a moment.";

    case "auth/user-disabled":
      return "This account is no longer active. Contact your family admin for help.";

    case "auth/operation-not-allowed":
      return "Email sign-in is not available right now. Please try again later.";

    case "auth/requires-recent-login":
      return "For your security, sign out and sign in again, then retry.";

    case "auth/invalid-continue-uri":
    case "auth/unauthorized-continue-uri":
      return "Password reset could not be completed. Please try again from this page.";

    default:
      if (e instanceof Error && e.message && !e.message.startsWith("Firebase")) {
        return e.message;
      }
      return "Something went wrong. Please try again.";
  }
}
