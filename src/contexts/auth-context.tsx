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

import { getFirebaseAuthErrorCode, getFirebaseAuthErrorMessage } from "@/lib/firebase/auth-errors";
import { isFirebaseConfigured } from "@/lib/firebase/env";
import { tryGetFirebaseAuth } from "@/lib/firebase";
import type { AppUser } from "@/models/user";
import { ensureUserProfile, loadUserProfile } from "@/services/user-profile";

export type AuthContextValue = {
  /** False only after client mount when public env is incomplete. Before mount, treated as true to avoid SSR/client gate mismatch. */
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: AppUser | null;
  error: string | null;
  clearError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  /** Sends Firebase password-reset email. Swallows `user-not-found` so response timing does not reveal whether the email is registered. */
  sendPasswordResetForEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  displayName: string;
  avatarUrl: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
      return { user: action.user, profile: null, loading: true };
    case "PROFILE_SETTLED":
      return { user: action.user, profile: action.profile, loading: false };
    case "USER_REFRESH":
      return { ...state, user: action.user };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [clientHydrated, setClientHydrated] = useState(false);
  const [session, dispatchSession] = useReducer(authSessionReducer, initialSession);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<AuthSessionState>(initialSession);
  useLayoutEffect(() => {
    sessionRef.current = session;
  }, [session]);

  /** Defer “real” env reads until after mount so SSR + first paint match (see `configured`). */
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
      // Private mode / blocked storage — session may not survive refresh; auth still works.
    });

    const unsub = onAuthStateChanged(auth, async (next) => {
      if (cancelled) return;

      if (!next) {
        dispatchSession({ type: "SIGNED_OUT" });
        return;
      }

      const uid = next.uid;
      const snap = sessionRef.current;

      if (snap.user?.uid === uid && snap.loading) {
        if (snap.user !== next) {
          dispatchSession({ type: "USER_REFRESH", user: next });
        }
        return;
      }

      if (snap.user?.uid === uid && snap.profile !== null && snap.loading === false) {
        if (snap.user !== next) {
          dispatchSession({ type: "USER_REFRESH", user: next });
        }
        return;
      }

      dispatchSession({ type: "PROFILE_LOADING", user: next });

      try {
        await ensureUserProfile(next);
        const p = await loadUserProfile(uid);
        if (cancelled) return;
        if (auth.currentUser?.uid !== uid) return;
        dispatchSession({ type: "PROFILE_SETTLED", user: next, profile: p });
      } catch {
        if (cancelled) return;
        if (auth.currentUser?.uid !== uid) return;
        dispatchSession({ type: "PROFILE_SETTLED", user: next, profile: null });
      }
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [clientHydrated]);

  const clearError = useCallback(() => setError(null), []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const auth = tryGetFirebaseAuth();
    if (!auth) throw new Error("Sign-in is not available. Check that this app is configured.");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      const msg = getFirebaseAuthErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null);
    const auth = tryGetFirebaseAuth();
    if (!auth) throw new Error("Sign-in is not available. Check that this app is configured.");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const name = displayName.trim() || cred.user.email?.split("@")[0] || "Member";
      await updateProfile(cred.user, { displayName: name });
      await ensureUserProfile(cred.user);
    } catch (e) {
      const msg = getFirebaseAuthErrorMessage(e);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const sendPasswordResetForEmail = useCallback(async (email: string) => {
    const auth = tryGetFirebaseAuth();
    if (!auth) throw new Error("Sign-in is not available. Check that this app is configured.");
    const trimmed = email.trim();
    if (!trimmed) throw new Error("Enter your email address.");
    try {
      await firebaseSendPasswordResetEmail(auth, trimmed);
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
    await firebaseSignOut(auth);
  }, []);

  const displayName =
    session.profile?.displayName?.trim() ||
    session.user?.displayName?.trim() ||
    session.user?.email?.split("@")[0]?.trim() ||
    "Member";

  const avatarUrl = session.profile?.avatar ?? session.user?.photoURL ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading: session.loading,
      user: session.user,
      profile: session.profile,
      error,
      clearError,
      signInWithEmail,
      signUpWithEmail,
      sendPasswordResetForEmail,
      signOut,
      displayName,
      avatarUrl,
    }),
    [
      avatarUrl,
      clearError,
      configured,
      displayName,
      error,
      session.loading,
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
