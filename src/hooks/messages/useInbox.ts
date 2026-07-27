import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchInbox, type InboxFilter } from '@/api/chat/chatApi';
import type { InboxItem, InboxItemDto } from '@/types/chat';
import type { QueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

export const INBOX_QUERY_KEY = 'chat-inbox';

export function inboxQueryKey(filter: InboxFilter) {
  return [INBOX_QUERY_KEY, filter] as const;
}

// ---------------------------------------------------------------------------
// DTO → model mapper
// ---------------------------------------------------------------------------

function mapInboxItemDto(dto: InboxItemDto): InboxItem {
  return {
    matchId: dto.match_id,
    status: dto.status,
    participant: {
      userId: dto.participant.user_id,
      displayName: dto.participant.display_name,
      avatarUrl: dto.participant.avatar_url,
      isVerified: dto.participant.is_verified,
      activityStatus: dto.participant.activity_status,
    },
    lastMessage: dto.last_message
      ? {
          id: dto.last_message.id,
          sequenceNumber: dto.last_message.sequence_number,
          senderUserId: dto.last_message.sender_user_id,
          messageType: dto.last_message.message_type,
          preview: dto.last_message.preview,
          createdAt: dto.last_message.created_at,
        }
      : null,
    unreadCount: dto.unread_count,
    mutedUntil: dto.muted_until,
    matchedAt: dto.matched_at,
    lastMessageAt: dto.last_message_at,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Standalone cache helpers (usable outside React component scope)
// ---------------------------------------------------------------------------

export type InboxCacheData = {
  pages: Array<{ items: InboxItem[]; nextCursor: string | null }>;
  pageParams: unknown[];
};

// Track recent unread bumps per matchId to prevent double/triple counting
// when push notification + realtime channel fire for the same message
const recentUnreadBumps = new Map<string, number>();
const DEDUP_WINDOW_MS = 5000;

export function upsertInboxItem(
  queryClient: QueryClient,
  matchId: string,
  update: {
    preview?: string;
    senderDisplayName?: string;
    senderAvatarUrl?: string | null;
    senderVerified?: boolean;
    createdAt: string;
    incrementUnread?: boolean;
  },
) {
  const now = Date.now();
  const shouldBumpUnread = update.incrementUnread !== false;

  // Check dedup: if we already bumped unread for this matchId recently, skip the bump
  let canBumpUnread = shouldBumpUnread;
  if (shouldBumpUnread) {
    const lastBump = recentUnreadBumps.get(matchId);
    if (lastBump && now - lastBump < DEDUP_WINDOW_MS) {
      canBumpUnread = false;
    } else {
      recentUnreadBumps.set(matchId, now);
    }
  }

  for (const filter of ['ALL', 'UNREAD'] as InboxFilter[]) {
    queryClient.setQueryData(
      inboxQueryKey(filter),
      (old: InboxCacheData | undefined) => {
        if (!old || !old.pages || old.pages.length === 0) return old;

        // Find the item across all pages
        let foundItem: InboxItem | null = null;
        let foundPageIndex = -1;
        let foundIndex = -1;

        for (let p = 0; p < old.pages.length; p++) {
          const idx = old.pages[p].items.findIndex((i) => i.matchId === matchId);
          if (idx !== -1) {
            foundItem = old.pages[p].items[idx];
            foundPageIndex = p;
            foundIndex = idx;
            break;
          }
        }

        if (!foundItem) return old;

        // Avoid double-updating if the last message is already newer
        if (
          foundItem.lastMessage &&
          foundItem.lastMessage.createdAt >= update.createdAt
        ) {
          return old;
        }

        const updatedItem: InboxItem = {
          ...foundItem,
          lastMessage: {
            id: foundItem.lastMessage?.id ?? `temp-${Date.now()}`,
            sequenceNumber: foundItem.lastMessage
              ? foundItem.lastMessage.sequenceNumber + 1
              : 1,
            senderUserId: foundItem.participant.userId,
            messageType: foundItem.lastMessage?.messageType ?? 'TEXT',
            preview: update.preview ?? foundItem.lastMessage?.preview ?? '',
            createdAt: update.createdAt,
          },
          lastMessageAt: update.createdAt,
          unreadCount: canBumpUnread
            ? foundItem.unreadCount + 1
            : foundItem.unreadCount,
        };

        // Remove from current position, prepend to first page
        const newPages = old.pages.map((page, p) => {
          if (p === foundPageIndex) {
            return {
              ...page,
              items: page.items.filter((_, i) => i !== foundIndex),
            };
          }
          return page;
        });

        newPages[0] = {
          ...newPages[0],
          items: [updatedItem, ...newPages[0].items],
        };

        return { ...old, pages: newPages };
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInbox(filter: InboxFilter) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: inboxQueryKey(filter),
    queryFn: async ({ pageParam }) => {
      const response = await fetchInbox(filter, 25, pageParam as string | undefined);
      return {
        items: response.items.map(mapInboxItemDto),
        nextCursor: response.next_cursor,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const allItems: InboxItem[] =
    query.data?.pages.flatMap((page) => page.items) ?? [];

  const removeMatch = useCallback(
    (matchId: string) => {
      queryClient.setQueryData(
        inboxQueryKey(filter),
        (old: typeof query.data) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.matchId !== matchId),
            })),
          };
        },
      );
    },
    [queryClient, filter],
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [INBOX_QUERY_KEY] });
  }, [queryClient]);

  return {
    items: allItems,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    removeMatch,
    invalidate,
  };
}
