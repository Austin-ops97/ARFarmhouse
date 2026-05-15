"use client";

import { useAuth } from "@/contexts/auth-context";
import { resolveHomeAtmosphere } from "@/lib/home-context";

const atmosphereGreeting: Record<ReturnType<typeof resolveHomeAtmosphere>, string> = {
  dawn: "Good morning",
  day: "Good afternoon",
  dusk: "Good evening",
  night: "Good evening",
};

export function HomeDashboardHeader() {
  const { displayName } = useAuth();
  const firstName = displayName.split(/\s+/)[0] ?? displayName;
  const atmosphere = resolveHomeAtmosphere(new Date());
  const greeting = atmosphereGreeting[atmosphere];

  return (
    <header className="space-y-0.5 sm:space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80 sm:text-[11px] sm:tracking-[0.22em]">
        AR Farmhouse · Property overview
      </p>
      <h1 className="font-heading text-[clamp(1.42rem,3.85vw,2.1rem)] font-semibold leading-[1.14] tracking-tight text-foreground text-balance sm:leading-tight">
        {greeting}, {firstName}
      </h1>
      <p className="max-w-xl text-[13px] leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed">
        Upcoming stays, local conditions, and active work — everything you need at a glance.
      </p>
    </header>
  );
}
