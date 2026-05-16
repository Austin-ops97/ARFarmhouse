/**
 * Cursor pagination helpers for scalable Firestore queries.
 */

export type PageParams<TCursor = unknown> = {
  pageSize: number;
  cursor?: TCursor | null;
};

export type PageResult<T, TCursor = unknown> = {
  items: T[];
  nextCursor: TCursor | null;
  hasMore: boolean;
};

export const DEFAULT_PAGE_SIZE = 24;
export const FEED_PAGE_SIZE = 20;
export const ADMIN_LIST_PAGE_SIZE = 50;

export function slicePage<T>(
  all: readonly T[],
  params: PageParams<number>
): PageResult<T, number> {
  const start = params.cursor ?? 0;
  const end = start + params.pageSize;
  const items = all.slice(start, end);
  const hasMore = end < all.length;
  return {
    items,
    nextCursor: hasMore ? end : null,
    hasMore,
  };
}
