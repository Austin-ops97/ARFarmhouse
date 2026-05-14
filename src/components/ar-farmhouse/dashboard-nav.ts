import {
  Building2,
  Calendar,
  CheckSquare,
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
  | "map"
  | "tasks"
  | "family"
  | "property"
  | "settings";

export const sidebarNav = [
  { id: "home" as const, label: "Home", icon: Home },
  { id: "feed" as const, label: "Feed", icon: MessageSquare },
  { id: "calendar" as const, label: "Calendar", icon: Calendar },
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
  { id: "map" as const, label: "Map", icon: Map },
  { id: "tasks" as const, label: "Tasks", icon: CheckSquare },
] satisfies ReadonlyArray<{ id: NavId; label: string; icon: typeof Home }>;
