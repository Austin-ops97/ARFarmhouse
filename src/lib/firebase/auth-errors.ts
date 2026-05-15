/**
 * Maps Firebase Auth error codes to user-facing copy.
 * Never surfaces raw Firebase messages or codes.
 */

export function getFirebaseAuthErrorCode(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    return String((e as { code?: string }).code ?? "");
  }
  return "";
}

export function getFirebaseAuthErrorMessage(e: unknown): string {
  const code = getFirebaseAuthErrorCode(e);

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "That email or password does not match our records. Try again or use Forgot password.";

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
    case "auth/internal-error":
      return "We could not reach the server. Check your connection and try again.";

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
