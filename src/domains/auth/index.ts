/**
 * Auth domain — identity, profiles, gates.
 * @see Phase 4 domain-driven layout; implementations remain in legacy paths during migration.
 */

export { AuthProvider, useAuth } from "@/contexts/auth-context";
export {
  bootstrapUserProfileOnSignup,
  loadUserProfile,
  saveUserProfile,
  subscribeUserProfile,
} from "@/services/user-profile";
export {
  uploadProfilePhoto,
  uploadFamilyMemberPhoto,
  uploadPetPhoto,
} from "@/services/profile-storage";
export type { AppUser, FirestoreUserProfile, UserRole } from "@/models/user";
export { normalizeUserRole, isProfileOnboardingComplete } from "@/models/user";
