import type { WeekendHubSlug } from "@/lib/weekend-hub-slug";

/** Map free-text linked events from posts to weekend hub slugs (keyword heuristics). */
export function hubSlugFromLinkedEventLabel(label: string): WeekendHubSlug | null {
  const t = label.toLowerCase();
  if (t.includes("memorial")) return "memorial-mdw";
  if (t.includes("willow") || t.includes("fishing")) return "fishing-jun";
  if (t.includes("deer camp")) return "deer-camp";
  if (t.includes("bbq") || t.includes("great lawn")) return "bbq-jul";
  if (t.includes("dock work")) return "dock-may";
  if (t.includes("family weekend")) return "current";
  return null;
}
