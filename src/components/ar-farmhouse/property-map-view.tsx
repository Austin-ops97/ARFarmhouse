"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Binoculars,
  Camera,
  ChevronRight,
  Download,
  MapPin,
  Minus,
  Plus,
  Tent,
  Trees,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  demoMapBackdrop,
  demoMapPins,
  demoMapTrails,
  demoRecentlyExplored,
  type DemoMapPin,
  type MapPinKind,
} from "@/lib/operations-demo";
import { cn } from "@/lib/utils";

const surface = cn(
  "relative overflow-hidden rounded-[1.35rem] border border-white/10",
  "bg-white/[0.035] shadow-[0_24px_70px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl"
);

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
    default:
      return <MapPin className="size-3.5 text-background" aria-hidden />;
  }
}

export function PropertyMapView() {
  const reduceMotion = useReducedMotion();
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [selected, setSelected] = useState<DemoMapPin | null>(null);
  const dragRef = useRef({ x: 0, y: 0, px: 0, py: 0, active: false });

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
    dragRef.current = { x: tx, y: ty, px: e.clientX, py: e.clientY, active: true };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.px;
    const dy = e.clientY - dragRef.current.py;
    setTx(dragRef.current.x + dx);
    setTy(dragRef.current.y + dy);
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(surface, "p-4 sm:p-6")}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Property map</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Pan and zoom the ridge — pins are invitations to explore, not survey stakes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled>
              <Download className="size-4" />
              Offline trail PDF
            </Button>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
              Demo · static map
            </span>
          </div>
        </div>
      </motion.section>

      <div className={cn(surface, "overflow-hidden p-1 sm:p-2")}>
        <div className="relative flex items-center justify-end gap-2 px-2 pb-2 pt-1 sm:px-3">
          <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => setScale((s) => clampScale(s - 0.1))}>
            <Minus className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon-sm" className="rounded-xl" onClick={() => setScale((s) => clampScale(s + 0.1))}>
            <Plus className="size-4" />
          </Button>
          <span className="text-[11px] text-muted-foreground">{Math.round(scale * 100)}%</span>
        </div>

        <div
          className="relative aspect-[16/11] w-full cursor-grab touch-none overflow-hidden rounded-2xl border border-white/10 active:cursor-grabbing sm:aspect-[21/11]"
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
            <Image src={demoMapBackdrop} alt="" fill className="object-cover" sizes="(min-width: 1024px) 1200px, 100vw" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/15 to-background/40" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              {demoMapTrails.map((tr) => (
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

            {demoMapPins.map((pin) => (
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
                      "flex size-10 items-center justify-center rounded-2xl border border-white/20 shadow-lg backdrop-blur-md",
                      pinAccent[pin.kind],
                      "ring-2 ring-background/60"
                    )}
                  >
                    <PinIcon kind={pin.kind} />
                  </span>
                  <span className="mt-1 max-w-[140px] rounded-lg border border-white/15 bg-background/70 px-2 py-0.5 text-center text-[10px] font-medium text-foreground backdrop-blur-md">
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
            {demoMapTrails.map((tr) => (
              <div key={tr.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3">
                <p className="text-sm font-medium text-foreground">{tr.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tr.condition}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={cn(surface, "p-4 sm:p-5")}>
          <h3 className="text-sm font-semibold text-foreground">Recently explored</h3>
          <ul className="mt-3 space-y-2">
            {demoRecentlyExplored.map((r) => (
              <li key={r.trail + r.when} className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs">
                <span className="font-medium text-foreground">{r.trail}</span>
                <span className="shrink-0 text-muted-foreground">{r.who}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/92 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl sm:inset-auto sm:bottom-auto sm:left-auto sm:right-6 sm:top-24 sm:max-w-sm sm:rounded-2xl sm:border sm:p-5 lg:right-10"
          >
            <div className="mx-auto flex max-w-lg items-start justify-between gap-3 sm:max-w-none">
              <div>
                <p className="text-xs font-medium text-primary">Waypoint</p>
                <p className="mt-1 font-heading text-lg font-semibold text-foreground">{selected.label}</p>
                <p className="mt-2 text-sm text-muted-foreground">{selected.blurb}</p>
                {selected.trailCondition && (
                  <p className="mt-2 inline-flex rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] text-muted-foreground">
                    Trail feel · {selected.trailCondition}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
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
