"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

import { Dashboard } from "@/components/ar-farmhouse/dashboard";
import { LoginScreen } from "@/components/ar-farmhouse/login-screen";
import { DashboardSkeleton } from "@/components/ar-farmhouse/dashboard-skeleton";

type Phase = "login" | "loading" | "dashboard";

export function AppExperience() {
  const [phase, setPhase] = useState<Phase>("login");
  const reduceMotion = useReducedMotion();

  const ease = useMemo(() => [0.22, 1, 0.36, 1] as const, []);

  const handleLogin = useCallback(() => {
    setPhase("loading");
    window.setTimeout(() => setPhase("dashboard"), reduceMotion ? 220 : 780);
  }, [reduceMotion]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {phase === "login" && (
          <motion.div
            key="login"
            className="absolute inset-0 z-20 min-h-dvh"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              filter: reduceMotion ? "none" : "blur(14px)",
              scale: reduceMotion ? 1 : 1.03,
            }}
            transition={{ duration: reduceMotion ? 0.2 : 0.5, ease }}
          >
            <LoginScreen onLogin={handleLogin} />
          </motion.div>
        )}

        {phase === "loading" && (
          <motion.div
            key="loading"
            className="absolute inset-0 z-30 min-h-dvh bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: reduceMotion ? "none" : "blur(8px)" }}
            transition={{ duration: reduceMotion ? 0.2 : 0.45, ease }}
          >
            <DashboardSkeleton />
          </motion.div>
        )}

        {phase === "dashboard" && (
          <motion.div
            key="dashboard"
            className="relative z-10 min-h-dvh"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 220, damping: 28, mass: 0.85 }
            }
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
