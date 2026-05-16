import type { BookingStatus, BookingType } from "@/models/booking";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import { calendarEntryKind } from "@/lib/booking-status-styles";

export type CalendarFilterId =
  | "all"
  | "approved"
  | "pending"
  | "denied"
  | "bookings"
  | "events"
  | "blackouts"
  | "conflicts"
  | "mine";

export type CalendarFilterState = {
  active: CalendarFilterId[];
  searchQuery: string;
};

export const CALENDAR_FILTER_OPTIONS: { id: CalendarFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "denied", label: "Denied" },
  { id: "bookings", label: "Bookings" },
  { id: "events", label: "Events" },
  { id: "blackouts", label: "Blackouts" },
  { id: "conflicts", label: "Conflicts" },
  { id: "mine", label: "Mine" },
];

export function defaultCalendarFilters(): CalendarFilterState {
  return { active: ["all"], searchQuery: "" };
}

function matchesStatusFilter(event: PropertyCalendarEvent, filter: CalendarFilterId): boolean {
  const status = event.unifiedStatus ?? "pending";
  switch (filter) {
    case "approved":
      return status === "approved";
    case "pending":
      return status === "pending" || status === "pending_conflict";
    case "denied":
      return status === "denied" || status === "cancelled";
    case "conflicts":
      return status === "pending_conflict" || (event.conflictsWith?.length ?? 0) > 0;
    default:
      return true;
  }
}

function matchesKindFilter(event: PropertyCalendarEvent, filter: CalendarFilterId): boolean {
  const kind = calendarEntryKind(event);
  switch (filter) {
    case "bookings":
      return kind === "booking";
    case "events":
      return kind === "event";
    case "blackouts":
      return kind === "blackout";
    default:
      return true;
  }
}

export function filterCalendarEvents(
  events: readonly PropertyCalendarEvent[],
  filters: CalendarFilterState,
  currentUserId?: string | null
): PropertyCalendarEvent[] {
  const active = filters.active.includes("all") ? [] : filters.active;
  const q = filters.searchQuery.trim().toLowerCase();

  return events.filter((event) => {
    if (active.length > 0) {
      const statusFilters = active.filter((f) =>
        ["approved", "pending", "denied", "conflicts"].includes(f)
      );
      const kindFilters = active.filter((f) => ["bookings", "events", "blackouts"].includes(f));

      if (statusFilters.length > 0 && !statusFilters.some((f) => matchesStatusFilter(event, f))) {
        return false;
      }
      if (kindFilters.length > 0 && !kindFilters.some((f) => matchesKindFilter(event, f))) {
        return false;
      }
      if (active.includes("mine") && currentUserId && event.requestedBy !== currentUserId) {
        return false;
      }
    }

    if (q) {
      const haystack = [
        event.title,
        event.requestedByName,
        event.notes,
        event.tripPurpose,
        statusLabel(event.unifiedStatus),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

function statusLabel(status: BookingStatus | undefined): string {
  if (!status) return "pending";
  return status;
}

/** Admin moderation list filters. */
export function filterBookingsForAdmin(
  bookings: readonly import("@/models/booking").Booking[],
  filters: { searchQuery: string; showConflictsOnly: boolean }
) {
  const q = filters.searchQuery.trim().toLowerCase();
  return bookings.filter((b) => {
    if (filters.showConflictsOnly && b.status !== "pending_conflict") return false;
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      b.createdByName.toLowerCase().includes(q) ||
      b.description.toLowerCase().includes(q)
    );
  });
}

export function filterBookingsByType(
  bookings: readonly import("@/models/booking").Booking[],
  type: BookingType | "all"
) {
  if (type === "all") return bookings;
  return bookings.filter((b) => b.type === type);
}
