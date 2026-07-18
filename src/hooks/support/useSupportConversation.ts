import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getSupportConversation } from '@/api/support/supportApi';
import type { SupportConversationDto } from '@/types/support';

// ---------------------------------------------------------------------------
// Query keys — isolated from chat query keys
// ---------------------------------------------------------------------------

export const supportKeys = {
  all: ['support'] as const,
  conversation: () => [...supportKeys.all, 'conversation'] as const,
  messages: () => [...supportKeys.all, 'messages'] as const,
};

// ---------------------------------------------------------------------------
// Unread count helper
// ---------------------------------------------------------------------------

/**
 * Returns the unread count from a support conversation DTO.
 *
 * PREFERRED: uses the backend-provided `unread_count` field when present.
 *
 * TEMPORARY FALLBACK: When `unread_count` is absent this computes from sequence
 * numbers. WARNING — this MAY overcount if the user has sent messages between
 * user_last_read_sequence and next_public_sequence.
 * TODO: Remove fallback once backend reliably returns `unread_count`.
 */
export function computeUnreadCount(dto: SupportConversationDto): number {
  if (dto.unread_count !== undefined) {
    return Math.max(0, dto.unread_count);
  }
  // TEMPORARY FALLBACK — see jsdoc warning above
  return Math.max(0, dto.next_public_sequence - 1 - dto.user_last_read_sequence);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSupportConversation(options?: { refetchInterval?: number | false }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: supportKeys.conversation(),
    queryFn: getSupportConversation,
    staleTime: 30_000,
    refetchInterval: options?.refetchInterval ?? false,
    retry: 2,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: supportKeys.conversation() });
  }, [queryClient]);

  const unreadCount = query.data ? computeUnreadCount(query.data) : 0;

  return {
    conversation: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    invalidate,
    unreadCount,
  };
}
