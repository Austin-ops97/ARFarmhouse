export type UserRole = "member" | "owner" | "guest";

export type ThemePreference = "system" | "light" | "dark";

export type FirestoreUserProfile = {
  uid: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  /** Legacy field — prefer `avatarUrl` for new writes */
  avatar?: string | null;
  createdAt: unknown;
  updatedAt?: unknown;
  role: UserRole;
  themePreference: ThemePreference;
  favoriteWeekends: string[];
  bio: string | null;
  familyBranch: string | null;
};

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string;
  avatar: string | null;
  role: UserRole;
  themePreference?: ThemePreference;
  favoriteWeekends: string[];
  bio: string | null;
  familyBranch: string | null;
};
