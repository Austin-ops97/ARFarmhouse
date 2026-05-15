"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Binoculars,
  Camera,
  ChevronRight,
  Crosshair,
  Download,
  MapPin,
  Minus,
  Plus,
  Tent,
  Trees,
  Truck,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { PropertyMapControls } from "@/components/ar-farmhouse/property-map-controls";
import { SyncStatusBanner } from "@/components/ar-farmhouse/sync-status-banner";
import { Button } from "@/components/ui/button";
import { usePropertyData } from "@/contexts/property-data-context";
import {
  defaultMapFilters,
  filterMapPins,
  mapPinCountsByLayer,
  PIN_KIND_LABELS,
  visibleTrails,
} from "@/lib/property-map-layers";
import {
  PROPERTY_MAP_BACKDROP,
  type MapPinKind,
  type PropertyMapPin,
} from "@/lib/property-operations";
import { cn } from "@/lib/utils";

const surface = cn("ar-surface-raised relative overflow-hidden rounded-[1.35rem]");

const pinAccent: Record<MapPinKind, string> = {
  trail: "bg-emerald-400/90",
  cabin: "bg-amber-200/90",
  fishing: "bg-sky-400/90",
  gate: "bg-violet-400/90",
  utility: "bg-zinc-300/90",
  dock: "bg-cyan-300/90",
  gathering: "bg-orange-300/90",
  stand: "bg-lime-300/85",
  camera: "bg-rose-300/90",
  hunting: "bg-stone-300/90",
  emergency: "bg-red-400/90",
  atv: "bg-orange-400/85",
};

function PinIcon({ kind }: { kind: MapPinKind }) {
  switch (kind) {
    case "trail":
      return <Trees className="size-3.5 text-emerald-950/80" aria-hidden />;
    case "camera":
      return <Camera className="size-3.5 text-rose-950/80" aria-hidden />;
    case "fishing":
      return <Binoculars className="size-3.5 text-sky-950/80" aria-hidden />;
    case "cabin":
      return <Tent className="size-3.5 text-amber-950/80" aria-hidden />;
    case "emergency":
      return <AlertTriangle className="size-3.5 text-red-950/80" aria-hidden />;
    case "atv":
      return <Truck className="size-3.5 text-orange-950/80" aria-hidden />;
    case "hunting":
      return <Crosshair className="size-3.5 text-stone-950/80" aria-hidden />;
    default:
      return <MapPin className="size-3.5 text-background" aria-hidden />;
  }
}

export function PropertyMapView() {
  const reduceMotion = useReducedMotion();
  const { mapPins, mapTrails, propertySyncError } = usePropertyData();
  const [filters, setFilters] = useState(defaultMapFilters);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [selected, setSelected] = useState<PropertyMapPin | null>(null);

  const visiblePins = useMemo(() => filterMapPins(mapPins, filters), [mapPins, filters]);
  const trailsShown = useMemo(() => visibleTrails(mapTrails, filters), [mapTrails, filters]);
  const layerCounts = useMemo(() => mapPinCountsByLayer(mapPins), [mapPins]);

  const resetView = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);
  const dragRef = useRef({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    originX: 0,
    originY: 0,
    active: false,
    dragging: false,
  });

  const clampScale = useCallback((s: number) => Math.min(2.2, Math.max(0.75, s)), []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.06 : 0.06;
      setScale((s) => clampScale(s + delta));
    },
    [clampScale]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      x: tx,
      y: ty,
      px: e.clientX,
      py: e.clientY,
      originX: e.clientX,
      originY: e.clientY,
      active: true,
      dragging: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const d = dragRef.current;
    if (!d.dragging) {
      const rdx = e.clientX - d.originX;
      const rdy = e.clientY - d.originY;
      if (rdx * rdx + rdy * rdy < 100) return;
      dragRef.current = { ...d, dragging: true };
    }
    const d2 = dragRef.current;
    setTx(d2.x + (e.clientX - d2.px));
    setTy(d2.y + (e.clientY - d2.py));
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
    dragRef.current.dragging = false;
  };

  return (
    <div className="space-y-6">
      <SyncStatusBanner error={propertySyncError} />
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "p-4 sm:p-6")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Property map</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Navigate trails, cabins, gates, and utility points — layered for calm exploration on any device.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled>
              <Download className="size-4" />
              Offline trail PDF
            </Button>
            <span className="rounded-full border border-border/50 bg-muted/45 px-3 py-1.5 text-[10px] font-medium text-muted-foreground dark:border-white/10 dark:bg-white/[0.04]">
              Private aerial · pan & zoom
            </span>
          </div>
        </div>
      </motion.section>

      <PropertyMapControls
        filters={filters}
        onChange={setFilters}
        pinCount={visiblePins.length}
        trailCount={trailsShown.length}
        layerCounts={layerCounts}
      />

      <div className={cn(surface, "overflow-hidden p-1 sm:p-2")}>
        <div className="relative flex items-center justify-end gap-2 px-2 pb-2 pt-1 sm:px-3">
          <Button type="button" variant="ghost" size="sm" className="rounded-xl text-[11px]" onClick={resetView}>
            Reset view
          </Button>
          <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => setScale((s) => clampScale(s - 0.1))}>
            <Minus className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => setScale((s) => clampScale(s + 0.1))}>
            <Plus className="size-4" />
          </Button>
          <span className="text-[11px] text-muted-foreground">{Math.round(scale * 100)}%</span>
        </div>

        <div
          className="ar-nested-well relative aspect-[16/11] w-full cursor-grab touch-none overflow-hidden rounded-2xl active:cursor-grabbing sm:aspect-[21/11]"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <div
            className="absolute inset-0 will-change-transform"
            style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}
          >
            <Image
              src={PROPERTY_MAP_BACKDROP}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 1200px, 100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/15 to-background/40" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {trailsShown.map((tr) => (
                <path
                  key={tr.id}
                  d={tr.d}
                  fill="none"
                  stroke="rgba(94,234,212,0.45)"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  style={{
                    filter: "drop-shadow(0 0 10px rgba(94, 234, 212, 0.25))",
                  }}
                />
              ))}
            </svg>

            {mapPins.length === 0 && (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/40 px-6 text-center backdrop-blur-[2px]">
                <p className="font-heading text-sm font-semibold text-foreground">Map points will appear here</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Track important property locations — trails, gates, cabins, and utilities.
                </p>
              </div>
            )}

            {visiblePins.map((pin) => (
              <motion.button
                key={pin.id}
                type="button"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                className="absolute z-10 -translate-x-1/2 -translate-y-full"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((p) => (p?.id === pin.id ? null : pin));
                }}
                whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              >
                <span className="relative flex flex-col items-center">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-2xl border border-border/40 shadow-lg backdrop-blur-md dark:border-white/20",
                      pinAccent[pin.kind],
                      "ring-2 ring-background/60"
                    )}
                  >
                    <PinIcon kind={pin.kind} />
                  </span>
                  <span className="mt-1 max-w-[140px] rounded-lg border border-border/55 bg-card/85 px-2 py-0.5 text-center text-[10px] font-medium text-foreground backdrop-blur-md dark:border-white/15 dark:bg-background/70">
                    {pin.label.split(" · ")[0]}
                  </span>
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className={cn(surface, "p-4 sm:p-5")}>
          <h3 className="text-sm font-semibold text-foreground">Trail strips</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {trailsShown.length === 0 ? (
              <p className="col-span-full rounded-2xl border border-border/50 bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
                {mapTrails.length === 0
                  ? "No trail layers saved yet. Add trail paths in Firestore to see them on the map."
                  : "Trail lines hidden by your layer filters."}
              </p>
            ) : (
              trailsShown.map((tr) => (
                <div key={tr.id} className="ar-nested-well rounded-2xl px-3 py-3">
                  <p className="text-sm font-medium text-foreground">{tr.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tr.condition}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={cn(surface, "p-4 sm:p-5")}>
          <h3 className="text-sm font-semibold text-foreground">Waypoints</h3>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {visiblePins.length === 0 ? (
              <li className="ar-nested-well rounded-xl px-3 py-4 text-center text-xs text-muted-foreground">
                {mapPins.length === 0
                  ? "No waypoints on the map yet."
                  : "No waypoints match your filters."}
              </li>
            ) : (
              visiblePins.slice(0, 12).map((pin) => (
                <li key={pin.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(pin)}
                    className="ar-nested-well flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition hover:bg-muted/50"
                  >
                    <span className="font-medium text-foreground">{pin.label}</span>
                    <span className="shrink-0 text-muted-foreground">{PIN_KIND_LABELS[pin.kind]}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border/45 bg-popover/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:inset-auto sm:bottom-auto sm:left-auto sm:right-6 sm:top-24 sm:max-w-sm sm:rounded-2xl sm:border sm:border-border/55 sm:p-5 sm:shadow-[var(--ar-modal-elevate)] lg:right-10 dark:border-white/10 dark:bg-background/92"
          >
            <div className="mx-auto flex max-w-lg items-start justify-between gap-3 sm:max-w-none">
              <div>
                <p className="text-xs font-medium text-primary">{PIN_KIND_LABELS[selected.kind]}</p>
                <p className="mt-1 font-heading text-lg font-semibold text-foreground">{selected.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selected.blurb}</p>
                {selected.linkedEvent && (
                  <p className="mt-2 text-[12px] text-muted-foreground">Trip · {selected.linkedEvent}</p>
                )}
                {selected.trailCondition && (
                  <p className="mt-2 inline-flex rounded-full border border-border/50 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground dark:border-white/10 dark:bg-white/[0.05]">
                    Trail feel · {selected.trailCondition}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-white/[0.06]"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                <ChevronRight className="size-5 rotate-90 sm:rotate-0" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
