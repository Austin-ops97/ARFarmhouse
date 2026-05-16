/**
 * Capability-based authorization — roles map to capabilities; checks never hardcode role names.
 */

export type Capability =
  | "bookings.approve"
  | "bookings.manage_blackouts"
  | "bookings.edit_any"
  | "bookings.delete_any"
  | "feed.moderate"
  | "feed.delete_any"
  | "admin.access"
  | "admin.settings"
  | "admin.analytics"
  | "property.manage"
  | "property.map_edit"
  | "users.manage_roles"
  | "media.upload"
  | "media.delete_any";

/** Future roles — stored in Firestore; normalized before capability lookup. */
export type PlatformRole =
  | "user"
  | "admin"
  | "moderator"
  | "property_manager"
  | "guest"
  | "maintenance"
  | "owner";

export type LegacyRole = "member";

const ROLE_CAPABILITIES: Record<PlatformRole, ReadonlySet<Capability>> = {
  user: new Set(["media.upload"]),
  guest: new Set(["media.upload"]),
  maintenance: new Set(["media.upload", "property.map_edit"]),
  moderator: new Set([
    "media.upload",
    "bookings.approve",
    "feed.moderate",
    "admin.access",
    "admin.analytics",
  ]),
  property_manager: new Set([
    "media.upload",
    "bookings.approve",
    "bookings.manage_blackouts",
    "bookings.edit_any",
    "bookings.delete_any",
    "property.manage",
    "property.map_edit",
    "admin.access",
    "admin.analytics",
  ]),
  admin: new Set([
    "media.upload",
    "bookings.approve",
    "bookings.manage_blackouts",
    "bookings.edit_any",
    "bookings.delete_any",
    "feed.moderate",
    "feed.delete_any",
    "admin.access",
    "admin.settings",
    "admin.analytics",
    "property.manage",
    "property.map_edit",
    "users.manage_roles",
    "media.delete_any",
  ]),
  owner: new Set([
    "media.upload",
    "bookings.approve",
    "bookings.manage_blackouts",
    "bookings.edit_any",
    "bookings.delete_any",
    "feed.moderate",
    "feed.delete_any",
    "admin.access",
    "admin.settings",
    "admin.analytics",
    "property.manage",
    "property.map_edit",
    "users.manage_roles",
    "media.delete_any",
  ]),
};

export function normalizePlatformRole(raw: unknown): PlatformRole {
  if (raw === "admin" || raw === "owner") return "admin";
  if (raw === "moderator") return "moderator";
  if (raw === "property_manager" || raw === "property-manager") return "property_manager";
  if (raw === "guest") return "guest";
  if (raw === "maintenance") return "maintenance";
  return "user";
}

export function capabilitiesForRole(role: unknown): ReadonlySet<Capability> {
  const normalized = normalizePlatformRole(role);
  return ROLE_CAPABILITIES[normalized] ?? ROLE_CAPABILITIES.user;
}

export function hasCapability(role: unknown, capability: Capability): boolean {
  return capabilitiesForRole(role).has(capability);
}

export function hasAnyCapability(role: unknown, caps: Capability[]): boolean {
  const set = capabilitiesForRole(role);
  return caps.some((c) => set.has(c));
}

export function hasAllCapabilities(role: unknown, caps: Capability[]): boolean {
  const set = capabilitiesForRole(role);
  return caps.every((c) => set.has(c));
}
