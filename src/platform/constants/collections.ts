/**
 * Centralized Firestore collection names — avoid magic strings across services.
 */

export const COLLECTIONS = {
  users: "users",
  posts: "posts",
  bookings: "bookings",
  bookingDenials: "bookingDenials",
  blackoutDates: "blackoutDates",
  calendarEvents: "calendarEvents",
  bookingRequests: "bookingRequests",
  houseTasks: "houseTasks",
  routines: "routines",
  checklists: "checklists",
  albumMedia: "albumMedia",
  propertyStatus: "propertyStatus",
  propertyMapPins: "propertyMapPins",
  propertyMapTrails: "propertyMapTrails",
  propertyResources: "propertyResources",
  propertyInventory: "propertyInventory",
  systemSettings: "systemSettings",
  properties: "properties",
} as const;

/** Firestore document id for the live property checklist snapshot. */
export const CHECKLIST_CURRENT_DOC_ID = "current";

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
