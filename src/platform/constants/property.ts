/**
 * Multi-property scaffolding — single-property UX today, property-scoped data tomorrow.
 * All helpers default to {@link DEFAULT_PROPERTY_ID} so existing documents stay valid.
 */

/** Canonical property id for AR Farmhouse (single-property deployment). */
export const DEFAULT_PROPERTY_ID = "ar-farmhouse";

/** Firestore path prefix when migrating to `properties/{propertyId}/…` subcollections. */
export const PROPERTIES_COLLECTION = "properties";

export type PropertyScoped = {
  /** Optional until legacy docs are backfilled; defaults to {@link DEFAULT_PROPERTY_ID}. */
  propertyId?: string | null;
};

export function resolvePropertyId(scope?: PropertyScoped | null): string {
  const id = scope?.propertyId?.trim();
  return id && id.length > 0 ? id : DEFAULT_PROPERTY_ID;
}

export function propertyDocPath(propertyId: string = DEFAULT_PROPERTY_ID): string {
  return `${PROPERTIES_COLLECTION}/${propertyId}`;
}

export function scopedCollectionPath(
  collection: string,
  propertyId: string = DEFAULT_PROPERTY_ID
): string {
  return `${propertyDocPath(propertyId)}/${collection}`;
}

/** Query filter field name — attach to new writes; readers tolerate absence. */
export const PROPERTY_ID_FIELD = "propertyId" as const;

export function withDefaultPropertyId<T extends Record<string, unknown>>(
  data: T,
  propertyId: string = DEFAULT_PROPERTY_ID
): T & { propertyId: string } {
  return { ...data, propertyId };
}
