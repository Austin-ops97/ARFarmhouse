"use client";

import { HomeContextualSpotlight } from "@/components/ar-farmhouse/home-contextual-spotlight";
import { HomeFeedPreview } from "@/components/ar-farmhouse/home-feed-preview";
import { HomeImmersiveHero } from "@/components/ar-farmhouse/home-immersive-hero";
import { HomePhotoMemories } from "@/components/ar-farmhouse/home-photo-memories";
import { HomeQuickActions } from "@/components/ar-farmhouse/home-quick-actions";
import { HomeThisWeekend } from "@/components/ar-farmhouse/home-this-weekend";

export function DashboardHomeView() {
  return (
    <div className="flex flex-col gap-16 pb-6 sm:gap-20 lg:gap-24 lg:pb-2">
      <div className="flex flex-col gap-3 sm:gap-4">
        <HomeImmersiveHero />
        <HomeQuickActions />
      </div>
      <HomeThisWeekend />
      <HomePhotoMemories />
      <HomeFeedPreview />
      <HomeContextualSpotlight />
    </div>
  );
}
