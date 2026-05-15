"use client";

import { Layers, RotateCcw, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  MAP_LAYER_DEFS,
  PIN_KIND_LABELS,
  type MapFilterState,
  type MapLayerId,
} from "@/lib/property-map-layers";
import type { MapPinKind } from "@/lib/property-operations";
import { cn } from "@/lib/utils";

const ALL_KINDS = Object.keys(PIN_KIND_LABELS) as MapPinKind[];

type PropertyMapControlsProps = {
  filters: MapFilterState;
  onChange: (next: MapFilterState) => void;
  pinCount: number;
  trailCount: number;
  layerCounts: Record<MapLayerId, number>;
};

export function PropertyMapControls({
  filters,
  onChange,
  pinCount,
  trailCount,
  layerCounts,
}: PropertyMapControlsProps) {
  const toggleLayer = (id: MapLayerId) => {
    onChange({
      ...filters,
      layers: { ...filters.layers, [id]: !filters.layers[id] },
    });
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/25 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search waypoints…"
            className="rounded-xl border-border/60 bg-card/70 pl-10 dark:border-white/10 dark:bg-white/[0.04]"
          />
        </div>
        <p className="shrink-0 text-[11px] text-muted-foreground">
          {pinCount} waypoint{pinCount === 1 ? "" : "s"}
          {filters.showTrails ? ` · ${trailCount} trail${trailCount === 1 ? "" : "s"}` : ""}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Layers className="size-3.5" aria-hidden />
          Layers
        </span>
        {MAP_LAYER_DEFS.map((layer) => {
          const on = filters.layers[layer.id];
          const count = layerCounts[layer.id] ?? 0;
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggleLayer(layer.id)}
              title={layer.description}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                on
                  ? "border-primary/35 bg-primary/12 text-foreground"
                  : "border-border/50 bg-muted/30 text-muted-foreground dark:border-white/10"
              )}
            >
              {layer.label}
              {count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange({ ...filters, showTrails: !filters.showTrails })}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
            filters.showTrails
              ? "border-emerald-400/35 bg-emerald-500/12 text-foreground"
              : "border-border/50 text-muted-foreground"
          )}
        >
          Trail lines
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <select
          value={filters.kindFilter}
          onChange={(e) =>
            onChange({ ...filters, kindFilter: e.target.value as MapPinKind | "all" })
          }
          className="rounded-xl border border-border/60 bg-card/70 px-3 py-2 text-xs text-foreground dark:border-white/10 dark:bg-white/[0.04]"
          aria-label="Filter by waypoint type"
        >
          <option value="all">All types</option>
          {ALL_KINDS.map((k) => (
            <option key={k} value={k}>
              {PIN_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() =>
            onChange({
              layers: Object.fromEntries(MAP_LAYER_DEFS.map((l) => [l.id, true])) as MapFilterState["layers"],
              showTrails: true,
              kindFilter: "all",
              search: "",
            })
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/55 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset filters
        </button>
      </div>
    </div>
  );
}
