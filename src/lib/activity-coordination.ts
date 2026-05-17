import { calendarEventIsUserVisible } from "@/lib/booking-active";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import type { FamilyNotification } from "@/models/notification";

export type CoordinationHighlight = {
  id: string;
  title: string;
  subtitle: string;
  tone: "mint" | "amber" | "default";
};

/** Glanceable family coordination lines for home / hub surfaces. */
export function buildCoordinationHighlights(input: {
  calendarEvents: readonly PropertyCalendarEvent[];
  notifications: readonly FamilyNotification[];
  view?: Date;
}): CoordinationHighlight[] {
  const highlights: CoordinationHighlight[] = [];
  const view = input.view ?? new Date();
  const y = view.getFullYear();
  const m = view.getMonth();
  const today = view.getDate();

  const upcoming = input.calendarEvents
    .filter(
      (e) =>
        calendarEventIsUserVisible(e) &&
        e.year === y &&
        e.monthIndex === m &&
        (e.endDay ?? e.startDay) >= today
    )
    .sort((a, b) => a.startDay - b.startDay)[0];

  if (upcoming) {
    const monthWord = new Date(upcoming.year, upcoming.monthIndex, 1).toLocaleString("en-US", {
      month: "long",
    });
    const range =
      upcoming.endDay !== upcoming.startDay
        ? `${monthWord} ${upcoming.startDay}–${upcoming.endDay}`
        : `${monthWord} ${upcoming.startDay}`;
    const daysUntil = upcoming.startDay - today;
    highlights.push({
      id: `trip-${upcoming.id}`,
      title: daysUntil <= 1 ? "Arrival soon" : "Next family stay",
      subtitle: `${upcoming.title} · ${range}`,
      tone: daysUntil <= 2 ? "amber" : "mint",
    });
  }

  const unread = input.notifications.filter((n) => !n.readAt);
  if (unread.length > 0) {
    highlights.push({
      id: "unread",
      title: `${unread.length} new update${unread.length === 1 ? "" : "s"}`,
      subtitle: unread[0]?.title ?? "Family activity",
      tone: "default",
    });
  }

  const recentBooking = input.notifications.find((n) => n.type === "booking_created" && !n.readAt);
  if (recentBooking) {
    highlights.push({
      id: `booking-${recentBooking.id}`,
      title: "New booking",
      subtitle: recentBooking.body,
      tone: "mint",
    });
  }

  return highlights.slice(0, 3);
}

export function groupNotificationsByDay(
  items: readonly FamilyNotification[]
): { label: string; items: FamilyNotification[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;

  const today: FamilyNotification[] = [];
  const yesterday: FamilyNotification[] = [];
  const earlier: FamilyNotification[] = [];

  for (const n of items) {
    if (n.createdAt >= startOfToday) today.push(n);
    else if (n.createdAt >= startOfYesterday) yesterday.push(n);
    else earlier.push(n);
  }

  const groups: { label: string; items: FamilyNotification[] }[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length) groups.push({ label: "Earlier", items: earlier });
  return groups;
}
