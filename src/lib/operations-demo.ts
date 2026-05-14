export type StatusIconKey = "cloud" | "zap" | "router" | "droplets" | "users" | "home" | "lock" | "camera";

export type DemoStatusCard = {
  id: string;
  title: string;
  value: string;
  hint?: string;
  icon: StatusIconKey;
  tone?: "default" | "mint" | "amber" | "rose";
};

export const demoStatusCards: DemoStatusCard[] = [
  { id: "s1", title: "Weather", value: "54° · clear", hint: "Aspen Ridge · light breeze", icon: "cloud", tone: "mint" },
  { id: "s2", title: "Power", value: "Grid + standby", hint: "Generator ready · last test Tue", icon: "zap", tone: "default" },
  { id: "s3", title: "Internet", value: "Starlink · solid", hint: "42 ms · guest QoS on", icon: "router", tone: "mint" },
  { id: "s4", title: "Water", value: "Tanks 88%", hint: "Well pump quiet · softener cycle Thu", icon: "droplets", tone: "default" },
  { id: "s5", title: "Occupancy", value: "8 guests", hint: "Family weekend · quiet hours on", icon: "users", tone: "amber" },
  { id: "s6", title: "Arrivals", value: "Next Fri 3pm", hint: "Morgan + Jordan · staggered", icon: "home", tone: "default" },
  { id: "s7", title: "Gate", value: "Closed · latched", hint: "South sensor nominal", icon: "lock", tone: "mint" },
  { id: "s8", title: "Ridge camera", value: "Live", hint: "North field · motion low", icon: "camera", tone: "default" },
];
export type TaskPriority = "low" | "medium" | "high" | "emergency";
export type TaskListSection = "active" | "maintenance" | "completed" | "weekend" | "emergency";
export type TaskBoardColumn = "todo" | "doing" | "done";

export type DemoTask = {
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
};

const av = (i: number) =>
  [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&q=80",
  ][i % 4];

const thumb = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=240&q=75`;

export const initialDemoTasks: DemoTask[] = [
  {
    id: "t1",
    title: "Refill propane",
    listSection: "active",
    boardColumn: "doing",
    boardOrder: 0,
    priority: "high",
    dueLabel: "Today · 4pm",
    done: false,
    assignee: { name: "Alex T.", avatar: av(3) },
    photoThumbs: [thumb("1600585154340-be6161a56a0c")],
    commentsPreview: [{ author: "Morgan", text: "Tank read 38% this morning." }],
  },
  {
    id: "t2",
    title: "Clean guest cabin",
    listSection: "weekend",
    boardColumn: "todo",
    boardOrder: 0,
    priority: "medium",
    dueLabel: "Fri · before arrivals",
    done: false,
    assignee: { name: "Sam R.", avatar: av(2) },
    commentsPreview: [{ author: "Jordan", text: "Linen closet is stocked." }],
  },
  {
    id: "t3",
    title: "Check feeder batteries",
    listSection: "maintenance",
    boardColumn: "todo",
    boardOrder: 1,
    priority: "low",
    dueLabel: "Sun",
    done: false,
    assignee: { name: "Jordan K.", avatar: av(1) },
    photoThumbs: [thumb("1441974231531-c6227db76b6e")],
    commentsPreview: [],
  },
  {
    id: "t4",
    title: "Dock pressure washing",
    listSection: "active",
    boardColumn: "todo",
    boardOrder: 2,
    priority: "medium",
    dueLabel: "Wed",
    done: false,
    assignee: { name: "Alex T.", avatar: av(3) },
    commentsPreview: [{ author: "Riley", text: "Borrowed the soft brush." }],
  },
  {
    id: "t5",
    title: "Mow north trail",
    listSection: "weekend",
    boardColumn: "doing",
    boardOrder: 1,
    priority: "low",
    dueLabel: "Sat AM",
    done: false,
    assignee: { name: "Casey L.", avatar: av(0) },
    commentsPreview: [],
  },
  {
    id: "t6",
    title: "Replace flood lights · barn",
    listSection: "maintenance",
    boardColumn: "todo",
    boardOrder: 3,
    priority: "high",
    dueLabel: "Overdue 1d",
    done: false,
    assignee: { name: "Morgan A.", avatar: av(0) },
    photoThumbs: [thumb("1507679799987-c119795cdc9e")],
    commentsPreview: [{ author: "Alex", text: "Bulbs in the shop drawer." }],
  },
  {
    id: "t7",
    title: "Prepare boats",
    listSection: "weekend",
    boardColumn: "todo",
    boardOrder: 4,
    priority: "medium",
    dueLabel: "Fri",
    done: false,
    assignee: { name: "Jordan K.", avatar: av(1) },
    commentsPreview: [{ author: "Sam", text: "Covers off, batteries checked." }],
  },
  {
    id: "t8",
    title: "Restock drinks · great room",
    listSection: "weekend",
    boardColumn: "doing",
    boardOrder: 2,
    priority: "low",
    dueLabel: "Fri eve",
    done: false,
    assignee: { name: "Riley P.", avatar: av(2) },
    commentsPreview: [],
  },
  {
    id: "t9",
    title: "Generator inspection",
    listSection: "maintenance",
    boardColumn: "doing",
    boardOrder: 3,
    priority: "high",
    dueLabel: "Thu",
    done: false,
    assignee: { name: "Alex T.", avatar: av(3) },
    commentsPreview: [{ author: "Morgan", text: "Log sheet in binder." }],
  },
  {
    id: "t10",
    title: "Clear north gate sensor",
    listSection: "emergency",
    boardColumn: "todo",
    boardOrder: 5,
    priority: "emergency",
    dueLabel: "ASAP",
    done: false,
    assignee: { name: "Jordan K.", avatar: av(1) },
    commentsPreview: [{ author: "Alex", text: "Deer brush — low voltage read." }],
  },
  {
    id: "t11",
    title: "Hot tub chemistry",
    listSection: "completed",
    boardColumn: "done",
    boardOrder: 0,
    priority: "medium",
    dueLabel: "Done Tue",
    done: true,
    assignee: { name: "Sam R.", avatar: av(2) },
    commentsPreview: [{ author: "Morgan", text: "Levels perfect." }],
  },
  {
    id: "t12",
    title: "Pantry vendor delivery",
    listSection: "completed",
    boardColumn: "done",
    boardOrder: 1,
    priority: "low",
    dueLabel: "Done Mon",
    done: true,
    assignee: { name: "Morgan A.", avatar: av(0) },
    commentsPreview: [],
  },
];

export type MapPinKind =
  | "trail"
  | "cabin"
  | "fishing"
  | "gate"
  | "utility"
  | "dock"
  | "gathering"
  | "stand"
  | "camera";

export type DemoMapPin = {
  id: string;
  label: string;
  kind: MapPinKind;
  x: number;
  y: number;
  blurb: string;
  trailCondition?: "ideal" | "soft" | "wet" | "snow";
};

export const demoMapPins: DemoMapPin[] = [
  { id: "p1", label: "North Trail · east fork", kind: "trail", x: 22, y: 28, blurb: "Dry tread · elk sign last week", trailCondition: "ideal" },
  { id: "p2", label: "River Path landing", kind: "fishing", x: 38, y: 62, blurb: "Quiet eddy · morning shade", trailCondition: "soft" },
  { id: "p3", label: "Deer Stand Ridge", kind: "stand", x: 72, y: 22, blurb: "Wind from NW · whisper-only zone", trailCondition: "ideal" },
  { id: "p4", label: "Main cabin loop", kind: "cabin", x: 48, y: 48, blurb: "Lights on dusk timer", trailCondition: "ideal" },
  { id: "p5", label: "Sunset Point", kind: "gathering", x: 18, y: 72, blurb: "Fire ring stocked · windbreak up", trailCondition: "ideal" },
  { id: "p6", label: "South service gate", kind: "gate", x: 85, y: 55, blurb: "Secured · sensor nominal", trailCondition: "ideal" },
  { id: "p7", label: "Boat dock", kind: "dock", x: 55, y: 78, blurb: "Two slips · bumpers replaced", trailCondition: "wet" },
  { id: "p8", label: "Pump house", kind: "utility", x: 62, y: 38, blurb: "Pressure steady · winterize checklist in Tasks", trailCondition: "ideal" },
  { id: "p9", label: "Ridge camera", kind: "camera", x: 68, y: 30, blurb: "Live preview · 2m latency", trailCondition: "ideal" },
];

export const demoMapTrails = [
  { id: "tr-north", name: "North Trail", d: "M 8 35 Q 22 28 38 40 T 55 32", condition: "Ideal · dry" as const },
  { id: "tr-river", name: "River Path", d: "M 32 55 Q 42 62 52 70 T 68 78", condition: "Soft mud near landing" as const },
  { id: "tr-ridge", name: "Deer Stand Ridge", d: "M 58 18 Q 68 22 76 28 T 82 38", condition: "Clear · light dusting above 9.2k" as const },
  { id: "tr-cabin", name: "Main Cabin Loop", d: "M 40 42 Q 48 48 56 52 T 62 46", condition: "Evening glow · easy pace" as const },
  { id: "tr-sunset", name: "Sunset Point", d: "M 25 68 Q 20 72 16 78 T 12 85", condition: "Open view · bring layers" as const },
];

export const demoRecentlyExplored = [
  { trail: "River Path", who: "Jordan", when: "Yesterday · dusk" },
  { trail: "North Trail", who: "Sam + kids", when: "Sun morning" },
  { trail: "Sunset Point", who: "Morgan", when: "Fri evening" },
];

export type DemoResource = {
  id: string;
  category: string;
  title: string;
  summary: string;
  detail: string;
  tags: string[];
};

export const demoResources: DemoResource[] = [
  {
    id: "r1",
    category: "Connectivity",
    title: "Wi-Fi · Aspen Ridge",
    summary: "Network name and guest behavior",
    detail:
      "Primary SSID: AspenRidge-Core (hidden on request). Guest: AspenRidge-Guest — bandwidth capped kindly for video calls. Router closet in mudroom; if blinking amber, power-cycle once only.",
    tags: ["wifi", "guest"],
  },
  {
    id: "r2",
    category: "Access",
    title: "Gate codes · 2026 season",
    summary: "Pedestrian and vehicle",
    detail:
      "Main gate keypad: see laminated card in kitchen drawer (rotates quarterly). Service gate: call Alex before sharing. Never post codes in Feed — text the thread instead.",
    tags: ["gates", "security"],
  },
  {
    id: "r3",
    category: "Safety",
    title: "Emergency contacts",
    summary: "Local + property",
    detail:
      "County sheriff non-emergency on fridge magnet. Nearest clinic: 24mi. Poison control card in pantry. Property manager weekend line in Resources favorites.",
    tags: ["safety"],
  },
  {
    id: "r4",
    category: "Equipment",
    title: "Generator warm start",
    summary: "Soft sequence · no rush",
    detail:
      "Flip mains to OFF · open vent · choke half · crank 3s bursts max. When stable, mains ON one leg at a time. Full checklist PDF in drawer — paper wins when LTE is thin.",
    tags: ["power", "pdf"],
  },
  {
    id: "r5",
    category: "Water",
    title: "Shutoffs you might need",
    summary: "Calm labels · no mystery valves",
    detail:
      "Main: crawl east wall · blue tag. Irrigation: barn north face. Guest suite isolation: under sink twist valves — clockwise gently.",
    tags: ["utilities"],
  },
  {
    id: "r6",
    category: "House norms",
    title: "Property rules · the short version",
    summary: "Kind, quiet, clear",
    detail:
      "Quiet after 10pm · shoes off in great room · firearms secured per state law · fires only in designated rings · kids on ATVs with helmets and adult spotter.",
    tags: ["rules"],
  },
  {
    id: "r7",
    category: "Vendors",
    title: "Trusted vendors",
    summary: "Propane · septic · arborist",
    detail:
      "Sticker sheet inside pantry door. Prefer text-first for scheduling — mention Aspen Ridge gate code only after arrival time confirmed.",
    tags: ["vendors"],
  },
  {
    id: "r8",
    category: "Watercraft",
    title: "Boats · gentle usage",
    summary: "Covers · batteries · keys",
    detail:
      "Keys in lockbox code = last 4 of house line. Battery tender on port slip only. Life jackets sized in dock chest — please re-rack damp gear open-air to dry.",
    tags: ["boats"],
  },
];

export type DemoInventoryItem = {
  id: string;
  label: string;
  pct: number;
  unit: string;
  lastUpdatedBy: string;
  lastUpdated: string;
  restockHint?: string;
  low: boolean;
};

export const demoInventory: DemoInventoryItem[] = [
  { id: "i1", label: "Propane · main", pct: 38, unit: "tank", lastUpdatedBy: "Alex", lastUpdated: "Today 7am", restockHint: "Schedule delivery before weekend", low: true },
  { id: "i2", label: "Firewood · covered", pct: 72, unit: "cords", lastUpdatedBy: "Jordan", lastUpdated: "Mon", low: false },
  { id: "i3", label: "Fishing tackle shared", pct: 55, unit: "kits", lastUpdatedBy: "Sam", lastUpdated: "Sun", low: false },
  { id: "i4", label: "Beverages · great room", pct: 41, unit: "cases", lastUpdatedBy: "Riley", lastUpdated: "Wed", restockHint: "Kids’ juice running low", low: true },
  { id: "i5", label: "Diesel · transfer tank", pct: 68, unit: "gal est.", lastUpdatedBy: "Alex", lastUpdated: "Tue", low: false },
  { id: "i6", label: "Shop tools consumables", pct: 80, unit: "bench", lastUpdatedBy: "Casey", lastUpdated: "Last week", low: false },
  { id: "i7", label: "AA / AAA batteries", pct: 25, unit: "drawer", lastUpdatedBy: "Morgan", lastUpdated: "Thu", restockHint: "Trail cams hungry", low: true },
  { id: "i8", label: "Medical kit · central", pct: 90, unit: "kit", lastUpdatedBy: "Morgan", lastUpdated: "May 1", low: false },
];

export const demoMapBackdrop =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2000&q=85";
