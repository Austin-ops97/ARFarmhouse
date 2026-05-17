import type { AvatarColorId } from "@/lib/avatar-colors";
import { DEFAULT_AVATAR_COLOR_ID, normalizeAvatarColorId } from "@/lib/avatar-colors";
import type { FamilyMember, FamilyPet } from "@/models/family-profile";

/** App access role stored on `users/{uid}`. */
export type UserRole = "user" | "admin";

/** Legacy values still present in older Firestore documents. */
export type LegacyUserRole = "member" | "owner" | "guest";

export function normalizeUserRole(raw: unknown): UserRole {
  if (raw === "admin" || raw === "owner") return "admin";
  return "user";
}

export type ThemePreference = "system" | "light" | "dark";

export type NotificationPreferences = {
  push?: boolean;
  emailDigest?: boolean;
  weekendReminders?: boolean;
};

export type FirestoreUserProfile = {
  uid: string;
  displayName: string;
  email: string | null;
  avatarUrl?: string | null;
  profilePhotoUrl?: string | null;
  /** Legacy — no longer used for display */
  avatar?: string | null;
  avatarColor?: string | null;
  username?: string | null;
  bio: string | null;
  hometown: string | null;
  phone: string | null;
  birthday: string | null;
  createdAt: unknown;
  updatedAt?: unknown;
  role: UserRole;
  notificationsEnabled?: boolean;
  notificationPreferences?: NotificationPreferences;
  themePreference: ThemePreference;
  favoriteWeekends: string[];
  familyBranch: string | null;
  familyMembers?: FamilyMember[];
  pets?: FamilyPet[];
};

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string;
  /** @deprecated Profile photos removed — use {@link avatarColor} + initials. */
  avatar: string | null;
  avatarColor: AvatarColorId;
  username: string | null;
  bio: string | null;
  hometown: string | null;
  phone: string | null;
  birthday: string | null;
  role: UserRole;
  themePreference?: ThemePreference;
  favoriteWeekends: string[];
  familyBranch: string | null;
  familyMembers: FamilyMember[];
  pets: FamilyPet[];
};

export function isProfileOnboardingComplete(profile: AppUser | null): boolean {
  if (!profile) return false;
  return Boolean(profile.displayName?.trim());
}

export function resolveAvatarColor(profile: Pick<AppUser, "avatarColor"> | null | undefined): AvatarColorId {
  return normalizeAvatarColorId(profile?.avatarColor ?? DEFAULT_AVATAR_COLOR_ID);
}
