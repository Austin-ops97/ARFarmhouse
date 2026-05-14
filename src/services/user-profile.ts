import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { tryGetFirestoreDb } from "@/lib/firebase/client";
import type { AppUser, FirestoreUserProfile, UserRole } from "@/models/user";
import type { User } from "firebase/auth";

const USERS = "users";

export async function ensureUserProfile(user: User): Promise<void> {
  const db = tryGetFirestoreDb();
  if (!db) return;
  const ref = doc(db, USERS, user.uid);
  const snap = await getDoc(ref);
  const email = user.email ?? null;
  const displayName =
    user.displayName?.trim() ||
    snap.data()?.displayName ||
    email?.split("@")[0]?.trim() ||
    "Member";
  const base: Partial<FirestoreUserProfile> = {
    email,
    displayName,
    avatar: user.photoURL ?? (snap.data()?.avatar as string | null) ?? null,
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists) {
    await setDoc(ref, {
      ...base,
      createdAt: serverTimestamp(),
      role: "member" satisfies UserRole,
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
  return {
    uid,
    email: d.email ?? null,
    displayName: d.displayName ?? "Member",
    avatar: d.avatar ?? null,
    role: (d.role as UserRole) ?? "member",
    favoriteWeekends: Array.isArray(d.favoriteWeekends) ? d.favoriteWeekends : [],
    bio: d.bio ?? null,
    familyBranch: d.familyBranch ?? null,
  };
}
