import { PROPERTY_HERO_IMAGE_URL } from "@/lib/brand";

export type StatusIconKey = "cloud" | "zap" | "router" | "droplets" | "users" | "home" | "lock" | "camera";

export type PropertyStatusCard = {
  id: string;
  title: string;
  value: string;
  hint?: string;
  icon: StatusIconKey;
  tone?: "default" | "mint" | "amber" | "rose";
};

/** Live telemetry will populate this — UI shows dormant guidance until connected. */
export const PROPERTY_STATUS_CARDS: PropertyStatusCard[] = [];

export type TaskPriority = "low" | "medium" | "high" | "emergency";
export type TaskListSection = "active" | "maintenance" | "completed" | "weekend" | "emergency";
export type TaskBoardColumn = "todo" | "doing" | "done";

export type TaskSource = "manual" | "routine";

export type HouseTask = {
  id: string;
  title: string;
  listSection: TaskListSection;
  boardColumn: TaskBoardColumn;
  boardOrder: number;
  priority: TaskPriority;
  dueLabel: string;
  done: boolean;
  assignee: { name: string; avatar: string };
  photoThumbs?: string[];
  commentsPreview: { author: string; text: string }[];
  /** Unix ms — task will delete at this time after completion (30s cooldown). */
  deleteScheduledAt?: number | null;
  source?: TaskSource;
  routineId?: string;
  description?: string;
};

export type RoutineIntervalUnit = "days" | "weeks" | "months" | "years" | "quarterly";

export type HouseRoutine = {
  id: string;
  title: string;
  description: string;
  intervalValue: number;
  intervalUnit: RoutineIntervalUnit;
  startDateMs: number;
  nextRunAtMs: number;
  lastGeneratedAtMs: number | null;
  isActive: boolean;
  createdBy: string;
  assigneeName: string;
  assigneeAvatar: string;
  priority: TaskPriority;
  category: string;
};

export const INITIAL_HOUSE_TASKS: HouseTask[] = [];

export type MapPinKind =
  | "trail"
  | "cabin"
  | "fishing"
  | "gate"
  | "utility"
  | "dock"
  | "gathering"
  | "stand"
  | "camera"
  | "hunting"
  | "emergency"
  | "atv";

export type PropertyMapPin = {
  id: string;
  label: string;
  kind: MapPinKind;
  x: number;
  y: number;
  blurb: string;
  trailCondition?: "ideal" | "soft" | "wet" | "snow";
  linkedEvent?: string;
  favorite?: boolean;
};

export type ResourceStatus = "available" | "in_use" | "maintenance" | "offline";

export type InventoryCategory = "consumables" | "maintenance" | "outdoor" | "fuel" | "general";

export type PropertyMapTrail = {
  id: string;
  name: string;
  d: string;
  condition: string;
};

export const PROPERTY_MAP_PINS: PropertyMapPin[] = [];
export const PROPERTY_MAP_TRAILS: PropertyMapTrail[] = [];
export const PROPERTY_MAP_RECENT_TRAILS: { trail: string; who: string; when: string }[] = [];

export const PROPERTY_MAP_BACKDROP = PROPERTY_HERO_IMAGE_URL;

export type PropertyResource = {
  id: string;
  category: string;
  title: string;
  summary: string;
  detail: string;
  tags: string[];
  status?: ResourceStatus;
  notes?: string;
};

export const PROPERTY_RESOURCES: PropertyResource[] = [];

export type PropertyInventoryItem = {
  id: string;
  label: string;
  pct: number;
  unit: string;
  lastUpdatedBy: string;
  lastUpdated: string;
  restockHint?: string;
  low: boolean;
  category?: InventoryCategory;
};

export const PROPERTY_INVENTORY: PropertyInventoryItem[] = [];
