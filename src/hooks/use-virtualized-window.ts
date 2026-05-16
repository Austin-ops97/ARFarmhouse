"use client";

import { useCallback, useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE, slicePage, type PageParams } from "@/platform/performance/pagination";

/**
 * Client-side windowing for long lists (feed, admin tables) before server pagination ships.
 */
export function useVirtualizedWindow<T>(
  items: readonly T[],
  pageSize: number = DEFAULT_PAGE_SIZE
) {
  const [cursor, setCursor] = useState<number | null>(null);

  const page = useMemo(() => {
    const params: PageParams<number> = { pageSize, cursor };
    return slicePage([...items], params);
  }, [items, pageSize, cursor]);

  const loadMore = useCallback(() => {
    if (page.hasMore && page.nextCursor != null) {
      setCursor(page.nextCursor);
    }
  }, [page.hasMore, page.nextCursor]);

  const reset = useCallback(() => setCursor(null), []);

  return {
    visibleItems: page.items,
    hasMore: page.hasMore,
    loadMore,
    reset,
    totalCount: items.length,
  };
}
