import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import type { User } from "firebase/auth";

import { DEFAULT_AVATAR_COLOR_ID, normalizeAvatarColorId } from "@/lib/avatar-colors";
import { actionDebug } from "@/lib/action-debug";
import { logAuthDebug, logAuthDebugError } from "@/lib/firebase/auth-debug";
import { normalizeAuthEmail } from "@/lib/firebase/normalize-email";
import { tryGetFirebaseAuth, tryGetFirestoreDb } from "@/lib/firebase";
import { handleFromDisplayName } from "@/lib/datetime/relative";
import type { FamilyMember, FamilyPet } from "@/models/family-profile";
import type { AppUser, FirestoreUserProfile, ThemePreference } from "@/models/user";
import { normalizeUserRole } from "@/models/user";

const USERS = "users";

/** Backoff for transient Firestore / auth-token propagation after signup. */
const PROFILE_BOOTSTRAP_RETRY_DELAYS_MS = [0, 400, 1000, 2000, 4000];

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
    | "avatarColor"
    | "familyMembers"
    | "pets"
    | "themePreference"
  >
>;

export type BootstrapSignupInput = {
  displayName: string;
  signupRedemptionId: string;
  email: string;
};

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
  const members = Array.isArray(d.familyMembers)
    ? d.familyMembers.map(normalizeMember).filter((m): m is FamilyMember => m !== null)
    : [];
  const pets = Array.isArray(d.pets) ? d.pets.map(normalizePet).filter((p): p is FamilyPet => p !== null) : [];

  return {
    uid,
    email: d.email ?? null,
    displayName: d.displayName?.trim() || "Member",
    avatar: null,
    avatarColor: normalizeAvatarColorId(d.avatarColor ?? DEFAULT_AVATAR_COLOR_ID),
    username: typeof d.username === "string" ? d.username.trim() || null : null,
    bio: d.bio ?? null,
    hometown: d.hometown ?? null,
    phone: d.phone ?? null,
    birthday: d.birthday ?? null,
    role: normalizeUserRole(d.role),
    themePreference: normalizeThemePreference(d.themePreference),
    favoriteWeekends: Array.isArray(d.favoriteWeekends) ? d.favoriteWeekends : [],
    familyBranch: d.familyBranch ?? null,
    familyMembers: members,
    pets,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientProfileError(e: unknown): boolean {
  const code =
    e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code ?? "") : "";
  const msg = e instanceof Error ? e.message : String(e);
  return (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    code === "aborted" ||
    msg.includes("permission") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("network")
  );
}

function profileBootstrapDebugEmail(user: User, fallbackEmail: string): string {
  return normalizeAuthEmail(user.email ?? fallbackEmail);
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
  if (patch.avatarColor !== undefined) {
    data.avatarColor = normalizeAvatarColorId(patch.avatarColor);
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

async function loadUserProfileWithRetry(uid: string, attempt: number): Promise<AppUser | null> {
  const loaded = await loadUserProfile(uid);
  if (loaded) return loaded;
  if (attempt >= PROFILE_BOOTSTRAP_RETRY_DELAYS_MS.length - 1) return null;
  await sleep(PROFILE_BOOTSTRAP_RETRY_DELAYS_MS[attempt + 1] ?? 500);
  return loadUserProfileWithRetry(uid, attempt + 1);
}

/**
 * Creates `users/{uid}` on first sign-up (idempotent). Retries transient failures.
 * Requires a valid invite `signupRedemptionId` — never creates without one.
 */
export async function bootstrapUserProfileOnSignup(
  user: User,
  input: BootstrapSignupInput
): Promise<AppUser> {
  const db = tryGetFirestoreDb();
  if (!db) {
    throw new Error("Your profile could not be created. Check your connection and try again.");
  }

  const displayName = input.displayName.trim() || user.email?.split("@")[0]?.trim() || "Member";
  const email = normalizeAuthEmail(input.email || user.email || "");
  const redemptionId = input.signupRedemptionId.trim();
  if (!redemptionId) {
    throw new Error("Invite redemption is missing. Validate your invite code and try again.");
  }

  const auth = tryGetFirebaseAuth();
  const debugCtx = {
    op: "profile-bootstrap" as const,
    email,
    passwordLength: 0,
  };
  logAuthDebug(auth, debugCtx, { uid: user.uid, redemptionId, step: "start" });

  const ref = doc(db, USERS, user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const loaded = await loadUserProfile(user.uid);
    if (!loaded) {
      throw new Error("Profile exists but could not be loaded. Try again in a moment.");
    }
    logAuthDebug(auth, debugCtx, { uid: user.uid, step: "existing-profile" });
    return loaded;
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < PROFILE_BOOTSTRAP_RETRY_DELAYS_MS.length; attempt++) {
    const delay = PROFILE_BOOTSTRAP_RETRY_DELAYS_MS[attempt] ?? 0;
    if (delay > 0) await sleep(delay);

    try {
      await user.getIdToken(true);
    } catch {
      /* continue — token refresh is best-effort */
    }

    actionDebug("profile", "bootstrap signup attempt", { uid: user.uid, attempt });
    logAuthDebug(auth, debugCtx, { uid: user.uid, redemptionId, attempt, step: "write" });

    try {
      await setDoc(ref, {
        uid: user.uid,
        email,
        displayName,
        signupRedemptionId: redemptionId,
        avatarUrl: null,
        profilePhotoUrl: null,
        avatarColor: DEFAULT_AVATAR_COLOR_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        role: "user",
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
      lastError = e;
      logAuthDebugError(auth, debugCtx, e, { uid: user.uid, attempt, step: "write-failed" });
      actionDebug("profile", "bootstrap signup write failed", { attempt, e });

      const snap = await getDoc(ref);
      if (snap.exists()) break;

      if (attempt < PROFILE_BOOTSTRAP_RETRY_DELAYS_MS.length - 1 && isTransientProfileError(e)) {
        continue;
      }

      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
        throw new Error(
          "Could not create your profile yet. Your account is signed in — wait a moment and tap Retry profile setup."
        );
      }
      throw new Error("Could not create your profile. Try again in a moment.");
    }

    const loaded = await loadUserProfileWithRetry(user.uid, 0);
    if (loaded) {
      logAuthDebug(auth, debugCtx, { uid: user.uid, attempt, step: "ok" });
      return loaded;
    }

    lastError = new Error("Profile write succeeded but profile could not be loaded.");
  }

  logAuthDebugError(auth, debugCtx, lastError, { uid: user.uid, step: "exhausted" });
  throw new Error(
    "Account created but profile setup is still finishing. Stay signed in and tap Retry profile setup."
  );
}

/**
 * Loads an existing profile and merges Auth display metadata. Never creates `users/{uid}` —
 * creation requires invite redemption via {@link bootstrapUserProfileOnSignup}.
 */
export async function syncUserProfile(user: User): Promise<AppUser | null> {
  const db = tryGetFirestoreDb();
  if (!db) return null;

  const auth = tryGetFirebaseAuth();
  const email = profileBootstrapDebugEmail(user, "");
  logAuthDebug(auth, { op: "profile-sync", email, passwordLength: 0 }, { uid: user.uid });

  const ref = doc(db, USERS, user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    actionDebug("profile", "sync missing doc", { uid: user.uid });
    return null;
  }

  const existing = snap.data() as Partial<FirestoreUserProfile>;
  const displayName =
    existing?.displayName?.trim() ||
    user.displayName?.trim() ||
    user.email?.split("@")[0]?.trim() ||
    "Member";

  const patch: Record<string, unknown> = {
    uid: user.uid,
    email: normalizeAuthEmail(user.email ?? existing?.email ?? ""),
    updatedAt: serverTimestamp(),
  };
  if (!existing?.displayName?.trim()) {
    patch.displayName = displayName;
  }
  if (!existing?.avatarColor) {
    patch.avatarColor = DEFAULT_AVATAR_COLOR_ID;
  }

  await setDoc(ref, patch, { merge: true });
  return loadUserProfile(user.uid);
}

/** @deprecated Use {@link syncUserProfile} — kept for call sites that only need a read/sync pass. */
export async function ensureUserProfile(user: User): Promise<void> {
  await syncUserProfile(user);
}
