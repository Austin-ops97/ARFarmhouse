export const mockWeather = {
  location: "AR Farmhouse",
  tempF: 54,
  condition: "Clear · light breeze",
  highLow: "62° / 41°",
  icon: "clear-night" as const,
  /** When `"storm"`, home atmosphere shifts subtly — demo only */
  severity: "clear" as "clear" | "storm",
};

export const mockBooking = {
  title: "Family weekend",
  dates: "May 16 – May 18",
  guests: 8,
  status: "Confirmed",
};

export const mockPropertyStatus = {
  gates: "Secured",
  climate: "68°F interior",
  generator: "Standby ready",
};

export const mockWeekendGuests = [
  { name: "Morgan A.", role: "Arriving Fri 4pm", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&q=80" },
  { name: "Jordan K.", role: "Arriving Fri 7pm", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&q=80" },
  { name: "Sam R.", role: "All weekend", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&q=80" },
  { name: "Alex T.", role: "Sat brunch", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&q=80" },
];

export const mockFeed = [
  { id: "1", author: "Jordan", snippet: "Trail cameras look clear — elk near the north fence line.", time: "2h ago" },
  { id: "2", author: "Morgan", snippet: "Pantry restock arriving Thursday. I left the list in Tasks.", time: "5h ago" },
  {
    id: "3",
    author: "Sam",
    snippet: "Chef dinner Sat 7:30pm — allergies are in the weekend hub note. Kids’ table by the window.",
    time: "Yesterday",
  },
  {
    id: "4",
    author: "Alex",
    snippet: "Boat keys are in the mudroom drawer. Fuel topped for Saturday morning.",
    time: "Yesterday",
  },
  { id: "5", author: "Riley", snippet: "Memorial week poll closes Sunday — results post automatically to Feed.", time: "3d ago" },
];

export const mockEvents = [
  { title: "Sunrise hike · East ridge", when: "Sat 6:15am", tone: "forest" as const },
  { title: "Chef dinner · Great room", when: "Sat 7:30pm", tone: "ember" as const },
];

export const mockTasks = [
  { label: "Propane inspection", done: true },
  { label: "Hot tub chemistry check", done: false },
  { label: "Guest suite linens", done: false },
];

export const mockCashPool = {
  balance: "$12,480",
  note: "Shared · Q2 household fund",
  change: "+$240 this month",
};

export const mockPhotos = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&h=300&fit=crop&q=80",
];

export const mockWeekendPlans = {
  headline: "Low-key · firelight evenings",
  bullets: ["No formal agenda", "Kids’ movie night Sat", "Sunday slow breakfast"],
};

export const mockTrailConditions = {
  summary: "Dry · excellent visibility",
  detail: "North loop: light dusting above 9,200 ft.",
  rating: "Ideal",
};

export const mockPoll = {
  question: "Thanksgiving week preference?",
  options: ["Nov 24–30", "Nov 26–Dec 2"],
  votes: 6,
};

/** Hero photo of AR Farmhouse — served from Vercel Blob (login + home banner). */
export const loginBackdrop =
  "https://wfx6wquumukehkm6.public.blob.vercel-storage.com/Images/ARFarm%20house.png";

export const dashboardHeroImage = loginBackdrop;
