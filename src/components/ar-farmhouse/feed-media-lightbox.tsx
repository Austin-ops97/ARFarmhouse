"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { AR_FULLSCREEN_OVERLAY } from "@/lib/mobile-overlay";
import { cn } from "@/lib/utils";

export type FeedMediaLightboxState = { urls: string[]; index: number } | null;

const MIN_SCALE = 1;
const MAX_SCALE = 4;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function pullingCloseMotionTransition(reduceMotion: boolean | null) {
  return reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.72 };
}

function touchDistance(a: Touch, b: Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/**
 * Fullscreen feed media: pinch–zoom, pan while zoomed, double-tap zoom,
 * horizontal swipe between photos when zoom ≈ 1, pull-down dismiss,
 * tap outside the photo to close, ⌃+wheel zoom (desktop / trackpad pinch).
 */
export function FeedMediaLightbox({
  state,
  onClose,
  onPrev,
  onNext,
  reduceMotion,
}: {
  state: FeedMediaLightboxState;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  reduceMotion: boolean | null;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const activeSrc = state?.urls[state.index];
  const multi = !!(state && state.urls.length > 1);

  useBodyScrollLock(Boolean(state));

  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const dragRef = useRef({ sx: 0, sy: 0, ox: 0, oy: 0, active: false });
  const pinchRef = useRef({ dist: 0, baseScale: 1 });

  const live = useRef({ scale: 1, tx: 0, ty: 0 });

  const [pullCloseY, setPullCloseY] = useState(0);

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const [fitted, setFitted] = useState({ w: 0, h: 0 });

  live.current = { scale, tx, ty };

  useLayoutEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    setPullCloseY(0);
  }, [activeSrc]);

  const measureFit = useCallback(() => {
    const img = imgRef.current;
    if (!img || !viewportRef.current) return;
    requestAnimationFrame(() => {
      const r = img.getBoundingClientRect();
      if (r.width > 4 && r.height > 4) setFitted({ w: r.width, h: r.height });
    });
  }, []);

  useLayoutEffect(() => {
    measureFit();
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measureFit);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [measureFit, activeSrc]);

  const clampPan = useCallback(
    (s: number, x: number, y: number) => {
      if (s <= 1 + 3e-3 || fitted.w <= 1 || fitted.h <= 1) return { x: 0, y: 0 };
      const vw = viewportRef.current?.clientWidth ?? fitted.w * s;
      const vh = viewportRef.current?.clientHeight ?? fitted.h * s;
      const sw = fitted.w * s;
      const sh = fitted.h * s;
      const maxX = Math.max(14, (sw - vw) * 0.5);
      const maxY = Math.max(14, (sh - vh) * 0.5);
      return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
    },
    [fitted.h, fitted.w]
  );

  useEffect(() => {
    const nx = clampPan(scale, tx, ty);
    if (nx.x !== tx || nx.y !== ty) {
      setTx(nx.x);
      setTy(nx.y);
    }
  }, [clampPan, scale, tx, ty]);

  const swipeNav = useRef({ x: 0, y: 0, t: 0 });
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    if (!state || !mounted) return;

    let pullArmed = false;
    let pulling = false;

    const resetPullUi = () => {
      pulling = false;
      pullArmed = false;
      setPullCloseY(0);
    };

    let mode: "none" | "pinch" | "pan_one" | "pull_close" | "quick_nav_hint" = "none";

    let cancelled = false;
    let cleanupBound: (() => void) | undefined;

    const bind = () => {
      const el = viewportRef.current;
      if (!el || cancelled) return;

      const onStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
        mode = "pinch";
        pinchRef.current = {
          dist: Math.max(touchDistance(e.touches[0]!, e.touches[1]!), 6),
          baseScale: live.current.scale,
        };
        dragRef.current.active = false;
        resetPullUi();
        return;
      }

      if (live.current.scale > 1.02 && e.touches.length === 1) {
        mode = "pan_one";
        const tch = e.touches[0]!;
        dragRef.current = {
          sx: tch.clientX,
          sy: tch.clientY,
          ox: live.current.tx,
          oy: live.current.ty,
          active: true,
        };
        pinchRef.current = { ...pinchRef.current };
        resetPullUi();
        return;
      }

      mode = live.current.scale <= 1.02 ? "quick_nav_hint" : "none";
      if (live.current.scale <= 1.02 && e.touches.length === 1) {
        const tch = e.touches[0]!;
        pullArmed = true;
        dragRef.current = { sx: 0, sy: tch.clientY, ox: 0, oy: tch.clientY, active: false };
        swipeNav.current = { x: tch.clientX, y: tch.clientY, t: Date.now() };

        const now = Date.now();
        const lt = lastTap.current;
        if (lt && now - lt.t < 290) {
          if (Math.abs(tch.clientX - lt.x) < 26 && Math.abs(tch.clientY - lt.y) < 26) {
            const next = live.current.scale > 1.4 ? MIN_SCALE : 2;
            setScale(next);
            const fb = clampPan(next, 0, 0);
            setTx(fb.x);
            setTy(fb.y);
            lastTap.current = null;
            pullArmed = false;
            return;
          }
        }
        lastTap.current = { t: now, x: tch.clientX, y: tch.clientY };
      }
      };

      const onMove = (e: TouchEvent) => {
      if (mode === "pinch" && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const ratio = Math.max(touchDistance(e.touches[0]!, e.touches[1]!), 2) / pinchRef.current.dist;
        const raw = pinchRef.current.baseScale * ratio;
        const nextScale = clamp(raw, MIN_SCALE, MAX_SCALE);
        setScale(nextScale);
        setTx((x) => clampPan(nextScale, x, live.current.ty).x);
        setTy((y) => clampPan(nextScale, live.current.tx, y).y);
        return;
      }

      if (mode === "pan_one" && dragRef.current.active && e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        const tch = e.touches[0]!;
        const dx = tch.clientX - dragRef.current.sx;
        const dy = tch.clientY - dragRef.current.sy;
        const moved = clampPan(live.current.scale, dragRef.current.ox + dx, dragRef.current.oy + dy);
        setTx(moved.x);
        setTy(moved.y);
        return;
      }

      if (!(pullArmed && live.current.scale <= 1.02 && e.touches.length === 1 && mode !== "pinch"))
        return;

      const tch = e.touches[0]!;
      if (pulling || mode === "pull_close") {
        if (e.cancelable) e.preventDefault();
        const dy = Math.max(0, tch.clientY - dragRef.current.oy);
        setPullCloseY(Math.min(dy * 0.42, 120));
        return;
      }

      const dyProbe = tch.clientY - dragRef.current.oy;
      const dxAbs = Math.abs(tch.clientX - swipeNav.current.x);
      if (dyProbe > 24 && dyProbe > dxAbs * 0.82) {
        pulling = true;
        mode = "pull_close";
        if (e.cancelable) e.preventDefault();
        setPullCloseY(Math.min(dyProbe * 0.42, 120));
      }
      };

      const onEnd = (e: TouchEvent) => {
      const tc = e.changedTouches[0];

      if (multi && tc && live.current.scale <= 1.04) {
        const ns = swipeNav.current;
        const dx = tc.clientX - ns.x;
        const dyAbs = Math.abs(tc.clientY - ns.y);
        const dur = Date.now() - ns.t;
        if (dur < 420 && dx < -58 && Math.abs(dx) > dyAbs * 1.3) void onNext();
        else if (dur < 420 && dx > 58 && Math.abs(dx) > dyAbs * 1.3) void onPrev();
      }

      if (mode === "pinch" && e.touches.length < 2) {
        pinchRef.current.baseScale = clamp(live.current.scale, MIN_SCALE, MAX_SCALE);
        mode = "none";
      }

      if (pullArmed || pulling || mode === "pull_close") {
        const dy = tc ? tc.clientY - dragRef.current.oy : 0;
        if (pulling && dy > 98) {
          resetPullUi();
          onClose();
          dragRef.current.active = false;
          pullArmed = false;
          pulling = false;
          mode = "none";
          return;
        }
        resetPullUi();
      }

      dragRef.current.active = false;
      pullArmed = false;
      pulling = false;
      mode = "none";
      };

      const onWheel = (ev: WheelEvent) => {
      if (!ev.ctrlKey) return;
      ev.preventDefault();
      const next = clamp(live.current.scale * (1 - ev.deltaY * 0.003), MIN_SCALE, MAX_SCALE);
      setScale(next);
      const b = clampPan(next, live.current.tx, live.current.ty);
      setTx(b.x);
      setTy(b.y);
      };

      el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    el.addEventListener("wheel", onWheel, { passive: false });

    cleanupBound = () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      el.removeEventListener("wheel", onWheel);
    };
    };

    let rafOuter = 0;
    let rafInner = 0;
    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(bind);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      cleanupBound?.();
      resetPullUi();
    };
  }, [clampPan, mounted, multi, onClose, onNext, onPrev, state, activeSrc]);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, onClose, onPrev, onNext]);

  const gestureStyle = useMemo(
    () => ({
      transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
      transformOrigin: "center center" as const,
    }),
    [scale, tx, ty]
  );

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {state && activeSrc ? (
        <motion.div
          layout={false}
          role="dialog"
          aria-modal="true"
          aria-label="Photos"
          key="feed-media-lightbox-shell"
          style={{ y: pullCloseY }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: pullCloseY }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: reduceMotion ? 0.1 : 0.2 },
            y: pullingCloseMotionTransition(reduceMotion),
          }}
          className={cn(
            AR_FULLSCREEN_OVERLAY,
            "cursor-default outline-none overscroll-none bg-black/[0.94] backdrop-blur-xl"
          )}
          onClick={onClose}
        >
          <button
            type="button"
            className={cn(
              "pointer-events-auto ml-auto mr-[max(0.75rem,env(safe-area-inset-right))] mt-[max(0.65rem,env(safe-area-inset-top))]",
              "z-[130] shrink-0 rounded-full border border-white/15 bg-black/48 p-2.5 text-white shadow-sm hover:bg-black/58 active:opacity-92"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
          >
            <X className="size-5 pointer-events-none" aria-hidden />
          </button>

          {multi ? (
            <div className="pointer-events-none absolute left-0 top-1/2 z-[130] hidden w-full -translate-y-1/2 justify-between px-[max(0.75rem,env(safe-area-inset-left))] sm:flex sm:px-6">
              <button
                type="button"
                className={cn(
                  "pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  "border border-white/14 bg-black/48 text-[19px] text-white shadow backdrop-blur-md hover:bg-black/58"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev();
                }}
                aria-label="Previous photo"
              >
                ‹
              </button>
              <button
                type="button"
                className={cn(
                  "pointer-events-auto ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  "border border-white/14 bg-black/48 text-[19px] text-white shadow backdrop-blur-md hover:bg-black/58"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onNext();
                }}
                aria-label="Next photo"
              >
                ›
              </button>
            </div>
          ) : null}

          <div
            ref={viewportRef}
            role="presentation"
            className={cn(
              "relative z-[125] flex min-h-0 flex-1 touch-none items-center justify-center",
              "cursor-default px-3 sm:px-5"
            )}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              key={activeSrc}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex max-h-full max-w-full touch-none items-center justify-center"
              style={gestureStyle}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={activeSrc}
                alt=""
                className="pointer-events-auto max-h-[min(88dvh,_920px)] max-w-[min(1240px,_calc(100vw-1.75rem))] select-none rounded-[min(12px,_0.8vw)] object-contain shadow-[0_22px_96px_-34px_rgba(0,0,0,0.65)]"
                draggable={false}
                decoding="async"
                onLoad={measureFit}
                sizes="(max-width: 768px) 100vw, 1200px"
              />
            </motion.div>
          </div>

          <p className="pointer-events-none shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 text-center text-[10px] leading-snug text-white/58">
            {multi
              ? "Pinch zoom · drag when zoomed · swipe left/right · pull down · tap outside photo to close"
              : "Pinch zoom · drag when zoomed · pull down · tap outside photo to close"}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
