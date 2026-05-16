/**
 * Shared dashboard view motion — native-feel transitions without redesigning layouts.
 */

export const dashboardViewTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
} as const;

export const dashboardViewSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.85,
};

export const stickyHeaderClass =
  "sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70";
