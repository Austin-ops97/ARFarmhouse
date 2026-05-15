"use client";

import dynamic from "next/dynamic";

import { StartupShell } from "@/components/ar-farmhouse/startup-shell";

const AppExperience = dynamic(
  () => import("@/components/ar-farmhouse/app-experience").then((mod) => mod.AppExperience),
  {
    ssr: false,
    loading: () => <StartupShell />,
  }
);

export function HomeClient() {
  return <AppExperience />;
}
