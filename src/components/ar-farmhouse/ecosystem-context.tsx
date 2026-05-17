"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { NavId } from "@/components/ar-farmhouse/dashboard-nav";
import type { WeekendHubSlug } from "@/lib/weekend-hub-slug";

export type EcosystemContextValue = {
  openWeekendHub: (slug: WeekendHubSlug) => void;
  closeWeekendHub: () => void;
  goTo: (id: NavId) => void;
  hubOpen: boolean;
  hubSlug: WeekendHubSlug | null;
};

const EcosystemContext = createContext<EcosystemContextValue | null>(null);

/** Returns ecosystem context when mounted under `EcosystemProvider`, else `null`. */
export function useEcosystemOptional(): EcosystemContextValue | null {
  return useContext(EcosystemContext);
}

export function useEcosystem(): EcosystemContextValue {
  const v = useEcosystemOptional();
  if (!v) throw new Error("useEcosystem must be used within EcosystemProvider");
  return v;
}

export function EcosystemProvider({ children, goTo }: { children: ReactNode; goTo: (id: NavId) => void }) {
  const [hubSlug, setHubSlug] = useState<WeekendHubSlug | null>(null);

  const openWeekendHub = useCallback((slug: WeekendHubSlug) => {
    setHubSlug(slug);
  }, []);

  const closeWeekendHub = useCallback(() => {
    setHubSlug(null);
  }, []);

  const value = useMemo(
    () => ({
      openWeekendHub,
      closeWeekendHub,
      goTo,
      hubOpen: hubSlug !== null,
      hubSlug,
    }),
    [openWeekendHub, closeWeekendHub, goTo, hubSlug]
  );

  return <EcosystemContext.Provider value={value}>{children}</EcosystemContext.Provider>;
}
