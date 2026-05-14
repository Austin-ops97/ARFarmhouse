import type { LocalGuideRow, LocalGuideSection } from "@/lib/local-guide-types";
import raw from "@/lib/mena-local-guide.json";

const emergencyRows: Omit<LocalGuideRow, "key" | "distanceMi" | "imageUrl">[] = [
  {
    section: "emergency",
    id: 1,
    business: "Polk County Sheriff (non-emergency)",
    category: "Law enforcement",
    address: "Mena, AR · verify dispatch line",
    phone: "479-394-2515",
    status: "Mock / verify before use",
    notes: "Placeholder family safety card — confirm current non-emergency number locally.",
  },
  {
    section: "emergency",
    id: 2,
    business: "Mena Regional Health System (info line)",
    category: "Medical",
    address: "Mena, AR · verify campus address",
    phone: "479-394-6100",
    status: "Mock / verify before use",
    notes: "Demo placeholder for urgent care questions — not a substitute for 911.",
  },
  {
    section: "emergency",
    id: 3,
    business: "Poison Control",
    category: "National hotline",
    address: "United States",
    phone: "1-800-222-1222",
    status: "Verified reference",
    notes: "Keep on the fridge — especially with kids and trail snacks in the mix.",
  },
];

function simpleHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

const unsplashPool = [
  "1600585154340-be6161a56a0c",
  "1504674900247-0877df9cc836",
  "1414235072238-5659815cfb0e",
  "1556912172-45b7abe8b7e1",
  "1540189549338-e13e73687e60",
  "1464226184884-fa28087c5199",
  "1470071459604-1b10a00fb693",
  "1504280390367-361c6d9f38f4",
  "1441974231531-c6227db76b6e",
  "1507525428034-b723cf961d3e",
  "1517248135467-4c7edcad34c4",
  "1559339352-11d035aa68de",
];

/** Curated Ouachita / lodge-adjacent feel — deterministic per listing */
export function localGuideImageUrl(key: string) {
  const id = unsplashPool[Math.abs(simpleHash(key)) % unsplashPool.length];
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=82`;
}

export function placeKey(p: Pick<LocalGuideRow, "section" | "id">) {
  return `${p.section}-${p.id}`;
}

function mockDistanceMi(key: string) {
  const v = (Math.abs(simpleHash(key)) % 180) / 10 + 0.8;
  return Math.round(v * 10) / 10;
}

/** Family-facing tips — restaurants only, keyed `restaurants-id` */
export const familyRecommendations: Record<string, string> = {
  "restaurants-6": "Best coffee before trail rides — grab a pastry and sit on the porch.",
  "restaurants-11": "Skyline hits for classic breakfast; usually calmer weekday mornings.",
  "restaurants-16": "Sassafras for something sweet after town errands.",
  "restaurants-15": "Papa’s is our post-ATV comfort stop — share plates, easy with kids.",
  "restaurants-47": "McDonald’s late drive-through when everything else is dark.",
  "restaurants-2": "Fast reset on 71 — good when you’re hauling groceries back to the house.",
};

const base: LocalGuideRow[] = (raw as Omit<LocalGuideRow, "key" | "distanceMi" | "imageUrl">[]).map((r) => {
  const key = placeKey(r);
  return {
    ...r,
    section: r.section as LocalGuideSection,
    key,
    distanceMi: mockDistanceMi(key),
    imageUrl: localGuideImageUrl(key),
  };
});

export const data: LocalGuideRow[] = [
  ...base,
  ...emergencyRows.map((r) => {
    const key = placeKey(r);
    return { ...r, key, distanceMi: mockDistanceMi(key), imageUrl: localGuideImageUrl(key) };
  }),
];

export const restaurants = data.filter((item) => item.section === "restaurants");
export const stores = data.filter((item) => item.section === "stores");
export const verifiedOnly = data.filter((item) => item.status.toLowerCase().includes("verified"));

export function isVerifiedRow(row: LocalGuideRow) {
  return row.status.toLowerCase().includes("verified");
}
