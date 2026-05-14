import { demoFamilyMembers } from "@/lib/social-demo";

export type DemoCoordEventKind =
  | "family_booking"
  | "fishing"
  | "holiday_gathering"
  | "work_weekend"
  | "quiet_retreat"
  | "deer_camp"
  | "maintenance"
  | "birthday"
  | "holiday";

export type DemoCoordEvent = {
  id: string;
  title: string;
  /** First day (inclusive), May 2026 */
  startDay: number;
  /** Last day (inclusive); omit for single-day */
  endDay?: number;
  timeLabel?: string;
  kind: DemoCoordEventKind;
  accent: "mint" | "amber" | "rose" | "sky" | "violet" | "slate" | "emerald";
};

export const demoCoordEvents: DemoCoordEvent[] = [
  { id: "e1", title: "Riley’s birthday dinner", startDay: 3, timeLabel: "6:30pm", kind: "birthday", accent: "rose" },
  { id: "e2", title: "Generator service window", startDay: 6, timeLabel: "9am–1pm", kind: "maintenance", accent: "slate" },
  { id: "e3", title: "Family weekend", startDay: 15, endDay: 18, kind: "family_booking", accent: "emerald" },
  { id: "e4", title: "Quiet retreat · writing", startDay: 12, endDay: 14, kind: "quiet_retreat", accent: "sky" },
  { id: "e5", title: "Memorial Day gathering", startDay: 23, endDay: 26, kind: "holiday_gathering", accent: "amber" },
  { id: "e6", title: "Fishing trip · Willow Creek", startDay: 7, endDay: 8, kind: "fishing", accent: "mint" },
  { id: "e7", title: "Dock work weekend", startDay: 30, endDay: 31, kind: "work_weekend", accent: "violet" },
  { id: "e8", title: "Trail cameras · SD swap", startDay: 19, timeLabel: "Morning", kind: "maintenance", accent: "slate" },
  { id: "e11", title: "Deer camp gear weekend", startDay: 28, endDay: 29, kind: "deer_camp", accent: "slate" },
  { id: "e9", title: "Mother’s Day brunch", startDay: 10, timeLabel: "11am", kind: "holiday", accent: "rose" },
  { id: "e10", title: "Holiday prep · groceries inbound", startDay: 21, timeLabel: "All day", kind: "holiday_gathering", accent: "amber" },
];

/** 1–31 occupancy intensity for heat strip (0 = open, 3 = full) */
export const demoOccupancyByDay: Record<number, 0 | 1 | 2 | 3> = {
  1: 0,
  2: 0,
  3: 1,
  4: 0,
  5: 0,
  6: 1,
  7: 2,
  8: 2,
  9: 0,
  10: 1,
  11: 0,
  12: 2,
  13: 2,
  14: 2,
  15: 3,
  16: 3,
  17: 3,
  18: 2,
  19: 0,
  20: 0,
  21: 1,
  22: 2,
  23: 3,
  24: 3,
  25: 3,
  26: 3,
  27: 1,
  28: 0,
  29: 0,
  30: 2,
  31: 2,
};

export const demoBookingTripTypes = [
  { id: "family", label: "Family weekend", hint: "Full house energy" },
  { id: "fishing", label: "Fishing trip", hint: "Dawn boats, slow evenings" },
  { id: "holiday", label: "Holiday gathering", hint: "Meals, music, memory-making" },
  { id: "work", label: "Work weekend", hint: "Projects with structure" },
  { id: "retreat", label: "Quiet retreat", hint: "Low noise, soft agenda" },
  { id: "deer", label: "Deer camp", hint: "Tradition-first weekend" },
] as const;

export const demoPropertyRooms = [
  { id: "main", label: "Main house", beds: "6 beds · 3 baths", available: true },
  { id: "guest", label: "Guest suite", beds: "King · private bath", available: true },
  { id: "loft", label: "Loft bunk room", beds: "4 twins", available: false },
  { id: "carriage", label: "Carriage apartment", beds: "Queen · kitchenette", available: true },
] as const;

export const demoCurrentGuests = [
  { name: "Morgan A.", avatar: demoFamilyMembers[0].avatar, until: "Checkout Sun 11am" },
  { name: "Jordan K.", avatar: demoFamilyMembers[1].avatar, until: "Checkout Sun 11am" },
  { name: "Sam R.", avatar: demoFamilyMembers[2].avatar, until: "Checkout Sun 11am" },
];

export const demoUpcomingArrivals = [
  { name: "Alex T.", avatar: demoFamilyMembers[3].avatar, when: "Fri 4:20pm", note: "Bringing boat" },
  { name: "Riley P.", avatar: demoFamilyMembers[4].avatar, when: "Fri 6:45pm", note: "Dinner crew" },
  { name: "Casey L.", avatar: demoFamilyMembers[5].avatar, when: "Sat 9:00am", note: "Trail run" },
];

export const demoDepartureSchedule = [
  { range: "May 18", label: "Family weekend checkout", count: 8 },
  { range: "May 26", label: "Memorial guests", count: 12 },
];

export const demoFeedCalendarBridge = [
  {
    id: "b1",
    kind: "booking" as const,
    actor: "Alex T.",
    action: "booked Memorial Day weekend",
    detail: "May 23–26 · Main + guest suite",
    timeLabel: "2d ago",
    avatar: demoFamilyMembers[3].avatar,
    hubSlug: "memorial-mdw" as const,
  },
  {
    id: "b2",
    kind: "recap" as const,
    actor: "Sam R.",
    action: "shared a weekend album",
    detail: "Birthday weekend · AR Farmhouse",
    timeLabel: "Last week",
    avatar: demoFamilyMembers[2].avatar,
    hubSlug: "current" as const,
  },
  {
    id: "b3",
    kind: "rsvp" as const,
    actor: "Jordan K.",
    action: "RSVP’d going · Fishing trip",
    detail: "Jun 7–8 · Willow Creek",
    timeLabel: "Yesterday",
    avatar: demoFamilyMembers[1].avatar,
    hubSlug: "fishing-jun" as const,
  },
];

export const demoThisWeekend = {
  title: "Family weekend",
  dateLabel: "May 16 – May 18",
  hero: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=85",
  weather: { highF: 68, lowF: 47, label: "Partly cloudy · light wind" },
  occupancySummary: "8 guests · 3 cars · chef dinner Sat",
  notes: "Climate set to 68°F · east gate code rotated Thursday.",
};

export const demoArrivals = [
  { name: "Morgan A.", avatar: demoFamilyMembers[0].avatar, eta: "Fri 2:40pm", mode: "SUV" as const },
  { name: "Jordan K.", avatar: demoFamilyMembers[1].avatar, eta: "Fri 5:10pm", mode: "Truck + trailer" as const },
  { name: "Sam R.", avatar: demoFamilyMembers[2].avatar, eta: "Fri 7:00pm", mode: "SUV" as const },
];

export const demoDepartures = [
  { name: "Household", avatar: demoFamilyMembers[0].avatar, etd: "Sun 11:00am", note: "Soft checkout · linens in hamper" },
  { name: "Alex T.", avatar: demoFamilyMembers[3].avatar, etd: "Sun 1:30pm", note: "Boat on trailer" },
];

export const demoMealPlan = [
  { meal: "Friday dinner", chef: "Morgan", dish: "Low-country boil + salad" },
  { meal: "Saturday breakfast", chef: "Jordan", dish: "Frittata + fruit" },
  { meal: "Saturday dinner", chef: "Guest chef", dish: "Reserved · 7:30pm great room" },
  { meal: "Sunday brunch", chef: "Sam", dish: "Biscuits, gravy, slow coffee" },
];

export const demoWeekendActivities = [
  { title: "East loop hike", when: "Sat 7:30am", people: ["Alex", "Casey"] },
  { title: "Lake swim + dock", when: "Sat 2:00pm", people: ["Kids crew", "Riley"] },
  { title: "Fire pit + s’mores", when: "Sat 8:30pm", people: ["Everyone"] },
];

export const demoGroceryList = [
  { item: "Sweet corn", detail: "2 dozen", claimedBy: "Sam", done: false },
  { item: "Heavy cream", detail: "1 qt", claimedBy: null, done: false },
  { item: "Charcoal + starters", detail: "2 bags", claimedBy: "Jordan", done: true },
  { item: "Berries", detail: "mixed", claimedBy: "Morgan", done: false },
];

export const demoSharedSupplies = [
  { item: "First aid kit", status: "mudroom bench", owner: "House" },
  { item: "Extra life jackets", status: "dock box", owner: "Alex" },
  { item: "Camp chairs ×8", status: "barn rack", owner: "House" },
];

export const demoEquipmentCoord = [
  { item: "Pontoon boat", who: "Jordan", note: "Sat AM · fuel topped" },
  { item: "ATV keys (2)", who: "Casey", note: "Mile loop only · helmets in bin" },
  { item: "Smoker", who: "Riley", note: "Friday · cherry pellets" },
];

export const demoPackingReminders = [
  "Layers for 45° mornings",
  "Headlamps for fire pit walk",
  "Phone chargers in guest suite drawer",
];
