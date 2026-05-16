"use client";

import { motion, useReducedMotion } from "framer-motion";

import { HomeCalendarProvider } from "@/contexts/home-calendar-context";
import { HomeDashboardHeader } from "@/components/ar-farmhouse/home-dashboard-header";
import { HomeQuickActions } from "@/components/ar-farmhouse/home-quick-actions";
import { HomeTasksPreview } from "@/components/ar-farmhouse/home-tasks-preview";
import { HomeUpcomingCard } from "@/components/ar-farmhouse/home-upcoming-card";
import { HomeWeatherCard } from "@/components/ar-farmhouse/home-weather-card";

const homeItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;

const homeItemStill = {
  hidden: {},
  show: {},
} as const;

export function DashboardHomeView() {
  const reduceMotion = useReducedMotion();
  const item = reduceMotion ? homeItemStill : homeItem;
  const container = reduceMotion
    ? ({ hidden: {}, show: {} } as const)
    : {
        hidden: {},
        show: {
          transition: { staggerChildren: 0.055, delayChildren: 0.04 },
        },
      };

  return (
    <HomeCalendarProvider>
      <motion.div
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={container}
        className="flex flex-col gap-7 pb-2 sm:gap-8 lg:gap-10"
      >
        <motion.div variants={item}>
          <HomeDashboardHeader />
        </motion.div>
        <motion.div variants={item}>
          <HomeUpcomingCard />
        </motion.div>
        <motion.div variants={item} className="grid gap-4 sm:gap-4 lg:grid-cols-2">
          <HomeWeatherCard />
          <HomeTasksPreview />
        </motion.div>
        <motion.div variants={item}>
          <HomeQuickActions />
        </motion.div>
      </motion.div>
    </HomeCalendarProvider>
  );
}
