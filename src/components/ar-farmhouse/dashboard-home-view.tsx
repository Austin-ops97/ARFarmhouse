"use client";

import { HomeContextualSpotlight } from "@/components/ar-farmhouse/home-contextual-spotlight";
import { HomeFeedPreview } from "@/components/ar-farmhouse/home-feed-preview";
import { HomeImmersiveHero } from "@/components/ar-farmhouse/home-immersive-hero";
import { HomeQuickActions } from "@/components/ar-farmhouse/home-quick-actions";
import { HomeThisWeekend } from "@/components/ar-farmhouse/home-this-weekend";

export function DashboardHomeView() {
  return (
    <div className="space-y-16 pb-6 sm:space-y-20 lg:space-y-24 lg:pb-2">
      <HomeImmersiveHero />
      <HomeThisWeekend />
      <HomeFeedPreview />
      <HomeQuickActions />
      <HomeContextualSpotlight />
    </div>
  );
}
