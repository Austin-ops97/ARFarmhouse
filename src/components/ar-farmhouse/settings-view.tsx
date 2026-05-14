"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  Globe2,
  Monitor,
  Moon,
  Sparkles,
  Sun,
  UserRound,
  Wifi,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

const PREFS_KEY = "ar-settings-prefs-v1";

type Prefs = {
  notifyPush: boolean;
  notifyEmailDigest: boolean;
  notifyWeekend: boolean;
  privacyLocation: boolean;
  privacyDiscoverable: boolean;
  feedChronological: boolean;
  feedRichMedia: boolean;
  guidePreferMap: boolean;
  guideQuietHours: boolean;
  behaviorHaptics: boolean;
  behaviorDataSaver: boolean;
};

const defaultPrefs: Prefs = {
  notifyPush: true,
  notifyEmailDigest: false,
  notifyWeekend: true,
  privacyLocation: true,
  privacyDiscoverable: false,
  feedChronological: true,
  feedRichMedia: true,
  guidePreferMap: false,
  guideQuietHours: true,
  behaviorHaptics: true,
  behaviorDataSaver: false,
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultPrefs;
  }
}

function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[15px] font-medium leading-snug text-foreground">{label}</p>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 h-8 w-[3.25rem] shrink-0 rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:opacity-45",
          checked
            ? "border-primary/40 bg-primary/90 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]"
            : "border-border/80 bg-muted/50 dark:border-white/[0.08] dark:bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-6 -translate-y-1/2 rounded-full bg-background shadow-sm ring-1 ring-border/50 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-zinc-100 dark:ring-white/10",
            checked ? "left-[calc(100%-1.65rem)]" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cn("ar-surface-raised overflow-hidden rounded-[1.35rem]")}>
      <div className="border-b border-border/45 px-4 py-3.5 dark:border-white/[0.06]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border/45 px-4 dark:divide-white/[0.06]">{children}</div>
    </div>
  );
}

function Collapsible({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);

  return (
    <div className="ar-surface-tier2 rounded-[1.35rem]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="font-heading text-[15px] font-semibold tracking-tight text-foreground">{title}</p>
          {subtitle ? <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div className="border-t border-border/45 px-4 pb-4 pt-1 dark:border-white/[0.06]">
          <div className="divide-y divide-border/45 dark:divide-white/[0.06]">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function SettingsView() {
  const reduceMotion = useReducedMotion();
  const { theme, setTheme, ready } = useTheme();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setPrefs(loadPrefs());
  }, []);

  const patch = useCallback((partial: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePrefs(next);
      return next;
    });
  }, []);

  const appearanceHint = useMemo(
    () =>
      theme === "light"
        ? "Warm paper surfaces — designed to feel calm in daylight."
        : "Graphite depth with soft forest light — tuned for evening browsing.",
    [theme]
  );

  return (
    <div className="pb-20 pt-1">
      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-2xl space-y-2"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/35 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          System
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Settings</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Quiet controls for a private home — spacious layout, gentle defaults, nothing corporate.
        </p>
      </motion.header>

      <div className="mt-10 flex max-w-3xl flex-col gap-5">
        <SettingsGroup title="Appearance">
          <div className="py-4">
            <p className="text-[15px] font-medium text-foreground">Color theme</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{appearanceHint}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-md">
              <button
                type="button"
                disabled={!ready}
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                  theme === "dark"
                    ? "border-primary/45 bg-primary/12 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.55)]"
                    : "border-border/60 bg-muted/25 hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04]"
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-background/80 dark:border-white/10 dark:bg-zinc-900/80">
                  <Moon className="size-[18px] text-primary" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Dark</span>
                  <span className="text-[11px] text-muted-foreground">Cinematic · low glare</span>
                </span>
              </button>
              <button
                type="button"
                disabled={!ready}
                onClick={() => setTheme("light")}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition",
                  theme === "light"
                    ? "border-primary/45 bg-primary/12 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.25)]"
                    : "border-border/60 bg-muted/25 hover:border-border dark:border-white/[0.08] dark:bg-white/[0.04]"
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-background/80 dark:border-white/10 dark:bg-zinc-900/80">
                  <Sun className="size-[18px] text-primary" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">Light</span>
                  <span className="text-[11px] text-muted-foreground">Warm paper · editorial</span>
                </span>
              </button>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Profile">
          <div className="py-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 dark:border-white/10 dark:bg-white/[0.04]">
                <UserRound className="size-[18px] text-primary" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-foreground">Household identity</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Name, photo, and branch labels stay on-device until you connect the live profile service.
                </p>
              </div>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Notifications">
          <ToggleRow
            label="Push moments"
            description="Soft nudges when someone shares arrivals or weekend notes."
            checked={prefs.notifyPush}
            onCheckedChange={(v) => patch({ notifyPush: v })}
          />
          <ToggleRow
            label="Weekly digest"
            description="A single calm email — never a blast."
            checked={prefs.notifyEmailDigest}
            onCheckedChange={(v) => patch({ notifyEmailDigest: v })}
          />
          <ToggleRow
            label="Weekend pulse"
            description="Day-before weather and gate reminders."
            checked={prefs.notifyWeekend}
            onCheckedChange={(v) => patch({ notifyWeekend: v })}
          />
        </SettingsGroup>

        <SettingsGroup title="Privacy">
          <ToggleRow
            label="Location on posts"
            description="Show property pins you explicitly attach — off by default for guests."
            checked={prefs.privacyLocation}
            onCheckedChange={(v) => patch({ privacyLocation: v })}
          />
          <ToggleRow
            label="Discoverable household"
            description="Preview toggle — controls how invites appear on the network map."
            checked={prefs.privacyDiscoverable}
            onCheckedChange={(v) => patch({ privacyDiscoverable: v })}
          />
        </SettingsGroup>

        <SettingsGroup title="Feed preferences">
          <ToggleRow
            label="Chronological river"
            description="Keep time honest — no algorithmic reshuffling."
            checked={prefs.feedChronological}
            onCheckedChange={(v) => patch({ feedChronological: v })}
          />
          <ToggleRow
            label="Rich media autoplay"
            description="Ambient previews while scrolling — respects reduced motion."
            checked={prefs.feedRichMedia}
            onCheckedChange={(v) => patch({ feedRichMedia: v })}
          />
        </SettingsGroup>

        <SettingsGroup title="Local guide">
          <ToggleRow
            label="Open on map tab"
            description="Start in cartography mode when you arrive in Mena."
            checked={prefs.guidePreferMap}
            onCheckedChange={(v) => patch({ guidePreferMap: v })}
          />
          <ToggleRow
            label="Quiet hours hints"
            description="Softer banners late night — still shows essentials."
            checked={prefs.guideQuietHours}
            onCheckedChange={(v) => patch({ guideQuietHours: v })}
          />
        </SettingsGroup>

        <Collapsible title="App behavior" subtitle="Motion, data, and focus defaults" defaultOpen={false}>
          <ToggleRow
            label="Haptic cues"
            description="Light taps on supported phones when completing rituals."
            checked={prefs.behaviorHaptics}
            onCheckedChange={(v) => patch({ behaviorHaptics: v })}
          />
          <ToggleRow
            label="Data saver"
            description="Defer hero imagery until you pause on a card."
            checked={prefs.behaviorDataSaver}
            onCheckedChange={(v) => patch({ behaviorDataSaver: v })}
          />
        </Collapsible>

        <SettingsGroup title="Connected devices">
          <div className="flex items-start gap-3 py-4">
            <Monitor className="mt-0.5 size-4 shrink-0 text-primary/90" aria-hidden />
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-foreground">This browser session</p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Device management ships with the live stack — here you&apos;re seeing a polished preview shell.
              </p>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="About">
          <div className="space-y-3 py-4 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              AR Farmhouse is a private property OS — feed, calendar, album, and guide woven into one calm surface.
            </p>
            <Separator className="bg-border/50 dark:bg-white/[0.06]" />
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-foreground/90 dark:border-white/10">
                <Globe2 className="size-3 opacity-70" aria-hidden />
                v0.1 design system
              </span>
              <span className="text-muted-foreground/80">Premium UI preview · no telemetry in demo</span>
            </p>
          </div>
        </SettingsGroup>

        <div className="flex flex-wrap gap-3 rounded-[1.35rem] border border-dashed border-border/60 bg-muted/20 px-4 py-4 text-[12px] text-muted-foreground dark:border-white/[0.08] dark:bg-white/[0.02]">
          <Wifi className="size-4 shrink-0 text-primary/80" aria-hidden />
          <p>
            Preferences save locally in this browser. Theme syncs instantly and persists for return visits.
          </p>
        </div>
      </div>
    </div>
  );
}
