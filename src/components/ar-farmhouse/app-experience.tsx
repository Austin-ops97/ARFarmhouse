"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

import { Dashboard } from "@/components/ar-farmhouse/dashboard";
import { LoginScreen } from "@/components/ar-farmhouse/login-screen";
import { DashboardSkeleton } from "@/components/ar-farmhouse/dashboard-skeleton";
import { useAuth } from "@/contexts/auth-context";

type Phase = "login" | "loading" | "dashboard";

export function AppExperience() {
  const { configured, loading: authLoading, user } = useAuth();
  const [demoPhase, setDemoPhase] = useState<Phase>("login");
  const reduceMotion = useReducedMotion();
  const ease = useMemo(() => [0.22, 1, 0.36, 1] as const, []);

  const handleDemoLogin = useCallback(() => {
    setDemoPhase("loading");
    window.setTimeout(() => setDemoPhase("dashboard"), reduceMotion ? 220 : 780);
  }, [reduceMotion]);

  if (configured) {
    if (authLoading) {
      return (
        <div className="relative min-h-dvh overflow-hidden bg-background">
          <div className="absolute inset-0 z-30 min-h-dvh bg-background">
            <DashboardSkeleton />
          </div>
        </div>
      );
    }
    if (!user) {
      return (
        <div className="relative min-h-dvh overflow-hidden bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key="login-live"
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
              <LoginScreen mode="live" />
            </motion.div>
          </AnimatePresence>
        </div>
      );
    }
    return (
      <div className="relative min-h-dvh overflow-hidden bg-background">
        <motion.div
          key="dashboard-live"
          className="relative z-10 min-h-dvh"
          initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : { type: "spring", stiffness: 220, damping: 28, mass: 0.85 }
          }
        >
          <Dashboard />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {demoPhase === "login" && (
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
            <LoginScreen mode="demo" onDemoEnter={handleDemoLogin} />
          </motion.div>
        )}

        {demoPhase === "loading" && (
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

        {demoPhase === "dashboard" && (
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
