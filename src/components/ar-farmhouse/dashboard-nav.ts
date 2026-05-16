import {
  Building2,
  Calendar,
  CheckSquare,
  ClipboardList,
  Compass,
  Home,
  Images,
  Map,
  MessageSquare,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";

import { isAdmin } from "@/lib/permissions";
import type { AppUser } from "@/models/user";

export type NavId =
  | "home"
  | "feed"
  | "calendar"
  | "guide"
  | "map"
  | "tasks"
  | "checklists"
  | "album"
  | "property"
  | "profile"
  | "settings"
  | "admin";

export type NavItem = { id: NavId; label: string; icon: typeof Home };

export const sidebarNav: readonly NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "feed", label: "Feed", icon: MessageSquare },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "guide", label: "Guide", icon: Compass },
  { id: "map", label: "Map", icon: Map },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "checklists", label: "Checklists", icon: ClipboardList },
  { id: "album", label: "Photo Album", icon: Images },
  { id: "property", label: "Property", icon: Building2 },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "settings", label: "Settings", icon: Settings },
];

/** Admin-only nav entry (inserted before Settings when the user is an admin). */
export const adminNavItem: NavItem = { id: "admin", label: "Admin", icon: Shield };

/** Returns primary nav items visible for the signed-in user (admin tab gated by role). */
export function getSidebarNavForUser(profile: Pick<AppUser, "role"> | null): NavItem[] {
  if (!isAdmin(profile)) return [...sidebarNav];
  const withoutSettings = sidebarNav.filter((item) => item.id !== "settings");
  return [...withoutSettings, adminNavItem, sidebarNav.find((item) => item.id === "settings")!];
}

/** Long-form labels for the mobile slide-out drawer */
export const mobileDrawerLabel: Record<NavId, string> = {
  home: "Home",
  feed: "Feed",
  calendar: "Calendar",
  guide: "Local Guide",
  map: "Map",
  tasks: "Tasks",
  checklists: "Checklists",
  album: "Photo Album",
  property: "Property",
  profile: "Profile",
  settings: "Settings",
  admin: "Admin",
};
