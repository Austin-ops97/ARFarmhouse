import {
  demoArrivals,
  demoDepartures,
  demoEquipmentCoord,
  demoGroceryList,
  demoMealPlan,
  demoPackingReminders,
  demoSharedSupplies,
  demoThisWeekend,
  demoWeekendActivities,
} from "@/lib/calendar-demo";
import { mockPropertyStatus, mockTrailConditions, mockWeather } from "@/lib/mock-data";
import { demoWeekendEvents, type DemoWeekendEvent } from "@/lib/social-demo";

export type WeekendHubId = "current" | (string & {});

/** Stable slugs aligned with `DemoWeekendEvent.hubSlug` */
export type WeekendHubSlug =
  | "current"
  | "memorial-mdw"
  | "fishing-jun"
  | "deer-camp"
  | "bbq-jul"
  | "dock-may";

export type GuideContextPick = {
  title: string;
  category: string;
  reason: string;
};

export type MemoryEcho = {
  headline: string;
  detail: string;
  yearLabel: string;
};

export type PropertyPulseLine = {
  label: string;
  value: string;
};

export type WeekendHubBundle = {
  slug: WeekendHubSlug;
  title: string;
  dateLabel: string;
  hero: string;
  /** ISO string for countdown */
  startIso: string;
  endIso: string;
  weather: { highF: number; lowF: number; label: string };
  occupancySummary: string;
  notes?: string;
  arrivals: typeof demoArrivals;
  departures: typeof demoDepartures;
  mealPlan: typeof demoMealPlan;
  activities: typeof demoWeekendActivities;
  grocery: typeof demoGroceryList;
  supplies: typeof demoSharedSupplies;
  equipment: typeof demoEquipmentCoord;
  packing: typeof demoPackingReminders;
  guidePicks: GuideContextPick[];
  tasksBeforeArrival: { id: string; title: string; dueLabel: string }[];
  relatedFeedLines: { author: string; text: string; timeLabel: string }[];
  memoryEcho?: MemoryEcho;
  propertyPulse: PropertyPulseLine[];
  trailNote?: string;
};

const defaultPropertyPulse: PropertyPulseLine[] = [
  { label: "Gates", value: mockPropertyStatus.gates },
  { label: "Climate", value: mockPropertyStatus.climate },
  { label: "Trails", value: mockTrailConditions.summary },
];

function guideForFishing(): GuideContextPick[] {
  return [
    {
      title: "Skyline Café",
      category: "Breakfast",
      reason: "Warm biscuits before a cold launch — family default before Willow Creek.",
    },
    {
      title: "Harps Food Store",
      category: "Groceries",
      reason: "Closest ice + trail snacks on the way out of Mena.",
    },
  ];
}

function guideForMemorial(): GuideContextPick[] {
  return [
    {
      title: "Sassafras Springs Vineyard",
      category: "Gathering",
      reason: "Easy afternoon reset between arrivals — low noise, porch sunsets.",
    },
    {
      title: "Papa’s Mexican Café",
      category: "Comfort",
      reason: "Crowd-pleasing after long drives — share plates when the house is full.",
    },
  ];
}

function guideCurrent(): GuideContextPick[] {
  return [
    {
      title: "Skyline Café",
      category: "Breakfast",
      reason: "Calm weekday mornings — perfect before east ridge hike.",
    },
    {
      title: "Wolf Pen Bait & Tackle",
      category: "Outdoors",
      reason: "Last-minute line and local intel before lake time.",
    },
  ];
}

function buildFromWeekendEvent(ev: DemoWeekendEvent, extras: Partial<WeekendHubBundle> = {}): WeekendHubBundle {
  const slug = ev.hubSlug;
  let guidePicks = guideForMemorial();
  let trailNote: string | undefined = mockTrailConditions.detail;
  if (slug === "fishing-jun") {
    guidePicks = guideForFishing();
    trailNote = "Willow arm: glassy until 10am · light chop after noon.";
  }
  if (slug === "deer-camp") {
    guidePicks = [
      {
        title: "Mena Regional Health System",
        category: "Safety",
        reason: "Quiet confirmation before stand week — non-emergency line saved in Guide.",
      },
    ];
    trailNote = "North loop: crisp leaves · carry orange.";
  }
  if (slug === "bbq-jul") {
    guidePicks = [
      { title: "Harps Food Store", category: "Supplies", reason: "Bulk ice, charcoal, and watermelon runs." },
    ];
  }
  if (slug === "dock-may") {
    guidePicks = [
      { title: "O’Reilly Auto Parts", category: "Hardware", reason: "Sander pads + exterior screws if the crew burns through stock." },
    ];
  }

  const tasksBeforeArrival =
    slug === "memorial-mdw"
      ? [
          { id: "eco-1", title: "Rotate guest suite codes", dueLabel: "Thu · before 3pm arrivals" },
          { id: "eco-2", title: "Stock great room bar", dueLabel: "Fri morning" },
          { id: "eco-3", title: "Fire pit wood dry stack", dueLabel: "Fri · before dark" },
        ]
      : slug === "fishing-jun"
        ? [
            { id: "eco-f1", title: "Charge trolling motor batteries", dueLabel: "Thu" },
            { id: "eco-f2", title: "Pack first aid for boat bin", dueLabel: "Fri AM" },
          ]
        : [
            { id: "eco-g1", title: "Walk perimeter + latch south gate", dueLabel: "Day before" },
            { id: "eco-g2", title: "Thermostat preset for arrivals", dueLabel: "Morning of" },
          ];

  const memoryEcho: MemoryEcho | undefined =
    slug === "memorial-mdw"
      ? {
          headline: "Last Memorial at the farmhouse",
          detail: "Rain held off for the group photo on the porch — same weekend, warmer air this year.",
          yearLabel: "May 2025",
        }
      : slug === "fishing-jun"
        ? {
            headline: "Last June on Willow Creek",
            detail: "Slow morning fog — same thermos ritual, same dock jokes.",
            yearLabel: "Jun 2025",
          }
        : undefined;

  return {
    slug,
    title: ev.title,
    dateLabel: ev.dateLabel,
    hero: ev.hero,
    startIso: ev.startIso,
    endIso: ev.endIso,
    weather: ev.weather,
    occupancySummary: `${ev.attendees.length + ev.attendeeExtra} people · RSVP in Feed`,
    notes: extras.notes,
    arrivals: demoArrivals.slice(0, 3),
    departures: demoDepartures,
    mealPlan: demoMealPlan,
    activities: demoWeekendActivities,
    grocery: demoGroceryList,
    supplies: demoSharedSupplies,
    equipment: demoEquipmentCoord,
    packing: demoPackingReminders,
    guidePicks,
    tasksBeforeArrival,
    relatedFeedLines: ev.commentsPreview.map((c) => ({
      author: c.author,
      text: c.text,
      timeLabel: "In thread",
    })),
    memoryEcho,
    propertyPulse: defaultPropertyPulse,
    trailNote,
    ...extras,
  };
}

export function getWeekendHubBundle(slug: WeekendHubSlug): WeekendHubBundle {
  if (slug === "current") {
    return {
      slug: "current",
      title: demoThisWeekend.title,
      dateLabel: demoThisWeekend.dateLabel,
      hero: demoThisWeekend.hero,
      startIso: "2026-05-16T15:00:00",
      endIso: "2026-05-18T11:00:00",
      weather: demoThisWeekend.weather,
      occupancySummary: demoThisWeekend.occupancySummary,
      notes: demoThisWeekend.notes,
      arrivals: demoArrivals,
      departures: demoDepartures,
      mealPlan: demoMealPlan,
      activities: demoWeekendActivities,
      grocery: demoGroceryList,
      supplies: demoSharedSupplies,
      equipment: demoEquipmentCoord,
      packing: demoPackingReminders,
      guidePicks: guideCurrent(),
      tasksBeforeArrival: [
        { id: "cw-1", title: "Guest cabin linens + lavender spray", dueLabel: "Fri · before 2:40pm arrivals" },
        { id: "cw-2", title: "Hot tub chemistry check", dueLabel: "Fri evening" },
        { id: "cw-3", title: "East gate code rotation", dueLabel: "Thu (done in Tasks)" },
      ],
      relatedFeedLines: [
        { author: "Jordan", text: "Pantry restock arriving Thursday — list is in Tasks.", timeLabel: "5h ago" },
        { author: "Morgan", text: "Trail cameras look clear — elk near the north fence line.", timeLabel: "2h ago" },
      ],
      memoryEcho: {
        headline: "This weekend last year",
        detail: "Dock lights danced on the water after midnight — porch music until the frogs took over.",
        yearLabel: "May 2025",
      },
      propertyPulse: [
        { label: "Weather window", value: `${mockWeather.tempF}° · ${mockWeather.condition}` },
        ...defaultPropertyPulse,
      ],
      trailNote: mockTrailConditions.detail,
    };
  }

  const ev = demoWeekendEvents.find((e) => e.hubSlug === slug);
  if (ev) return buildFromWeekendEvent(ev);
  return getWeekendHubBundle("current");
}

/** Map free-text linked events from posts to hub slugs */
export function hubSlugFromLinkedEventLabel(label: string): WeekendHubSlug | null {
  const t = label.toLowerCase();
  if (t.includes("memorial")) return "memorial-mdw";
  if (t.includes("willow") || t.includes("fishing")) return "fishing-jun";
  if (t.includes("deer camp")) return "deer-camp";
  if (t.includes("bbq") || t.includes("great lawn")) return "bbq-jul";
  if (t.includes("dock work")) return "dock-may";
  if (t.includes("family weekend") || t.includes("may 16")) return "current";
  return null;
}

export type FeedSurfaceInsertKind = "weekend_preview" | "booking_pulse" | "property_aware";

export type FeedSurfaceInsert = {
  id: string;
  kind: FeedSurfaceInsertKind;
  /** Insert after this zero-based post index (stream order) */
  afterPostIndex: number;
  title: string;
  subtitle: string;
  meta?: string;
  ctaLabel: string;
  hubSlug?: WeekendHubSlug;
  /** When no hub — navigate to calendar / property */
  navTarget?: "calendar" | "property" | "tasks" | "guide";
};

export const demoFeedSurfaceInserts: FeedSurfaceInsert[] = [
  {
    id: "ins-preview",
    kind: "weekend_preview",
    afterPostIndex: 0,
    title: "Upcoming · Family weekend",
    subtitle: "May 16–18 · arrivals staggered · chef dinner Sat",
    meta: "Tap for the full command center",
    ctaLabel: "Open weekend hub",
    hubSlug: "current",
  },
  {
    id: "ins-booking",
    kind: "booking_pulse",
    afterPostIndex: 2,
    title: "House activity",
    subtitle: "Alex booked Memorial Day weekend · main + guest suite · May 23–26",
    meta: "Feed × calendar",
    ctaLabel: "View Memorial hub",
    hubSlug: "memorial-mdw",
  },
  {
    id: "ins-property",
    kind: "property_aware",
    afterPostIndex: 4,
    title: "Property pulse",
    subtitle: `${mockPropertyStatus.gates} · ${mockTrailConditions.summary}`,
    meta: "Quiet alert — no action needed",
    ctaLabel: "Property status",
    navTarget: "property",
  },
];
