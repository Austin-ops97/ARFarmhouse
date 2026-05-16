import {
  Building2,
  Calendar,
  CheckSquare,
  Compass,
  Home,
  Images,
  Map,
  MessageSquare,
  Settings,
  UserRound,
} from "lucide-react";

export type NavId =
  | "home"
  | "feed"
  | "calendar"
  | "guide"
  | "map"
  | "tasks"
  | "album"
  | "property"
  | "profile"
  | "settings";

export const sidebarNav = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "feed" as const, label: "Feed", icon: MessageSquare },
  { id: "calendar" as const, label: "Calendar", icon: Calendar },
  { id: "guide" as const, label: "Guide", icon: Compass },
  { id: "map" as const, label: "Map", icon: Map },
  { id: "tasks" as const, label: "Tasks", icon: CheckSquare },
  { id: "album" as const, label: "Photo Album", icon: Images },
  { id: "property" as const, label: "Property", icon: Building2 },
  { id: "profile" as const, label: "Profile", icon: UserRound },
  { id: "settings" as const, label: "Settings", icon: Settings },
] satisfies ReadonlyArray<{ id: NavId; label: string; icon: typeof Home }>;

/** Long-form labels for the mobile slide-out drawer */
export const mobileDrawerLabel: Record<NavId, string> = {
  home: "Home",
  feed: "Feed",
  calendar: "Calendar",
  guide: "Local Guide",
  map: "Map",
  tasks: "Tasks",
  album: "Photo Album",
  property: "Property",
  profile: "Profile",
  settings: "Settings",
};
