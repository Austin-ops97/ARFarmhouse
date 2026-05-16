/**
 * Centralized Firestore collection names — avoid magic strings across services.
 */

export const COLLECTIONS = {
  users: "users",
  posts: "posts",
  bookings: "bookings",
  blackoutDates: "blackoutDates",
  calendarEvents: "calendarEvents",
  bookingRequests: "bookingRequests",
  houseTasks: "houseTasks",
  albumMedia: "albumMedia",
  propertyStatus: "propertyStatus",
  propertyMapPins: "propertyMapPins",
  propertyMapTrails: "propertyMapTrails",
  propertyResources: "propertyResources",
  propertyInventory: "propertyInventory",
  systemSettings: "systemSettings",
  properties: "properties",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
