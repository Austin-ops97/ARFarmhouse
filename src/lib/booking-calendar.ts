import type { PropertyCalendarEventAccent, PropertyCalendarEventKind } from "@/lib/property-calendar-events";

export const TRIP_CALENDAR_META: Record<
  string,
  { kind: PropertyCalendarEventKind; accent: PropertyCalendarEventAccent; label: string }
> = {
  family: { kind: "family_booking", accent: "mint", label: "Family stay" },
  friends: { kind: "family_booking", accent: "sky", label: "Friends stay" },
  maintenance: { kind: "maintenance", accent: "amber", label: "Maintenance" },
  slow: { kind: "quiet_retreat", accent: "slate", label: "Slow reset" },
};

export function bookingEventTitle(tripPurpose: string, tripId: string, guests: number): string {
  const trimmed = tripPurpose.trim();
  if (trimmed) return trimmed;
  const meta = TRIP_CALENDAR_META[tripId] ?? TRIP_CALENDAR_META.family;
  return `${meta.label} · ${guests} guest${guests === 1 ? "" : "s"}`;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  const loA = Math.min(aStart, aEnd);
  const hiA = Math.max(aStart, aEnd);
  const loB = Math.min(bStart, bEnd);
  const hiB = Math.max(bStart, bEnd);
  return loA <= hiB && loB <= hiA;
}
