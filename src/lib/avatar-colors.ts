/** Preset muted avatar background colors — stored on the user profile by id. */
export type AvatarColorId =
  | "sage"
  | "slate"
  | "clay"
  | "sand"
  | "mist"
  | "dusk"
  | "rose"
  | "ocean";

export type AvatarColorPreset = {
  id: AvatarColorId;
  label: string;
  bg: string;
  text: string;
  ring: string;
};

export const AVATAR_COLOR_PRESETS: readonly AvatarColorPreset[] = [
  { id: "sage", label: "Sage", bg: "bg-emerald-500/22", text: "text-emerald-900/90 dark:text-emerald-100/95", ring: "ring-emerald-500/25" },
  { id: "slate", label: "Slate", bg: "bg-slate-500/22", text: "text-slate-900/90 dark:text-slate-100/95", ring: "ring-slate-500/25" },
  { id: "clay", label: "Clay", bg: "bg-amber-700/18", text: "text-amber-950/85 dark:text-amber-100/95", ring: "ring-amber-700/22" },
  { id: "sand", label: "Sand", bg: "bg-amber-500/16", text: "text-amber-900/88 dark:text-amber-50/95", ring: "ring-amber-500/22" },
  { id: "mist", label: "Mist", bg: "bg-sky-500/18", text: "text-sky-950/88 dark:text-sky-100/95", ring: "ring-sky-500/22" },
  { id: "dusk", label: "Dusk", bg: "bg-violet-500/20", text: "text-violet-950/88 dark:text-violet-100/95", ring: "ring-violet-500/24" },
  { id: "rose", label: "Rose", bg: "bg-rose-500/18", text: "text-rose-950/88 dark:text-rose-100/95", ring: "ring-rose-500/22" },
  { id: "ocean", label: "Ocean", bg: "bg-teal-600/18", text: "text-teal-950/88 dark:text-teal-100/95", ring: "ring-teal-600/22" },
] as const;

export const DEFAULT_AVATAR_COLOR_ID: AvatarColorId = "slate";

const PRESET_BY_ID = new Map(AVATAR_COLOR_PRESETS.map((p) => [p.id, p]));

export function normalizeAvatarColorId(raw: unknown): AvatarColorId {
  if (typeof raw === "string" && PRESET_BY_ID.has(raw as AvatarColorId)) {
    return raw as AvatarColorId;
  }
  return DEFAULT_AVATAR_COLOR_ID;
}

export function avatarColorPreset(id: unknown): AvatarColorPreset {
  return PRESET_BY_ID.get(normalizeAvatarColorId(id)) ?? PRESET_BY_ID.get(DEFAULT_AVATAR_COLOR_ID)!;
}

/** Stable color for legacy rows that only have a uid (e.g. old feed posts). */
export function avatarColorIdForUid(uid: string): AvatarColorId {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % AVATAR_COLOR_PRESETS.length;
  return AVATAR_COLOR_PRESETS[idx]!.id;
}
