import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { fetchInbox, type InboxFilter } from '@/api/chat/chatApi';
import type { InboxItem, InboxItemDto } from '@/types/chat';

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
