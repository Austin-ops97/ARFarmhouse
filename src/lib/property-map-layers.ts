import type { MapPinKind, PropertyMapPin, PropertyMapTrail } from "@/lib/property-operations";

export type MapLayerId =
  | "trails"
  | "structures"
  | "access"
  | "recreation"
  | "utilities"
  | "safety"
  | "routes";

export type MapLayerDef = {
  id: MapLayerId;
  label: string;
  description: string;
};

export const MAP_LAYER_DEFS: MapLayerDef[] = [
  { id: "trails", label: "Trails", description: "Foot paths and ridge lines" },
  { id: "structures", label: "Cabins & docks", description: "Buildings and gathering spots" },
  { id: "access", label: "Access", description: "Gates and entry points" },
  { id: "recreation", label: "Outdoors", description: "Fishing, stands, and water" },
  { id: "utilities", label: "Utilities", description: "Power, water, and service" },
  { id: "safety", label: "Safety", description: "Cameras and emergency points" },
  { id: "routes", label: "ATV routes", description: "Vehicle paths on the land" },
];

export const PIN_KIND_LAYER: Record<MapPinKind, MapLayerId> = {
  trail: "trails",
  cabin: "structures",
  dock: "structures",
  gathering: "structures",
  gate: "access",
  fishing: "recreation",
  stand: "recreation",
  hunting: "recreation",
  utility: "utilities",
  camera: "safety",
  emergency: "safety",
  atv: "routes",
};

export const PIN_KIND_LABELS: Record<MapPinKind, string> = {
  trail: "Trail",
  cabin: "Cabin",
  fishing: "Fishing",
  gate: "Gate",
  utility: "Utility",
  dock: "Dock",
  gathering: "Gathering",
  stand: "Stand",
  camera: "Camera",
  hunting: "Hunting",
  emergency: "Emergency",
  atv: "ATV route",
};

export type MapFilterState = {
  layers: Record<MapLayerId, boolean>;
  showTrails: boolean;
  kindFilter: MapPinKind | "all";
  search: string;
};

export function defaultMapFilters(): MapFilterState {
  return {
    layers: Object.fromEntries(MAP_LAYER_DEFS.map((l) => [l.id, true])) as Record<MapLayerId, boolean>,
    showTrails: true,
    kindFilter: "all",
    search: "",
  };
}

export function filterMapPins(pins: readonly PropertyMapPin[], filters: MapFilterState): PropertyMapPin[] {
  const q = filters.search.trim().toLowerCase();
  return pins.filter((pin) => {
    const layer = PIN_KIND_LAYER[pin.kind] ?? "structures";
    if (!filters.layers[layer]) return false;
    if (filters.kindFilter !== "all" && pin.kind !== filters.kindFilter) return false;
    if (!q) return true;
    const blob = `${pin.label} ${pin.blurb} ${pin.linkedEvent ?? ""}`.toLowerCase();
    return blob.includes(q);
  });
}

export function visibleTrails(
  trails: readonly PropertyMapTrail[],
  filters: MapFilterState
): PropertyMapTrail[] {
  if (!filters.showTrails || !filters.layers.trails) return [];
  return [...trails];
}

export function mapPinCountsByLayer(pins: readonly PropertyMapPin[]): Record<MapLayerId, number> {
  const counts = Object.fromEntries(MAP_LAYER_DEFS.map((l) => [l.id, 0])) as Record<MapLayerId, number>;
  for (const pin of pins) {
    const layer = PIN_KIND_LAYER[pin.kind];
    if (layer) counts[layer] += 1;
  }
  return counts;
}
