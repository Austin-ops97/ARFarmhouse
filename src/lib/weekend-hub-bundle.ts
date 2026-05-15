import { PROPERTY_HERO_IMAGE_URL } from "@/lib/brand";
import type { WeekendHubSlug } from "@/lib/weekend-hub-slug";

export type { WeekendHubSlug } from "@/lib/weekend-hub-slug";

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

export type HubArrival = {
  name: string;
  avatar: string;
  eta: string;
  mode: string;
};

export type HubDeparture = {
  name: string;
  avatar: string;
  etd: string;
  note: string;
};

export type HubMealRow = {
  meal: string;
  chef: string;
  dish: string;
};

export type HubActivityRow = {
  title: string;
  when: string;
  people: string[];
};

export type HubGroceryRow = {
  item: string;
  detail: string;
  claimedBy: string | null;
  done: boolean;
};

export type HubSupplyRow = {
  item: string;
  status: string;
  owner: string;
};

export type HubEquipmentRow = {
  item: string;
  who: string;
  note: string;
};

export type WeekendHubWeather = {
  label: string;
  highF: number | null;
  lowF: number | null;
};

export type WeekendHubBundle = {
  slug: WeekendHubSlug;
  title: string;
  dateLabel: string;
  hero: string;
  startIso: string;
  endIso: string;
  weather: WeekendHubWeather;
  occupancySummary: string;
  notes?: string;
  arrivals: HubArrival[];
  departures: HubDeparture[];
  mealPlan: HubMealRow[];
  activities: HubActivityRow[];
  grocery: HubGroceryRow[];
  supplies: HubSupplyRow[];
  equipment: HubEquipmentRow[];
  packing: string[];
  guidePicks: GuideContextPick[];
  tasksBeforeArrival: { id: string; title: string; dueLabel: string }[];
  relatedFeedLines: { author: string; text: string; timeLabel: string }[];
  memoryEcho?: MemoryEcho;
  propertyPulse: PropertyPulseLine[];
  trailNote?: string;
};

function weekFromNowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(15, 0, 0, 0);
  return d.toISOString();
}

function weekFromNowEndIso() {
  const d = new Date();
  d.setDate(d.getDate() + 9);
  d.setHours(11, 0, 0, 0);
  return d.toISOString();
}

/** Empty production bundle — calendar and feed will hydrate this later. */
export function getWeekendHubBundle(slug: WeekendHubSlug): WeekendHubBundle {
  const resolvedSlug: WeekendHubSlug = slug ?? "current";
  return {
    slug: resolvedSlug,
    title: "Weekend hub",
    dateLabel: "No weekends on the calendar yet",
    hero: PROPERTY_HERO_IMAGE_URL,
    startIso: weekFromNowIso(),
    endIso: weekFromNowEndIso(),
    weather: {
      label: "Local forecast appears when a stay is scheduled",
      highF: null,
      lowF: null,
    },
    occupancySummary: "When someone books the house, headcount and notes will show here.",
    notes: "Use the feed for arrivals, meals, and trail updates until shared lists sync from the calendar.",
    arrivals: [],
    departures: [],
    mealPlan: [],
    activities: [],
    grocery: [],
    supplies: [],
    equipment: [],
    packing: [],
    guidePicks: [],
    tasksBeforeArrival: [],
    relatedFeedLines: [],
    propertyPulse: [
      { label: "Perimeter", value: "Walk gates when you arrive — same rhythm as always." },
      { label: "Climate", value: "Thermostat follows your saved comfort presets." },
      { label: "Land", value: "Trail notes and maps belong in the feed for everyone signed in." },
    ],
  };
}
