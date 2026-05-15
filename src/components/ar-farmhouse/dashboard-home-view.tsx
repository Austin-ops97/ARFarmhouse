"use client";

import dynamic from "next/dynamic";

import { HomeCalendarProvider } from "@/contexts/home-calendar-context";
import { HomeImmersiveHero } from "@/components/ar-farmhouse/home-immersive-hero";
import { HomeQuickActions } from "@/components/ar-farmhouse/home-quick-actions";
import { HomeDeferredSectionFallback } from "@/components/ar-farmhouse/dashboard-view-fallback";

const FamilyActivityStripLazy = dynamic(
  () => import("@/components/ar-farmhouse/family-activity-strip").then((m) => m.FamilyActivityStrip),
  { loading: () => <HomeDeferredSectionFallback /> }
);
const HomeThisWeekendLazy = dynamic(
  () => import("@/components/ar-farmhouse/home-this-weekend").then((m) => m.HomeThisWeekend),
  { loading: () => <HomeDeferredSectionFallback /> }
);
const HomePhotoMemoriesLazy = dynamic(
  () => import("@/components/ar-farmhouse/home-photo-memories").then((m) => m.HomePhotoMemories),
  { loading: () => <HomeDeferredSectionFallback /> }
);
const HomeFeedPreviewLazy = dynamic(
  () => import("@/components/ar-farmhouse/home-feed-preview").then((m) => m.HomeFeedPreview),
  { loading: () => <HomeDeferredSectionFallback /> }
);
const HomeContextualSpotlightLazy = dynamic(
  () => import("@/components/ar-farmhouse/home-contextual-spotlight").then((m) => m.HomeContextualSpotlight),
  { loading: () => <HomeDeferredSectionFallback /> }
);

export function DashboardHomeView() {
  return (
    <HomeCalendarProvider>
    <div className="flex flex-col gap-16 pb-6 sm:gap-20 lg:gap-24 lg:pb-2">
      <div className="flex flex-col gap-3 sm:gap-4">
        <HomeImmersiveHero />
        <HomeQuickActions />
      </div>
      <FamilyActivityStripLazy />
      <HomeThisWeekendLazy />
      <HomePhotoMemoriesLazy />
      <HomeFeedPreviewLazy />
      <HomeContextualSpotlightLazy />
    </div>
    </HomeCalendarProvider>
  );
}
