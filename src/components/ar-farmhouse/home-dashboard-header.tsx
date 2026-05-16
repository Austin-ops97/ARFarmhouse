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
    <header>
      <h1 className="font-heading text-[clamp(1.5rem,4vw,2.1rem)] font-semibold leading-[1.12] tracking-tight text-foreground text-balance">
        {greeting}, {firstName}
      </h1>
    </header>
  );
}
