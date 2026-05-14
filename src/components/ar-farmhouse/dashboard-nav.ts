import {
  Building2,
  Calendar,
  CheckSquare,
  Compass,
  Home,
  Map,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";

export type NavId =
  | "home"
  | "feed"
  | "calendar"
  | "guide"
  | "map"
  | "tasks"
  | "family"
  | "property"
  | "settings";

export const sidebarNav = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "feed" as const, label: "Feed", icon: MessageSquare },
  { id: "calendar" as const, label: "Calendar", icon: Calendar },
  { id: "guide" as const, label: "Guide", icon: Compass },
  { id: "map" as const, label: "Map", icon: Map },
  { id: "tasks" as const, label: "Tasks", icon: CheckSquare },
  { id: "family" as const, label: "Family", icon: Users },
  { id: "property" as const, label: "Property", icon: Building2 },
  { id: "settings" as const, label: "Settings", icon: Settings },
] satisfies ReadonlyArray<{ id: NavId; label: string; icon: typeof Home }>;

export const mobileNav = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "feed" as const, label: "Feed", icon: MessageSquare },
  { id: "calendar" as const, label: "Calendar", icon: Calendar },
  { id: "guide" as const, label: "Guide", icon: Compass },
  { id: "tasks" as const, label: "Tasks", icon: CheckSquare },
  { id: "map" as const, label: "Map", icon: Map },
  { id: "property" as const, label: "Property", icon: Building2 },
] satisfies ReadonlyArray<{ id: NavId; label: string; icon: typeof Home }>;
