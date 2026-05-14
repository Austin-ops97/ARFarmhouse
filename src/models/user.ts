export type UserRole = "member" | "owner" | "guest";

export type FirestoreUserProfile = {
  displayName: string;
  email: string | null;
  avatar: string | null;
  createdAt: unknown;
  updatedAt?: unknown;
  role: UserRole;
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
  favoriteWeekends: string[];
  bio: string | null;
  familyBranch: string | null;
};
