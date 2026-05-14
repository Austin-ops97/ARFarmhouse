import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

import { tryGetFirestoreDb } from "@/lib/firebase";
import type { AppUser, FirestoreUserProfile, ThemePreference, UserRole } from "@/models/user";

const USERS = "users";

function readBootstrapThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const t = localStorage.getItem("ar-theme");
    if (t === "light") return "light";
    if (t === "dark") return "dark";
  } catch {
    /* ignore */
  }
  return "system";
}

function normalizeThemePreference(value: unknown): ThemePreference | undefined {
  if (value === "light" || value === "dark" || value === "system") return value;
  return undefined;
}

export async function ensureUserProfile(user: User): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const ref = doc(db, USERS, user.uid);
  const snap = await getDoc(ref);
  const email = user.email ?? null;
  const displayName =
    user.displayName?.trim() ||
    (snap.data()?.displayName as string | undefined)?.trim() ||
    email?.split("@")[0]?.trim() ||
    "Member";
  const existing = snap.data() as Partial<FirestoreUserProfile> | undefined;
  const avatarUrl =
    user.photoURL ??
    (existing?.avatarUrl as string | null | undefined) ??
    (existing?.avatar as string | null | undefined) ??
    null;

  const base: Partial<FirestoreUserProfile> = {
    uid: user.uid,
    email,
    displayName,
    avatarUrl,
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists) {
    await setDoc(ref, {
      ...base,
      createdAt: serverTimestamp(),
      role: "member" satisfies UserRole,
      themePreference: readBootstrapThemePreference(),
      favoriteWeekends: [],
      bio: null,
      familyBranch: null,
    });
    return;
  }

  await setDoc(ref, base, { merge: true });
}

export async function loadUserProfile(uid: string): Promise<AppUser | null> {
  const db = tryGetFirestoreDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists) return null;
  const d = snap.data() as Partial<FirestoreUserProfile>;
  const avatar =
    (d.avatarUrl as string | null | undefined) ?? (d.avatar as string | null | undefined) ?? null;
  return {
    uid,
    email: d.email ?? null,
    displayName: d.displayName ?? "Member",
    avatar,
    role: (d.role as UserRole) ?? "member",
    themePreference: normalizeThemePreference(d.themePreference),
    favoriteWeekends: Array.isArray(d.favoriteWeekends) ? d.favoriteWeekends : [],
    bio: d.bio ?? null,
    familyBranch: d.familyBranch ?? null,
  };
}
