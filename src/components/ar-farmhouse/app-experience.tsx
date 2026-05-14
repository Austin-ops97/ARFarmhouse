"use client";

import { motion, useReducedMotion } from "framer-motion";

import { Dashboard } from "@/components/ar-farmhouse/dashboard";
import { ProtectedRoute } from "@/components/auth/protected-route";

export function AppExperience() {
  const reduceMotion = useReducedMotion();

  return (
    <ProtectedRoute>
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
    </ProtectedRoute>
  );
}
