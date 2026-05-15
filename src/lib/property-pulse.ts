import type { PropertyCalendarEvent } from "@/lib/property-calendar-events";
import type { PropertyInventoryItem, PropertyStatusCard } from "@/lib/property-operations";
import type { PropertyPulseLine } from "@/lib/weekend-hub-bundle";

/** Glanceable operational lines for weekend hub and home strips. */
export function buildPropertyPulseLines(input: {
  statusCards: readonly PropertyStatusCard[];
  inventory: readonly PropertyInventoryItem[];
  calendarEvent?: PropertyCalendarEvent | null;
}): PropertyPulseLine[] {
  const lines: PropertyPulseLine[] = [];

  for (const card of input.statusCards.slice(0, 3)) {
    lines.push({ label: card.title, value: card.value });
  }

  const low = input.inventory.filter((i) => i.low);
  if (low.length > 0) {
    lines.push({
      label: "Supplies",
      value: `${low.length} item${low.length === 1 ? "" : "s"} running low`,
    });
  }

  const ev = input.calendarEvent;
  if (ev) {
    lines.push({
      label: "Next stay",
      value: ev.status === "pending" ? `${ev.title} · pending` : ev.title,
    });
  }

  return lines.slice(0, 5);
}
