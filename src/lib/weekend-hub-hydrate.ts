import { PROPERTY_HERO_IMAGE_URL } from "@/lib/brand";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { buildPropertyPulseLines } from "@/lib/property-pulse";
import type { PropertyInventoryItem, PropertyStatusCard } from "@/lib/property-operations";
import type { WeekendHubBundle, WeekendHubSlug } from "@/lib/weekend-hub-bundle";
import { getWeekendHubBundle } from "@/lib/weekend-hub-bundle";

function isoForDay(year: number, monthIndex: number, day: number, hour: number) {
  return new Date(year, monthIndex, day, hour, 0, 0, 0).toISOString();
}

function pickPrimaryEvent(events: PropertyCalendarEvent[], view: Date): PropertyCalendarEvent | null {
  if (events.length === 0) return null;
  const y = view.getFullYear();
  const m = view.getMonth();
  const today = view.getDate();

  const inMonth = events.filter((e) => e.year === y && e.monthIndex === m);
  const upcoming = inMonth
    .filter((e) => (e.endDay ?? e.startDay) >= today)
    .sort((a, b) => a.startDay - b.startDay);
  if (upcoming[0]) return upcoming[0];

  return [...inMonth].sort((a, b) => b.startDay - a.startDay)[0] ?? events[0] ?? null;
}

/** Hydrate weekend hub from live calendar when a stay exists; otherwise empty bundle. */
export function resolveWeekendHubBundle(
  slug: WeekendHubSlug,
  events: PropertyCalendarEvent[],
  view: Date = new Date(),
  ops?: {
    statusCards?: readonly PropertyStatusCard[];
    inventory?: readonly PropertyInventoryItem[];
  }
): WeekendHubBundle {
  const base = getWeekendHubBundle(slug);
  const event = pickPrimaryEvent(events, view);
  if (!event) return base;

  const end = event.endDay ?? event.startDay;
  const monthWord = new Date(event.year, event.monthIndex, 1).toLocaleString("en-US", {
    month: "long",
  });
  const dateLabel =
    end !== event.startDay
      ? `${monthWord} ${event.startDay}–${end}, ${event.year}`
      : `${monthWord} ${event.startDay}, ${event.year}`;

  const arrivals = event.attendeeLabels.map((name) => ({
    name: name.replace(/ \(pet\)$/, ""),
    avatar: "",
    eta: event.status === "pending" ? "Pending confirmation" : "On calendar",
    mode: name.includes("(pet)") ? "Pet" : "Family",
  }));

  return {
    ...base,
    slug,
    title: event.title,
    dateLabel,
    startIso: isoForDay(event.year, event.monthIndex, event.startDay, 15),
    endIso: isoForDay(event.year, event.monthIndex, end, 11),
    occupancySummary: `${event.guests} guest${event.guests === 1 ? "" : "s"} · ${event.status === "pending" ? "Awaiting family confirmation" : "On the calendar"}`,
    notes: event.notes?.trim() || event.tripPurpose?.trim() || base.notes,
    arrivals,
    departures:
      end !== event.startDay
        ? [
            {
              name: event.requestedByName,
              avatar: "",
              etd: `${monthWord} ${end}`,
              note: "Checkout day",
            },
          ]
        : [],
    relatedFeedLines: event.notes
      ? [{ author: event.requestedByName, text: event.notes, timeLabel: "Trip notes" }]
      : [],
    activities: [
      {
        title: event.title,
        when: dateLabel,
        people: event.attendeeLabels.slice(0, 5),
      },
    ],
    propertyPulse: buildPropertyPulseLines({
      statusCards: ops?.statusCards ?? [],
      inventory: ops?.inventory ?? [],
      calendarEvent: event,
    }),
  };
}
