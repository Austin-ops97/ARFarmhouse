"use client";

import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { evaluateRegistrationGate, readRegistrationPolicy } from "@/lib/auth-gate";
import { logAuthDebug, logAuthDebugError } from "@/lib/firebase/auth-debug";
import {
  getFirebaseAuthErrorCode,
  getFirebaseAuthErrorDiagnostic,
  getFirebaseAuthErrorMessage,
} from "@/lib/firebase/auth-errors";
import { normalizeAuthEmail } from "@/lib/firebase/normalize-email";
import { isFirebaseConfigured } from "@/lib/firebase/env";
import { tryGetFirebaseAuth } from "@/lib/firebase";
import type { AvatarColorId } from "@/lib/avatar-colors";
import { DEFAULT_AVATAR_COLOR_ID } from "@/lib/avatar-colors";
import { resolveAvatarColor } from "@/models/user";
import type { AppUser } from "@/models/user";
import { validateInviteCodeForSignup } from "@/services/invite-validation";
import { bootstrapUserProfileOnSignup, loadUserProfile, syncUserProfile } from "@/services/user-profile";

export type AuthContextValue = {
  /** False only after client mount when public env is incomplete. Before mount, treated as true to avoid SSR/client gate mismatch. */
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: AppUser | null;
  /** Actionable message when signed in but Firestore profile is missing or bootstrap failed. */
  profileSetupError: string | null;
  /** Whether the sign-up UI should be offered (invite / allowlist policy). */
  registrationAvailable: boolean;
  error: string | null;
  clearError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
    inviteCode: string
  ) => Promise<void>;
  /** Sends Firebase password-reset email. Swallows `user-not-found` so response timing does not reveal whether the email is registered. */
  sendPasswordResetForEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Reload Firestore profile into session after profile edits. */
  refreshProfile: () => Promise<void>;
  /** Retry Firestore profile bootstrap while keeping the Auth session. */
  retryProfileSetup: () => Promise<void>;
  displayName: string;
  /** @deprecated Profile photos removed — use {@link avatarColor}. */
  avatarUrl: null;
  avatarColor: AvatarColorId;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type PendingSignupMetadata = {
  displayName: string;
  redemptionId: string;
  email: string;
};

const PENDING_SIGNUP_WAIT_MS = 5000;
const PENDING_SIGNUP_POLL_MS = 50;
const PENDING_SIGNUP_STORAGE_PREFIX = "ar-signup-pending:";

function pendingSignupStorageKey(uid: string): string {
  return `${PENDING_SIGNUP_STORAGE_PREFIX}${uid}`;
}

function readPersistedPendingSignup(uid: string): PendingSignupMetadata | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(pendingSignupStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSignupMetadata>;
    if (
      typeof parsed.displayName === "string" &&
      typeof parsed.redemptionId === "string" &&
      typeof parsed.email === "string" &&
      parsed.redemptionId.trim() &&
      parsed.email.trim()
    ) {
      return {
        displayName: parsed.displayName,
        redemptionId: parsed.redemptionId.trim(),
        email: normalizeAuthEmail(parsed.email),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function persistPendingSignup(uid: string, pending: PendingSignupMetadata): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(pendingSignupStorageKey(uid), JSON.stringify(pending));
  } catch {
    /* ignore */
  }
}

function clearPersistedPendingSignup(uid: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(pendingSignupStorageKey(uid));
  } catch {
    /* ignore */
  }
}

type AuthSessionState = {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
};

type AuthSessionAction =
  | { type: "SIGNED_OUT" }
  | { type: "OFFLINE" }
  | { type: "PROFILE_LOADING"; user: User }
  | { type: "PROFILE_SETTLED"; user: User; profile: AppUser | null }
  | { type: "USER_REFRESH"; user: User };

const initialSession: AuthSessionState = {
  user: null,
  profile: null,
  loading: true,
};

function authSessionReducer(state: AuthSessionState, action: AuthSessionAction): AuthSessionState {
  switch (action.type) {
    case "SIGNED_OUT":
    case "OFFLINE":
      return { user: null, profile: null, loading: false };
    case "PROFILE_LOADING":
      return { user: action.user, profile: state.user?.uid === action.user.uid ? state.profile : null, loading: true };
    case "PROFILE_SETTLED":
      return { user: action.user, profile: action.profile, loading: false };
    case "USER_REFRESH":
      return { ...state, user: action.user };
    default:
      return state;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [clientHydrated, setClientHydrated] = useState(false);
  const [session, dispatchSession] = useReducer(authSessionReducer, initialSession);
  const [error, setError] = useState<string | null>(null);
  const [profileSetupError, setProfileSetupError] = useState<string | null>(null);

  const sessionRef = useRef<AuthSessionState>(initialSession);
  const profileHydrationRef = useRef<Map<string, Promise<AppUser | null>>>(new Map());
  /** Set before `createUserWithEmailAndPassword`; consumed by profile bootstrap. */
  const pendingSignupRef = useRef<PendingSignupMetadata | null>(null);
  /** Per-uid copy survives until bootstrap succeeds (handles `onAuthStateChanged` races). */
  const pendingSignupByUidRef = useRef<Map<string, PendingSignupMetadata>>(new Map());

  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const resolvePendingSignupForUser = useCallback(async (uid: string): Promise<PendingSignupMetadata | null> => {
    const immediate =
      pendingSignupByUidRef.current.get(uid) ?? pendingSignupRef.current ?? readPersistedPendingSignup(uid);
    if (immediate?.redemptionId && immediate.email) {
      pendingSignupByUidRef.current.set(uid, immediate);
      return immediate;
    }

    const deadline = Date.now() + PENDING_SIGNUP_WAIT_MS;
    while (Date.now() < deadline) {
      await sleep(PENDING_SIGNUP_POLL_MS);
      const pending =
        pendingSignupByUidRef.current.get(uid) ??
        pendingSignupRef.current ??
        readPersistedPendingSignup(uid);
      if (pending?.redemptionId && pending.email) {
        pendingSignupByUidRef.current.set(uid, pending);
        return pending;
      }
    }
    return readPersistedPendingSignup(uid);
  }, []);

  const clearPendingSignup = useCallback((uid: string) => {
    pendingSignupRef.current = null;
    pendingSignupByUidRef.current.delete(uid);
    clearPersistedPendingSignup(uid);
  }, []);

  const hydrateUserProfile = useCallback(
    async (user: User): Promise<AppUser | null> => {
      const uid = user.uid;
      const inflight = profileHydrationRef.current.get(uid);
      if (inflight) return inflight;

      const auth = tryGetFirebaseAuth();
      const email = normalizeAuthEmail(user.email ?? "");

      const task = (async (): Promise<AppUser | null> => {
        const pending = await resolvePendingSignupForUser(uid);

        if (pending) {
          logAuthDebug(auth, { op: "profile-bootstrap", email, passwordLength: 0 }, {
            uid,
            redemptionId: pending.redemptionId,
            step: "hydrate-signup",
          });
          try {
            const profile = await bootstrapUserProfileOnSignup(user, {
              displayName: pending.displayName,
              signupRedemptionId: pending.redemptionId,
              email: pending.email,
            });
            clearPendingSignup(uid);
            setProfileSetupError(null);
            return profile;
          } catch (e) {
            logAuthDebugError(auth, { op: "profile-bootstrap", email, passwordLength: 0 }, e, { uid });
            const msg = e instanceof Error ? e.message : "Profile setup failed. Try again.";
            setProfileSetupError(msg);
            throw e;
          }
        }

        try {
          const profile = await syncUserProfile(user);
          if (!profile) {
            setProfileSetupError(
              "Your account is signed in, but your family profile is not set up yet. Contact a family admin or retry if you just signed up."
            );
          } else {
            setProfileSetupError(null);
          }
          return profile;
        } catch (e) {
          logAuthDebugError(auth, { op: "profile-sync", email, passwordLength: 0 }, e, { uid });
          const msg = e instanceof Error ? e.message : "Could not load your profile.";
          setProfileSetupError(msg);
          throw e;
        }
      })();

      profileHydrationRef.current.set(uid, task);
      try {
        return await task;
      } finally {
        profileHydrationRef.current.delete(uid);
      }
    },
    [clearPendingSignup, resolvePendingSignupForUser]
  );

  useEffect(() => {
    queueMicrotask(() => {
      setClientHydrated(true);
    });
  }, []);

  const configured = clientHydrated ? isFirebaseConfigured() : true;

  useEffect(() => {
    if (!clientHydrated) return;

    if (!isFirebaseConfigured()) {
      queueMicrotask(() => {
        dispatchSession({ type: "OFFLINE" });
      });
      return;
    }

    const auth = tryGetFirebaseAuth();
    if (!auth) {
      queueMicrotask(() => {
        dispatchSession({ type: "OFFLINE" });
      });
      return;
    }

    let cancelled = false;

    void setPersistence(auth, browserLocalPersistence).catch(() => {
      /* Private mode / blocked storage */
    });

    const unsub = onAuthStateChanged(auth, (next) => {
      if (cancelled) return;

      if (!next) {
        setProfileSetupError(null);
        dispatchSession({ type: "SIGNED_OUT" });
        return;
      }

      const uid = next.uid;
      const snap = sessionRef.current;

      if (snap.user?.uid === uid && snap.user !== next) {
        dispatchSession({ type: "USER_REFRESH", user: next });
      }

      const cachedProfile = snap.user?.uid === uid ? snap.profile : null;
      if (cachedProfile) {
        dispatchSession({ type: "PROFILE_SETTLED", user: next, profile: cachedProfile });
      } else {
        dispatchSession({ type: "PROFILE_LOADING", user: next });
      }

      void (async () => {
        try {
          const p = await hydrateUserProfile(next);
          if (cancelled) return;
          if (auth.currentUser?.uid !== uid) return;
          dispatchSession({ type: "PROFILE_SETTLED", user: next, profile: p });
        } catch {
          if (cancelled) return;
          if (auth.currentUser?.uid !== uid) return;
          dispatchSession({ type: "PROFILE_SETTLED", user: next, profile: null });
        }
      })();
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [clientHydrated, hydrateUserProfile]);

  const clearError = useCallback(() => setError(null), []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const auth = tryGetFirebaseAuth();
    if (!auth) throw new Error("Sign-in is not available. Check that this app is configured.");
    const normalizedEmail = normalizeAuthEmail(email);
    const debugCtx = { op: "signin" as const, email: normalizedEmail, passwordLength: password.length };
    logAuthDebug(auth, debugCtx);
    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      logAuthDebug(auth, debugCtx, { result: "ok" });
    } catch (e) {
      logAuthDebugError(auth, debugCtx, e, { diagnostic: getFirebaseAuthErrorDiagnostic(e) });
      const msg = getFirebaseAuthErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const registrationAvailable = useMemo(() => readRegistrationPolicy().open, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string, inviteCode: string) => {
      setError(null);
      setProfileSetupError(null);
      const gate = evaluateRegistrationGate(normalizeAuthEmail(email));
      if (!gate.allowed) {
        setError(gate.message);
        throw new Error(gate.message);
      }
      const auth = tryGetFirebaseAuth();
      if (!auth) throw new Error("Sign-in is not available. Check that this app is configured.");
      const normalizedEmail = normalizeAuthEmail(email);
      const name = displayName.trim() || normalizedEmail.split("@")[0] || "Member";
      const trimmedInvite = inviteCode.trim();
      if (!trimmedInvite) {
        const msg = "Invalid invite code";
        setError(msg);
        throw new Error(msg);
      }

      let redemptionId: string;
      try {
        const validation = await validateInviteCodeForSignup(trimmedInvite, normalizedEmail);
        redemptionId = validation.redemptionId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid invite code";
        setError(msg);
        throw new Error(msg);
      }

      const pending: PendingSignupMetadata = {
        displayName: name,
        redemptionId,
        email: normalizedEmail,
      };
      pendingSignupRef.current = pending;

      const debugCtx = {
        op: "signup" as const,
        email: normalizedEmail,
        passwordLength: password.length,
      };
      logAuthDebug(auth, debugCtx, { redemptionId, step: "pending-metadata-ready" });

      try {
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        pendingSignupByUidRef.current.set(cred.user.uid, pending);
        persistPendingSignup(cred.user.uid, pending);
        logAuthDebug(auth, debugCtx, { uid: cred.user.uid, step: "createUser ok" });

        dispatchSession({ type: "PROFILE_LOADING", user: cred.user });

        try {
          await updateProfile(cred.user, { displayName: name });
          const profile = await hydrateUserProfile(cred.user);
          dispatchSession({ type: "PROFILE_SETTLED", user: cred.user, profile });
          logAuthDebug(auth, debugCtx, {
            uid: cred.user.uid,
            step: profile ? "profile ok" : "profile pending",
          });
          if (!profile) {
            const msg =
              "Your account was created but profile setup needs another try. Stay signed in and tap Retry profile setup.";
            setProfileSetupError(msg);
            throw new Error(msg);
          }
        } catch (inner) {
          profileHydrationRef.current.delete(cred.user.uid);
          logAuthDebugError(auth, debugCtx, inner, {
            diagnostic: getFirebaseAuthErrorDiagnostic(inner),
          });
          const msg =
            inner instanceof Error && !getFirebaseAuthErrorCode(inner)
              ? inner.message
              : getFirebaseAuthErrorMessage(inner);
          if (!getFirebaseAuthErrorCode(inner)) {
            setProfileSetupError(msg);
          }
          if (getFirebaseAuthErrorCode(inner)) {
            setError(msg);
          } else {
            setProfileSetupError(msg);
          }
          throw new Error(msg);
        }
      } catch (e) {
        if (getFirebaseAuthErrorCode(e)) {
          pendingSignupRef.current = null;
          pendingSignupByUidRef.current.clear();
        }
        logAuthDebugError(auth, debugCtx, e, { diagnostic: getFirebaseAuthErrorDiagnostic(e) });
        const msg = getFirebaseAuthErrorMessage(e);
        setError(msg);
        throw new Error(msg);
      }
    },
    [hydrateUserProfile]
  );

  const sendPasswordResetForEmail = useCallback(async (email: string) => {
    const auth = tryGetFirebaseAuth();
    if (!auth) throw new Error("Sign-in is not available. Check that this app is configured.");
    const normalizedEmail = normalizeAuthEmail(email);
    if (!normalizedEmail) throw new Error("Enter your email address.");
    logAuthDebug(auth, { op: "reset-password", email: normalizedEmail, passwordLength: 0 });
    try {
      await firebaseSendPasswordResetEmail(auth, normalizedEmail);
    } catch (e) {
      if (getFirebaseAuthErrorCode(e) === "auth/user-not-found") {
        return;
      }
      const msg = getFirebaseAuthErrorMessage(e);
      throw new Error(msg);
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = tryGetFirebaseAuth();
    if (!auth) return;
    logAuthDebug(auth, {
      op: "signout",
      email: normalizeAuthEmail(auth.currentUser?.email ?? ""),
      passwordLength: 0,
    });
    const uid = auth.currentUser?.uid;
    pendingSignupRef.current = null;
    pendingSignupByUidRef.current.clear();
    if (uid) clearPersistedPendingSignup(uid);
    setProfileSetupError(null);
    await firebaseSignOut(auth);
  }, []);

  const refreshProfile = useCallback(async () => {
    const auth = tryGetFirebaseAuth();
    const uid = auth?.currentUser?.uid;
    if (!uid || !auth?.currentUser) return;
    try {
      const p = await loadUserProfile(uid);
      dispatchSession({ type: "PROFILE_SETTLED", user: auth.currentUser, profile: p });
      if (p) setProfileSetupError(null);
    } catch {
      /* keep cached profile */
    }
  }, []);

  const retryProfileSetup = useCallback(async () => {
    const auth = tryGetFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) return;

    setProfileSetupError(null);
    profileHydrationRef.current.delete(user.uid);

    const pending = await resolvePendingSignupForUser(user.uid);
    if (!pending) {
      const email = normalizeAuthEmail(user.email ?? "");
      const existingPending = pendingSignupByUidRef.current.get(user.uid);
      if (!existingPending) {
        logAuthDebug(auth, { op: "profile-bootstrap", email, passwordLength: 0 }, {
          uid: user.uid,
          step: "retry-without-redemption",
        });
      }
    }

    dispatchSession({ type: "PROFILE_LOADING", user });
    try {
      const profile = await hydrateUserProfile(user);
      dispatchSession({ type: "PROFILE_SETTLED", user, profile });
      if (!profile) {
        setProfileSetupError(
          "Profile setup is still incomplete. If you just signed up, validate your invite again or contact a family admin."
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Profile setup failed. Try again.";
      setProfileSetupError(msg);
      dispatchSession({ type: "PROFILE_SETTLED", user, profile: null });
    }
  }, [hydrateUserProfile, resolvePendingSignupForUser]);

  const displayName =
    session.profile?.displayName?.trim() ||
    session.user?.displayName?.trim() ||
    session.user?.email?.split("@")[0]?.trim() ||
    "Member";

  const avatarColor = session.profile
    ? resolveAvatarColor(session.profile)
    : DEFAULT_AVATAR_COLOR_ID;

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading: session.loading,
      user: session.user,
      profile: session.profile,
      profileSetupError,
      registrationAvailable,
      error,
      clearError,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordResetForEmail,
      signOut,
      refreshProfile,
      retryProfileSetup,
      displayName,
      avatarUrl: null,
      avatarColor,
    }),
    [
      avatarColor,
      clearError,
      configured,
      displayName,
      error,
      profileSetupError,
      session.loading,
      registrationAvailable,
      refreshProfile,
      retryProfileSetup,
      session.profile,
      session.user,
      sendPasswordResetForEmail,
      signInWithEmail,
      signOut,
      signUpWithEmail,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
