import type { FamilyMember, FamilyPet } from "@/models/family-profile";

export type UserRole = "member" | "owner" | "guest";

export type ThemePreference = "system" | "light" | "dark";

export type FirestoreUserProfile = {
  uid: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  profilePhotoUrl?: string | null;
  /** Legacy field — prefer `avatarUrl` / `profilePhotoUrl` */
  avatar?: string | null;
  username?: string | null;
  bio: string | null;
  hometown: string | null;
  phone: string | null;
  birthday: string | null;
  createdAt: unknown;
  updatedAt?: unknown;
  role: UserRole;
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
  avatar: string | null;
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

export function resolveProfilePhoto(profile: Pick<AppUser, "avatar">): string | null {
  return profile.avatar;
}

export function isProfileOnboardingComplete(profile: AppUser | null): boolean {
  if (!profile) return false;
  const hasName = Boolean(profile.displayName?.trim());
  const hasPhoto = Boolean(profile.avatar);
  return hasName && hasPhoto;
}
