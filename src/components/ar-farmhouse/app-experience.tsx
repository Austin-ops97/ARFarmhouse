"use client";

import dynamic from "next/dynamic";

import { DashboardViewFallback } from "@/components/ar-farmhouse/dashboard-view-fallback";
import { ProfileSetupBanner } from "@/components/auth/profile-setup-banner";
import { ProtectedRoute } from "@/components/auth/protected-route";

const Dashboard = dynamic(
  () => import("@/components/ar-farmhouse/dashboard").then((m) => m.Dashboard),
  { loading: () => <DashboardViewFallback /> }
);

export function AppExperience() {
  return (
    <ProtectedRoute>
      <ProfileSetupBanner />
      <div className="relative z-10 min-h-dvh overflow-hidden bg-background ar-startup-fade-in">
        <Dashboard />
      </div>
    </ProtectedRoute>
  );
}
