export type HomeAtmosphere = "dawn" | "day" | "dusk" | "night";

export type HomeHeroNarrative = {
  eyebrow: string;
  headline: string;
  lede: string;
  pulse: string;
  atmosphere: HomeAtmosphere;
};

export type HomeSpotlight = {
  id: string;
  label: string;
  title: string;
  body: string;
};

function hourBucket(d: Date): HomeAtmosphere {
  const h = d.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 17 && h < 20) return "dusk";
  if (h >= 20 || h < 5) return "night";
  return "day";
}

export function resolveHomeAtmosphere(now: Date): HomeAtmosphere {
  return hourBucket(now);
}

export function resolveHomeHeroNarrative(now: Date): HomeHeroNarrative {
  const atmosphere = resolveHomeAtmosphere(now);
  return {
    eyebrow: "AR Farmhouse",
    headline: "Your private family ground",
    lede: "The house is ready for real gatherings — share updates in the feed, plan weekends on the calendar, and keep trail notes where everyone signed in can see them.",
    pulse: "Signed-in members only · calm by design",
    atmosphere,
  };
}

export const homeSpotlightRotation: HomeSpotlight[] = [
  {
    id: "land",
    label: "Land",
    title: "Trail maps",
    body: "No saved trail maps yet. When you walk the property, drop photos and pins in the feed so the next visit starts where you left off.",
  },
  {
    id: "memory",
    label: "Memory",
    title: "Photo albums",
    body: "Albums pull from posts you publish. Upload the first memory when you are ready — everything stays in your family space.",
  },
  {
    id: "weekend",
    label: "Weekends",
    title: "Planning window",
    body: "No weekends planned yet. When stays go on the calendar, groceries, arrivals, and the hub fill in here automatically.",
  },
  {
    id: "house",
    label: "House",
    title: "Quiet between visits",
    body: "Property status cards stay minimal until live systems connect. Until then, use Tasks and the feed for anything that needs a human eye.",
  },
];
