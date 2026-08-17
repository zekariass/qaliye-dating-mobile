import { useQuery } from '@tanstack/react-query';

import { listSuperMessages } from '@/api/discovery/superMessagesApi';
import type { SuperMessageDirection, SuperMessageDto } from '@/types/superMessage';

export const SUPER_MESSAGES_QUERY_KEY = ['super-messages'] as const;

export function useSuperMessages(direction: SuperMessageDirection = 'sent', limit = 50) {
  return useQuery<SuperMessageDto[]>({
    queryKey: [...SUPER_MESSAGES_QUERY_KEY, direction],
    queryFn: () => listSuperMessages(direction, limit, 0),
    staleTime: 30_000,
  });
}
