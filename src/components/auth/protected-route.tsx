"use client";

import { type ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardSkeleton } from "@/components/ar-farmhouse/dashboard-skeleton";
import { FirebaseSetupGate } from "@/components/auth/firebase-setup-gate";
import { useAuth } from "@/contexts/auth-context";

type ProtectedRouteProps = {
  children: ReactNode;
};

/**
 * Client-side gate: Firebase configured, session resolved, user signed in.
 * Redirects anonymous visitors to `/login` without layout flicker.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { configured, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [configured, loading, router, user]);

  if (!configured) {
    return <FirebaseSetupGate />;
  }

  if (loading || !user) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-background">
        <div className="absolute inset-0 z-30 min-h-dvh bg-background">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
