import type { BookingStatus, BookingType } from "@/models/booking";
import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";

export type CalendarEntryKind = "booking" | "event" | "blackout";

export function calendarEntryKind(event: PropertyCalendarEvent): CalendarEntryKind {
  if (event.isBlackout) return "blackout";
  return event.recordType === "event" ? "event" : "booking";
}

/** Dot / chip color on the month grid. */
export function statusAccentClass(event: PropertyCalendarEvent): string {
  if (event.isBlackout) return "bg-zinc-500/90 ring-1 ring-zinc-400/40";
  const status = event.unifiedStatus ?? "pending";
  if (event.recordType === "event") {
    if (status === "approved") return "bg-violet-400/90";
    if (status === "denied" || status === "cancelled") return "bg-zinc-500/50 opacity-60";
    if (status === "pending_conflict") return "bg-amber-400/90 ring-1 ring-rose-400/50";
    return "bg-violet-400/55 ring-1 ring-violet-300/40";
  }
  switch (status) {
    case "approved":
      return "bg-emerald-400/90";
    case "denied":
    case "cancelled":
      return "bg-zinc-500/50 opacity-60";
    case "pending_conflict":
      return "bg-amber-400/90 ring-1 ring-rose-400/50";
    case "pending":
    default:
      return "bg-amber-300/75 ring-1 ring-amber-200/35";
  }
}

export function statusBadgeLabel(status: BookingStatus | undefined, recordType: BookingType | undefined): string {
  if (!status) return "Pending";
  if (status === "pending_conflict") return "Conflict";
  if (status === "approved") return "Approved";
  if (status === "denied") return "Denied";
  if (status === "cancelled") return "Cancelled";
  return "Pending";
}

export function dayCellOverlayClass(event: PropertyCalendarEvent): string | null {
  if (!event.isBlackout) return null;
  return "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.22)_0,rgba(0,0,0,0.22)_2px,transparent_2px,transparent_6px)]";
}
