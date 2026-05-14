export type DemoPostCategory =
  | "memory"
  | "update"
  | "event"
  | "wildlife"
  | "project"
  | "weekend_recap";

export type DemoPostLayout = "hero" | "standard" | "tall";

export type DemoFeedPost = {
  id: string;
  category: DemoPostCategory;
  layout: DemoPostLayout;
  author: { name: string; handle: string; avatar: string };
  timeLabel: string;
  location?: string;
  title?: string;
  body: string;
  kind: "image" | "video" | "text" | "album" | "event_recap";
  /** Primary or single image */
  cover?: string;
  album?: string[];
  video?: { poster: string; duration: string };
  linkedEvent?: string;
  reactions: { emoji: string; count: number; active?: boolean }[];
  commentsPreview: { author: string; text: string }[];
  commentCount: number;
};

export const demoFamilyMembers = [
  { id: "m1", name: "Morgan A.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop&q=80" },
  { id: "m2", name: "Jordan K.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&q=80" },
  { id: "m3", name: "Sam R.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop&q=80" },
  { id: "m4", name: "Alex T.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop&q=80" },
  { id: "m5", name: "Riley P.", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=128&h=128&fit=crop&q=80" },
  { id: "m6", name: "Casey L.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&q=80" },
] as const;

export const demoAttachableEvents = [
  "Memorial Day Weekend",
  "Fishing Trip · Willow Creek",
  "Deer Camp Opening Weekend",
  "Family BBQ · Great lawn",
  "Dock Work Weekend",
  "Birthday weekend · AR Farmhouse",
] as const;

export const demoFeedPosts: DemoFeedPost[] = [
  {
    id: "post-1",
    category: "wildlife",
    layout: "hero",
    author: { name: "Jordan K.", handle: "jordan", avatar: demoFamilyMembers[1].avatar },
    timeLabel: "2h ago",
    location: "AR Farmhouse · North camera",
    title: "Elk at first light",
    body: "Quiet morning on the ridge — a small herd drifted through the meadow before the fog lifted.",
    kind: "image",
    cover:
      "https://images.unsplash.com/photo-1470770843672-f972a00901c5?auto=format&fit=crop&w=1600&q=85",
    reactions: [
      { emoji: "❤️", count: 8 },
      { emoji: "🌿", count: 5 },
      { emoji: "✨", count: 3 },
    ],
    commentsPreview: [
      { author: "Morgan", text: "These colors are unreal." },
      { author: "Sam", text: "Saving this for the holiday card." },
    ],
    commentCount: 6,
  },
  {
    id: "post-2",
    category: "memory",
    layout: "standard",
    author: { name: "Morgan A.", handle: "morgan", avatar: demoFamilyMembers[0].avatar },
    timeLabel: "Yesterday",
    location: "Lake dock",
    title: "Fishing trip · Saturday",
    body: "Slow bites, fast laughs. The kids out-fished all of us by noon.",
    kind: "album",
    album: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=900&q=80",
    ],
    reactions: [
      { emoji: "🎣", count: 6 },
      { emoji: "❤️", count: 4 },
    ],
    commentsPreview: [{ author: "Alex", text: "Legendary day. Same time next month?" }],
    commentCount: 4,
  },
  {
    id: "post-3",
    category: "project",
    layout: "tall",
    author: { name: "Alex T.", handle: "alex", avatar: demoFamilyMembers[3].avatar },
    timeLabel: "3d ago",
    location: "South cove",
    title: "Dock construction · week 2",
    body: "Stringers are set. If weather holds, we stain next weekend.",
    kind: "video",
    video: {
      poster: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
      duration: "0:42",
    },
    linkedEvent: "Dock Work Weekend",
    reactions: [
      { emoji: "🛠️", count: 5 },
      { emoji: "👏", count: 9 },
    ],
    commentsPreview: [{ author: "Riley", text: "Looks rock solid already." }],
    commentCount: 3,
  },
  {
    id: "post-4",
    category: "weekend_recap",
    layout: "standard",
    author: { name: "Sam R.", handle: "sam", avatar: demoFamilyMembers[2].avatar },
    timeLabel: "Last weekend",
    location: "Great lawn",
    title: "Birthday weekend recap",
    body: "Candles, s’mores, and a very competitive croquet bracket. Thank you for making it feel effortless.",
    kind: "event_recap",
    cover:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85",
    linkedEvent: "Birthday weekend · AR Farmhouse",
    reactions: [
      { emoji: "🎂", count: 12 },
      { emoji: "❤️", count: 10 },
    ],
    commentsPreview: [{ author: "Casey", text: "Still dreaming about that chocolate cake." }],
    commentCount: 9,
  },
  {
    id: "post-5",
    category: "update",
    layout: "standard",
    author: { name: "Riley P.", handle: "riley", avatar: demoFamilyMembers[4].avatar },
    timeLabel: "4d ago",
    location: "East trailhead",
    title: "Trail cleanup · done",
    body: "Six bags out, fresh markers in. Trail cameras back online at mile 1.2.",
    kind: "image",
    cover:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=85",
    reactions: [
      { emoji: "🌲", count: 7 },
      { emoji: "🙏", count: 4 },
    ],
    commentsPreview: [{ author: "Jordan", text: "Hero work. Drinks on me Friday." }],
    commentCount: 5,
  },
  {
    id: "post-6",
    category: "event",
    layout: "standard",
    author: { name: "Casey L.", handle: "casey", avatar: demoFamilyMembers[5].avatar },
    timeLabel: "5d ago",
    location: "Back patio",
    title: "Family BBQ · golden hour",
    body: "Smoke rolling low, music soft, kids barefoot in the grass — the version of summer we wait for.",
    kind: "album",
    album: [
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
      "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80",
    ],
    reactions: [
      { emoji: "🔥", count: 6 },
      { emoji: "❤️", count: 8 },
    ],
    commentsPreview: [{ author: "Morgan", text: "That rub was perfect." }],
    commentCount: 7,
  },
  {
    id: "post-7",
    category: "memory",
    layout: "tall",
    author: { name: "Morgan A.", handle: "morgan", avatar: demoFamilyMembers[0].avatar },
    timeLabel: "1w ago",
    location: "West overlook",
    title: "Sunset · no filter",
    body: "The ridge turned rose for maybe four minutes. Worth every mosquito.",
    kind: "image",
    cover:
      "https://images.unsplash.com/photo-1495616811220-101b2f1f8d6d?auto=format&fit=crop&w=1200&q=85",
    reactions: [
      { emoji: "🌅", count: 15 },
      { emoji: "❤️", count: 11 },
    ],
    commentsPreview: [{ author: "Sam", text: "Frame this one." }],
    commentCount: 8,
  },
  {
    id: "post-8",
    category: "update",
    layout: "standard",
    author: { name: "Alex T.", handle: "alex", avatar: demoFamilyMembers[3].avatar },
    timeLabel: "1w ago",
    kind: "text",
    body: "Pantry restock arrives Thursday. If you’re coming up early, text me — I’ll leave the gate schedule in Tasks.",
    reactions: [{ emoji: "✅", count: 5 }],
    commentsPreview: [{ author: "Jordan", text: "On it — thanks Alex." }],
    commentCount: 2,
  },
];

export type DemoWeekendEvent = {
  id: string;
  title: string;
  tagline: string;
  dateLabel: string;
  startIso: string;
  endIso: string;
  hero: string;
  weather: { highF: number; lowF: number; label: string };
  attendees: { name: string; avatar: string }[];
  attendeeExtra: number;
  rsvp: "going" | "maybe" | "invite";
  quickDetails: string[];
  commentsPreview: { author: string; text: string }[];
};

export const demoWeekendEvents: DemoWeekendEvent[] = [
  {
    id: "ev-mdw",
    title: "Memorial Day Weekend",
    tagline: "Low agenda · high togetherness",
    dateLabel: "May 23 – May 26",
    startIso: "2026-05-23T15:00:00",
    endIso: "2026-05-26T11:00:00",
    hero: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1800&q=85",
    weather: { highF: 71, lowF: 48, label: "Mostly sunny · light wind" },
    attendees: demoFamilyMembers.slice(0, 4).map((m) => ({ name: m.name, avatar: m.avatar })),
    attendeeExtra: 5,
    rsvp: "going",
    quickDetails: ["House opens Friday 3pm", "Chef dinner Saturday", "Monday brunch, soft checkout"],
    commentsPreview: [
      { author: "Morgan", text: "Bringing the cornhole set." },
      { author: "Jordan", text: "Driving up Thursday night if weather looks clear." },
    ],
  },
  {
    id: "ev-fish",
    title: "Fishing Trip · Willow Creek",
    tagline: "Dawn launch · thermos required",
    dateLabel: "Jun 7 – Jun 8",
    startIso: "2026-06-07T05:30:00",
    endIso: "2026-06-08T14:00:00",
    hero: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1800&q=85",
    weather: { highF: 68, lowF: 46, label: "Cool mornings · calm water" },
    attendees: [demoFamilyMembers[1], demoFamilyMembers[3], demoFamilyMembers[4]].map((m) => ({
      name: m.name,
      avatar: m.avatar,
    })),
    attendeeExtra: 0,
    rsvp: "maybe",
    quickDetails: ["Boat leaves 5:45am", "Kids welcome on shore crew", "Pack layers"],
    commentsPreview: [{ author: "Alex", text: "I’ve got the tackle box restocked." }],
  },
  {
    id: "ev-deer",
    title: "Deer Camp Opening Weekend",
    tagline: "Tradition, timber, and slow coffee",
    dateLabel: "Nov 14 – Nov 16",
    startIso: "2026-11-14T16:00:00",
    endIso: "2026-11-16T12:00:00",
    hero: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1800&q=85",
    weather: { highF: 52, lowF: 31, label: "Crisp air · clear skies" },
    attendees: [demoFamilyMembers[1], demoFamilyMembers[2], demoFamilyMembers[5]].map((m) => ({
      name: m.name,
      avatar: m.avatar,
    })),
    attendeeExtra: 2,
    rsvp: "invite",
    quickDetails: ["Safety walkthrough Friday", "Stand assignments posted in Tasks", "Quiet hours after 9pm"],
    commentsPreview: [{ author: "Sam", text: "Bringing the usual chili." }],
  },
  {
    id: "ev-bbq",
    title: "Family BBQ · Great lawn",
    tagline: "Smoke, strings lights, barefoot kids",
    dateLabel: "Jul 19 · 4pm",
    startIso: "2026-07-19T16:00:00",
    endIso: "2026-07-19T22:00:00",
    hero: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1800&q=85",
    weather: { highF: 84, lowF: 61, label: "Warm evening · low humidity" },
    attendees: demoFamilyMembers.map((m) => ({ name: m.name, avatar: m.avatar })),
    attendeeExtra: 4,
    rsvp: "going",
    quickDetails: ["BYO blanket", "Vegetarian skewers on the menu", "Fire pit after dark"],
    commentsPreview: [{ author: "Riley", text: "DJ duties claimed." }],
  },
  {
    id: "ev-dock",
    title: "Dock Work Weekend",
    tagline: "Many hands · lighter work",
    dateLabel: "May 30 – May 31",
    startIso: "2026-05-30T09:00:00",
    endIso: "2026-05-31T17:00:00",
    hero: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=85",
    weather: { highF: 73, lowF: 52, label: "Sun-forward · afternoon breeze" },
    attendees: [demoFamilyMembers[3], demoFamilyMembers[0], demoFamilyMembers[1]].map((m) => ({
      name: m.name,
      avatar: m.avatar,
    })),
    attendeeExtra: 1,
    rsvp: "going",
    quickDetails: ["Stain + seal south face", "Lunch on the porch at noon", "Ear protection on-site"],
    commentsPreview: [{ author: "Casey", text: "I can take the morning shift." }],
  },
];

export type DemoCalendarDay = {
  day: number;
  status: "outside" | "open" | "booked" | "busy" | "checkout";
  label?: string;
  guests?: string[];
};

/** May 2026 — May 1 is Friday (0=Sun). */
export const demoCalendarMonth = {
  label: "May 2026",
  monthIndex: 4,
  year: 2026,
  /** Leading blanks from Sunday */
  leadingBlanks: 5,
  daysInMonth: 31,
  /** Weekend summaries shown under grid */
  busyWeekends: [
    { range: "May 16–18", title: "Family weekend", occupancy: "Full house", tone: "booked" as const },
    { range: "May 23–26", title: "Memorial Day", occupancy: "8 confirmed", tone: "booked" as const },
    { range: "May 30–31", title: "Dock work", occupancy: "Working stay", tone: "busy" as const },
  ],
  /** Per-day flags for grid */
  days: [
    { day: 1, status: "open" },
    { day: 2, status: "open" },
    { day: 3, status: "open" },
    { day: 4, status: "open" },
    { day: 5, status: "open" },
    { day: 6, status: "open" },
    { day: 7, status: "open" },
    { day: 8, status: "open" },
    { day: 9, status: "open" },
    { day: 10, status: "open" },
    { day: 11, status: "open" },
    { day: 12, status: "open" },
    { day: 13, status: "open" },
    { day: 14, status: "open", label: "Today" },
    { day: 15, status: "booked", guests: ["Morgan", "Jordan"] },
    { day: 16, status: "booked", guests: ["Family weekend"] },
    { day: 17, status: "booked", guests: ["Family weekend"] },
    { day: 18, status: "checkout", guests: ["Checkout"] },
    { day: 19, status: "open" },
    { day: 20, status: "open" },
    { day: 21, status: "open" },
    { day: 22, status: "busy", guests: ["Arrivals"] },
    { day: 23, status: "booked", guests: ["Memorial guests"] },
    { day: 24, status: "booked", guests: ["Memorial guests"] },
    { day: 25, status: "booked", guests: ["Memorial guests"] },
    { day: 26, status: "booked", guests: ["Memorial guests"] },
    { day: 27, status: "open" },
    { day: 28, status: "open" },
    { day: 29, status: "open" },
    { day: 30, status: "busy", guests: ["Dock crew"] },
    { day: 31, status: "busy", guests: ["Dock crew"] },
  ] satisfies DemoCalendarDay[],
} as const;

export const demoUpcomingStay = {
  title: "Family weekend",
  dates: "May 16 – May 18",
  guests: 8,
  notes: "Early arrivals Friday · climate preset to 68°F",
};
