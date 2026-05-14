import { demoCoordEvents, demoOccupancyByDay, demoThisWeekend } from "@/lib/calendar-demo";
import { mockBooking, mockTrailConditions, mockWeather, mockWeekendGuests } from "@/lib/mock-data";

export type HomeAtmosphere = "dawn" | "day" | "dusk" | "night" | "storm";

export type HomeHeroNarrative = {
  eyebrow: string;
  headline: string;
  lede: string;
  /** Short line under CTAs — occupancy, weather, or ritual */
  pulse: string;
  atmosphere: HomeAtmosphere;
};

function hourBucket(d: Date): HomeAtmosphere {
  const h = d.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 17 && h < 20) return "dusk";
  if (h >= 20 || h < 5) return "night";
  return "day";
}

function isDemoMay(d: Date) {
  return d.getMonth() === 4;
}

function activeEventsOnDay(day: number) {
  return demoCoordEvents.filter((ev) => {
    const end = ev.endDay ?? ev.startDay;
    return day >= ev.startDay && day <= end;
  });
}

function nextFamilyBookingFromDay(day: number) {
  return demoCoordEvents.find((ev) => ev.kind === "family_booking" && ev.startDay > day);
}

function familyBookingSpan() {
  return demoCoordEvents.find((ev) => ev.kind === "family_booking")!;
}

export function resolveHomeAtmosphere(now: Date): HomeAtmosphere {
  if (mockWeather.severity === "storm") return "storm";
  return hourBucket(now);
}

export function resolveHomeHeroNarrative(now: Date): HomeHeroNarrative {
  const atmosphere = resolveHomeAtmosphere(now);
  const guests = mockWeekendGuests.length;
  const guestWord = guests === 1 ? "guest" : "guests";

  if (!isDemoMay(now)) {
    return {
      eyebrow: "AR Farmhouse",
      headline: "The house is listening for the next gathering",
      lede: `${mockBooking.title} · ${mockBooking.dates}. Weather reads ${mockWeather.condition.toLowerCase()} — interior holds ${mockWeather.tempF}° near the ridge.`,
      pulse: `${mockBooking.guests} ${guestWord} expected · gates secured`,
      atmosphere,
    };
  }

  const day = now.getDate();
  const active = activeEventsOnDay(day);
  const family = familyBookingSpan();
  const daysUntilFamily = family.startDay - day;

  if (daysUntilFamily === 1 && day < family.startDay) {
    return {
      eyebrow: "Tomorrow",
      headline: "The weekend begins — family fills the house",
      lede: `${demoThisWeekend.title} runs ${demoThisWeekend.dateLabel}. Arrivals stagger from late afternoon; climate is already dialed for a full house.`,
      pulse: `${mockBooking.guests} ${guestWord} · ${mockWeather.condition.toLowerCase()}`,
      atmosphere,
    };
  }

  if (day >= family.startDay && day <= (family.endDay ?? family.startDay)) {
    const intensity = demoOccupancyByDay[day as keyof typeof demoOccupancyByDay] ?? 2;
    const occupancyHint =
      intensity >= 3 ? "House is at full hum — shared spaces feel alive." : "A softer headcount — room to breathe between gatherings.";
    return {
      eyebrow: "This weekend",
      headline: "Everyone under one roof — composed, not crowded",
      lede: `${occupancyHint} ${demoThisWeekend.occupancySummary}`,
      pulse: `${mockWeather.tempF}° outside · ${demoThisWeekend.weather.label.toLowerCase()}`,
      atmosphere,
    };
  }

  if (active.some((e) => e.kind === "quiet_retreat")) {
    return {
      eyebrow: "On property",
      headline: "Quiet week — the farmhouse exhales",
      lede: "Low lights, long evenings. Trails are clear; the network stays warm for whoever checks in first.",
      pulse: `${mockTrailConditions.summary.toLowerCase()} · ${mockWeather.condition.toLowerCase()}`,
      atmosphere,
    };
  }

  if (active.length) {
    const head = active[0]!;
    return {
      eyebrow: "This moment",
      headline: head.title,
      lede: head.timeLabel
        ? `${head.timeLabel} · ${head.kind.replaceAll("_", " ")} energy at the property.`
        : "A coordinated beat on the shared calendar — arrivals, meals, and small rituals in sync.",
      pulse: `${mockBooking.guests} ${guestWord} across the next booking window`,
      atmosphere,
    };
  }

  const nextFam = nextFamilyBookingFromDay(day);
  if (nextFam && nextFam.startDay - day <= 5) {
    return {
      eyebrow: "Coming up",
      headline: `${nextFam.title} nears`,
      lede: "The house is staging itself — groceries, linens, and trail checks are lining up in the background.",
      pulse: `${nextFam.startDay === family.startDay ? `${mockBooking.guests} ${guestWord}` : "Calendar open"} · ${mockWeather.condition.toLowerCase()}`,
      atmosphere,
    };
  }

  return {
    eyebrow: "AR Farmhouse",
    headline: "A calm rhythm between gatherings",
    lede: "No surge on the calendar — the property keeps its posture: secure perimeter, steady climate, trails ready when you are.",
    pulse: `${mockWeather.tempF}° · ${mockWeather.condition.toLowerCase()}`,
    atmosphere,
  };
}

export type HomeSpotlight = {
  id: string;
  label: string;
  title: string;
  body: string;
};

export const homeSpotlightRotation: HomeSpotlight[] = [
  {
    id: "trails",
    label: "Land",
    title: "Trail conditions",
    body: "North loop is dry with a light dusting above 9,200 ft. Visibility is excellent for an early ridge walk.",
  },
  {
    id: "weather",
    label: "Sky",
    title: "Evening air",
    body: `${mockWeather.highLow} · ${mockWeather.condition}. Pack a layer for the fire pit after sunset.`,
  },
  {
    id: "groceries",
    label: "Prep",
    title: "Groceries inbound",
    body: "Pantry restock arrives Thursday. Sweet corn and cream are still open to claim on the shared list.",
  },
  {
    id: "memory",
    label: "Memory",
    title: "Recent album",
    body: "Sam shared birthday weekend photos — soft light in the great room, kids on the dock at blue hour.",
  },
  {
    id: "occupancy",
    label: "House",
    title: "Occupancy pulse",
    body: demoThisWeekend.occupancySummary,
  },
];
