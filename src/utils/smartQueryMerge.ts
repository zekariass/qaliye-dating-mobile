import type { QueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PagedCache<TPage> = {
  pages: TPage[];
  pageParams: unknown[];
};

// ---------------------------------------------------------------------------
// smartMergeFirstPage
//
// Fetches the first page of a paginated list and merges it into the existing
// TanStack Query infinite-query cache using per-item ID comparison.
//
// • Items whose content hasn't changed keep their OLD JS reference →
//   FlatList/memo components see no prop change → no re-render → no blink.
// • New or changed items get fresh references → only those rows update.
// • Items that moved up into page 0 are deduplicated from older pages.
// • The first page's metadata (total_elements, has_next …) is kept current.
//
// Skips silently when:
//   – there is no existing cache yet (let the query's own fetch handle it)
//   – the query is already fetching (standard refetch in flight)
//   – data was fetched less than `minAgeMs` ago (avoids a rapid double-fetch
//     right after the screen mounts and the query fetches for the first time)
// ---------------------------------------------------------------------------

export async function smartMergeFirstPage<
  TItem,
  TPage extends { items: TItem[] },
>(opts: {
  queryClient: QueryClient;
  queryKey: readonly unknown[];
  fetchFirstPage: () => Promise<TPage>;
  getId: (item: TItem) => string;
  /** Minimum ms since last successful fetch before triggering a merge-fetch.
   *  Prevents a rapid double-fetch on the very first screen focus.
   *  Default: 10 000 ms. */
  minAgeMs?: number;
}): Promise<void> {
  const { queryClient, queryKey, fetchFirstPage, getId, minAgeMs = 10_000 } =
    opts;

  // Guard: no existing cache → let the query's queryFn handle the initial load
  const existing = queryClient.getQueryData<PagedCache<TPage>>(queryKey);
  if (!existing?.pages?.length) return;

  // Guard: already fetching → a standard refetch is in flight, skip
  const qState = queryClient.getQueryState(queryKey);
  if (qState?.fetchStatus === 'fetching') return;

  // Guard: data is very fresh → no need to merge again so soon
  if (qState?.dataUpdatedAt && Date.now() - qState.dataUpdatedAt < minAgeMs) {
    return;
  }

  let freshPage: TPage;
  try {
    freshPage = await fetchFirstPage();
  } catch {
    return; // Silent — keep existing data when the fetch fails
  }

  queryClient.setQueryData<PagedCache<TPage>>(queryKey, (old) => {
    if (!old?.pages?.length) return old;

    // Build an ID → item map from ALL cached pages so we can look up any item
    const existingById = new Map<string, TItem>();
    for (const page of old.pages) {
      for (const item of page.items) {
        existingById.set(getId(item), item);
      }
    }

    // For each fresh item: reuse the old reference when content is identical.
    // JSON.stringify is reliable for plain API DTOs and is only called once
    // per visible item per screen focus — not a hot path.
    const mergedItems = freshPage.items.map((freshItem) => {
      const id = getId(freshItem);
      const oldItem = existingById.get(id);
      if (oldItem !== undefined) {
        try {
          if (JSON.stringify(oldItem) === JSON.stringify(freshItem)) {
            return oldItem; // ← stable reference, FlatList row won't re-render
          }
        } catch {
          // Fallthrough to fresh item on serialisation error
        }
      }
      return freshItem;
    });

    // IDs now in page 0 — remove duplicates from older cached pages
    const freshIds = new Set(freshPage.items.map(getId));

    return {
      ...old,
      pages: [
        // Page 0: updated metadata + merged items
        { ...freshPage, items: mergedItems },
        // Older pages: unchanged, but deduplicated
        ...old.pages.slice(1).map((page) => ({
          ...page,
          items: page.items.filter((item) => !freshIds.has(getId(item))),
        })),
      ],
    };
  });
}
