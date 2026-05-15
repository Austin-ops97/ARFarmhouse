import { describe, expect, it } from "vitest";

import {
  defaultMapFilters,
  filterMapPins,
  mapPinCountsByLayer,
  PIN_KIND_LAYER,
} from "@/lib/property-map-layers";
import type { PropertyMapPin } from "@/lib/property-operations";

const pin = (kind: PropertyMapPin["kind"], label: string): PropertyMapPin => ({
  id: label,
  label,
  kind,
  x: 50,
  y: 50,
  blurb: "",
});

describe("property-map-layers", () => {
  it("maps pin kinds to layers", () => {
    expect(PIN_KIND_LAYER.gate).toBe("access");
    expect(PIN_KIND_LAYER.atv).toBe("routes");
  });

  it("filters pins by layer toggle", () => {
    const pins = [pin("gate", "Main gate"), pin("fishing", "Dock")];
    const filters = defaultMapFilters();
    filters.layers.access = false;
    const out = filterMapPins(pins, filters);
    expect(out).toHaveLength(1);
    expect(out[0]?.kind).toBe("fishing");
  });

  it("counts pins per layer", () => {
    const counts = mapPinCountsByLayer([pin("gate", "a"), pin("atv", "b")]);
    expect(counts.access).toBe(1);
    expect(counts.routes).toBe(1);
  });
});
