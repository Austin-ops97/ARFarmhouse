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
    <header className="space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground/85">
        AR Farmhouse · Property overview
      </p>
      <h1 className="font-heading text-[clamp(1.65rem,4vw,2.25rem)] font-semibold tracking-tight text-foreground text-balance">
        {greeting}, {firstName}
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
        Upcoming stays, local conditions, and active work — everything you need at a glance.
      </p>
    </header>
  );
}
