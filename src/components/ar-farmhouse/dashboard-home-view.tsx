"use client";

import { HomeCalendarProvider } from "@/contexts/home-calendar-context";
import { HomeDashboardHeader } from "@/components/ar-farmhouse/home-dashboard-header";
import { HomeQuickActions } from "@/components/ar-farmhouse/home-quick-actions";
import { HomeTasksPreview } from "@/components/ar-farmhouse/home-tasks-preview";
import { HomeUpcomingCard } from "@/components/ar-farmhouse/home-upcoming-card";
import { HomeWeatherCard } from "@/components/ar-farmhouse/home-weather-card";

export function DashboardHomeView() {
  return (
    <HomeCalendarProvider>
      <div className="flex flex-col gap-8 pb-2 sm:gap-10 lg:gap-12">
        <HomeDashboardHeader />
        <HomeUpcomingCard />
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          <HomeWeatherCard />
          <HomeTasksPreview />
        </div>
        <HomeQuickActions />
      </div>
    </HomeCalendarProvider>
  );
}
