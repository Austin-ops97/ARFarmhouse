"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
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
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { isFirebaseConfigured } from "@/lib/firebase/env";
import { tryGetFirebaseAuth } from "@/lib/firebase/client";
import type { AppUser } from "@/models/user";
import { ensureUserProfile, loadUserProfile } from "@/services/user-profile";

function mapAuthError(e: unknown): string {
  const code = e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account already exists for this email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: AppUser | null;
  error: string | null;
  clearError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  displayName: string;
  avatarUrl: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configured] = useState(() => isFirebaseConfigured());
  const [loading, setLoading] = useState(() => isFirebaseConfigured());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const auth = tryGetFirebaseAuth();
    if (!auth) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    const unsub = onAuthStateChanged(auth, async (next) => {
      setUser(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        await ensureUserProfile(next);
        const p = await loadUserProfile(next.uid);
        setProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [configured]);

  const clearError = useCallback(() => setError(null), []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    const auth = tryGetFirebaseAuth();
    if (!auth) throw new Error("Auth unavailable");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      const msg = mapAuthError(e);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName: string) => {
    setError(null);
    const auth = tryGetFirebaseAuth();
    if (!auth) throw new Error("Auth unavailable");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const name = displayName.trim() || cred.user.email?.split("@")[0] || "Member";
      await updateProfile(cred.user, { displayName: name });
      await ensureUserProfile(cred.user);
    } catch (e) {
      const msg = mapAuthError(e);
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = tryGetFirebaseAuth();
    if (!auth) return;
    await firebaseSignOut(auth);
  }, []);

  const displayName =
    profile?.displayName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split("@")[0]?.trim() ||
    "Member";

  const avatarUrl = profile?.avatar ?? user?.photoURL ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      profile,
      error,
      clearError,
      signInWithEmail,
      signUpWithEmail,
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
      loading,
      profile,
      signInWithEmail,
      signOut,
      signUpWithEmail,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
