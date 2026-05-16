/**
 * Property domain — map, tasks, hub, multi-property scope.
 */

export {
  DEFAULT_PROPERTY_ID,
  resolvePropertyId,
  propertyDocPath,
  withDefaultPropertyId,
  PROPERTY_ID_FIELD,
} from "@/platform/constants/property";
export { PropertyDataProvider, usePropertyData } from "@/contexts/property-data-context";
export {
  subscribeHouseTasks,
  subscribeCalendarEvents,
  subscribePropertyMapPins,
} from "@/services/property-data";
export type { HouseTask, PropertyMapPin } from "@/lib/property-operations";
