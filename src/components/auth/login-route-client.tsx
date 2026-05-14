"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardSkeleton } from "@/components/ar-farmhouse/dashboard-skeleton";
import { LoginScreen } from "@/components/ar-farmhouse/login-screen";
import { FirebaseSetupGate } from "@/components/auth/firebase-setup-gate";
import { useAuth } from "@/contexts/auth-context";

/**
 * `/login` — real Firebase email/password only. Authenticated users leave for `/`.
 */
export function LoginRouteClient() {
  const { configured, loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!configured || loading) return;
    if (user) {
      router.replace("/");
    }
  }, [configured, loading, router, user]);

  if (!configured) {
    return <FirebaseSetupGate />;
  }

  if (loading) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-background">
        <div className="absolute inset-0 z-30 min-h-dvh bg-background">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-background">
        <div className="absolute inset-0 z-30 min-h-dvh bg-background">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return <LoginScreen />;
}
