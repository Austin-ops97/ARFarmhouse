import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";

import { actionDebug } from "@/lib/action-debug";
import { tryGetFirestoreDb } from "@/lib/firebase";
import { handleFromDisplayName } from "@/lib/datetime/relative";
import type { FamilyMember, FamilyPet } from "@/models/family-profile";
import type { AppUser, FirestoreUserProfile, ThemePreference, UserRole } from "@/models/user";

const USERS = "users";

export type ProfilePatch = Partial<
  Pick<
    AppUser,
    | "displayName"
    | "username"
    | "bio"
    | "hometown"
    | "phone"
    | "birthday"
    | "avatar"
    | "familyMembers"
    | "pets"
    | "themePreference"
  >
>;

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

function normalizeMember(raw: unknown): FamilyMember | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const id = typeof d.id === "string" ? d.id : "";
  const name = typeof d.name === "string" ? d.name.trim() : "";
  if (!id || !name) return null;
  const rel = d.relationship;
  const relationship =
    rel === "spouse" || rel === "partner" || rel === "child" || rel === "relative" || rel === "other"
      ? rel
      : "other";
  return {
    id,
    name,
    relationship,
    photoUrl: typeof d.photoUrl === "string" ? d.photoUrl : null,
    birthday: typeof d.birthday === "string" ? d.birthday : null,
    notes: typeof d.notes === "string" ? d.notes : null,
  };
}

function normalizePet(raw: unknown): FamilyPet | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const id = typeof d.id === "string" ? d.id : "";
  const name = typeof d.name === "string" ? d.name.trim() : "";
  const species = typeof d.species === "string" ? d.species.trim() : "";
  if (!id || !name || !species) return null;
  return {
    id,
    name,
    species,
    breed: typeof d.breed === "string" ? d.breed : null,
    notes: typeof d.notes === "string" ? d.notes : null,
    photoUrl: typeof d.photoUrl === "string" ? d.photoUrl : null,
  };
}

function mapFirestoreUser(uid: string, d: Partial<FirestoreUserProfile>): AppUser {
  const avatar =
    (d.profilePhotoUrl as string | null | undefined) ??
    (d.avatarUrl as string | null | undefined) ??
    (d.avatar as string | null | undefined) ??
    null;
  const members = Array.isArray(d.familyMembers)
    ? d.familyMembers.map(normalizeMember).filter((m): m is FamilyMember => m !== null)
    : [];
  const pets = Array.isArray(d.pets) ? d.pets.map(normalizePet).filter((p): p is FamilyPet => p !== null) : [];

  return {
    uid,
    email: d.email ?? null,
    displayName: d.displayName?.trim() || "Member",
    avatar,
    username: typeof d.username === "string" ? d.username.trim() || null : null,
    bio: d.bio ?? null,
    hometown: d.hometown ?? null,
    phone: d.phone ?? null,
    birthday: d.birthday ?? null,
    role: (d.role as UserRole) ?? "member",
    themePreference: normalizeThemePreference(d.themePreference),
    favoriteWeekends: Array.isArray(d.favoriteWeekends) ? d.favoriteWeekends : [],
    familyBranch: d.familyBranch ?? null,
    familyMembers: members,
    pets,
  };
}

export function profileHandle(profile: Pick<AppUser, "username" | "displayName">): string {
  if (profile.username?.trim()) return profile.username.trim().replace(/^@/, "");
  return handleFromDisplayName(profile.displayName);
}

export async function loadUserProfile(uid: string): Promise<AppUser | null> {
  const db = tryGetFirestoreDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, USERS, uid));
  if (!snap.exists()) return null;
  return mapFirestoreUser(uid, snap.data() as Partial<FirestoreUserProfile>);
}

export function subscribeUserProfile(
  uid: string,
  onProfile: (profile: AppUser | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = tryGetFirestoreDb();
  if (!db) {
    onProfile(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, USERS, uid),
    (snap) => {
      if (!snap.exists()) {
        onProfile(null);
        return;
      }
      onProfile(mapFirestoreUser(uid, snap.data() as Partial<FirestoreUserProfile>));
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function saveUserProfile(uid: string, patch: ProfilePatch): Promise<AppUser | null> {
  const db = tryGetFirestoreDb();
  if (!db) throw new Error("Firestore unavailable. Check your connection and try again.");
  if (!uid.trim()) throw new Error("Sign in again to save your profile.");

  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.displayName !== undefined) data.displayName = patch.displayName.trim();
  if (patch.username !== undefined) data.username = patch.username?.trim() || null;
  if (patch.bio !== undefined) data.bio = patch.bio?.trim() || null;
  if (patch.hometown !== undefined) data.hometown = patch.hometown?.trim() || null;
  if (patch.phone !== undefined) data.phone = patch.phone?.trim() || null;
  if (patch.birthday !== undefined) data.birthday = patch.birthday?.trim() || null;
  if (patch.avatar !== undefined) {
    data.avatarUrl = patch.avatar;
    data.profilePhotoUrl = patch.avatar;
  }
  if (patch.familyMembers !== undefined) data.familyMembers = patch.familyMembers;
  if (patch.pets !== undefined) data.pets = patch.pets;
  if (patch.themePreference !== undefined) data.themePreference = patch.themePreference;

  if (Object.keys(data).length <= 1) {
    return loadUserProfile(uid);
  }

  actionDebug("profile", "save start", { uid, keys: Object.keys(data) });
  try {
    await setDoc(doc(db, USERS, uid), data, { merge: true });
    const next = await loadUserProfile(uid);
    actionDebug("profile", "save complete", { uid });
    return next;
  } catch (e) {
    actionDebug("profile", "save failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      throw new Error("Could not save profile. Check that you are signed in and Firestore rules allow updates.");
    }
    throw new Error(`Could not save profile. ${msg}`);
  }
}

/** Creates a new Firestore profile on first sign-up (does not overwrite existing docs). */
export async function bootstrapUserProfileOnSignup(
  user: User,
  input: { displayName: string }
): Promise<AppUser> {
  const db = tryGetFirestoreDb();
  if (!db) {
    throw new Error("Your profile could not be created. Check your connection and try again.");
  }

  const ref = doc(db, USERS, user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const existing = await loadUserProfile(user.uid);
    if (!existing) {
      throw new Error("Profile exists but could not be loaded. Try signing in again.");
    }
    return existing;
  }

  const displayName = input.displayName.trim() || user.email?.split("@")[0]?.trim() || "Member";
  const email = user.email ?? null;

  actionDebug("profile", "bootstrap signup", { uid: user.uid });
  try {
    await setDoc(ref, {
      uid: user.uid,
      email,
      displayName,
      avatarUrl: null,
      profilePhotoUrl: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: "member" satisfies UserRole,
      themePreference: readBootstrapThemePreference(),
      favoriteWeekends: [],
      bio: null,
      hometown: null,
      phone: null,
      birthday: null,
      username: null,
      familyBranch: null,
      familyMembers: [],
      pets: [],
    });
  } catch (e) {
    actionDebug("profile", "bootstrap signup failed", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
      throw new Error("Could not create your profile. Check that you are signed in and Firestore rules allow it.");
    }
    throw new Error("Could not create your profile. Try again in a moment.");
  }

  const loaded = await loadUserProfile(user.uid);
  if (!loaded) {
    throw new Error("Account created but profile setup failed. Try signing in again.");
  }
  return loaded;
}

/** One Firestore read; creates the profile doc when missing (startup-critical path). */
export async function syncUserProfile(user: User): Promise<AppUser | null> {
  const db = tryGetFirestoreDb();
  if (!db) return null;
  const ref = doc(db, USERS, user.uid);
  const snap = await getDoc(ref);
  const email = user.email ?? null;
  const existing = snap.exists() ? (snap.data() as Partial<FirestoreUserProfile>) : undefined;
  const displayName =
    existing?.displayName?.trim() ||
    user.displayName?.trim() ||
    email?.split("@")[0]?.trim() ||
    "Member";
  const avatarUrl =
    existing?.profilePhotoUrl ??
    existing?.avatarUrl ??
    existing?.avatar ??
    user.photoURL ??
    null;

  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email,
      displayName,
      avatarUrl,
      profilePhotoUrl: avatarUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      role: "member" satisfies UserRole,
      themePreference: readBootstrapThemePreference(),
      favoriteWeekends: [],
      bio: null,
      hometown: null,
      phone: null,
      birthday: null,
      username: null,
      familyBranch: null,
      familyMembers: [],
      pets: [],
    });
  } else {
    const patch: Record<string, unknown> = {
      uid: user.uid,
      email,
      updatedAt: serverTimestamp(),
    };
    if (!existing?.displayName?.trim()) {
      patch.displayName = displayName;
    }
    if (!existing?.profilePhotoUrl && !existing?.avatarUrl && !existing?.avatar) {
      patch.avatarUrl = avatarUrl;
      patch.profilePhotoUrl = avatarUrl;
    }
    await setDoc(ref, patch, { merge: true });
  }

  return loadUserProfile(user.uid);
}

export async function ensureUserProfile(user: User): Promise<void> {
  await syncUserProfile(user);
}
