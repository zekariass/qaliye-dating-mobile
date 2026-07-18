import { useMutation, useQueryClient } from '@tanstack/react-query';

import { clearChatMessages } from '@/api/chat/chatApi';
import { INBOX_QUERY_KEY } from '@/hooks/messages/useInbox';
import { useChatStore } from '@/stores/chat-store';

interface InboxPage<T> {
  items: T[];
  nextCursor?: string | null;
}

interface InboxItemLike {
  matchId: string;
  lastMessage: unknown;
  unreadCount: number;
}

export function useClearChatMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => clearChatMessages(matchId),
    onSuccess: (_data, matchId) => {
      const store = useChatStore.getState();
      store.setMessages([], false, false);

      queryClient.setQueriesData<{
        pages: InboxPage<InboxItemLike>[];
        pageParams: unknown[];
      }>({ queryKey: [INBOX_QUERY_KEY] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.matchId === matchId
                ? {
                    ...item,
                    lastMessage: null,
                    unreadCount: 0,
                  }
                : item,
            ),
          })),
        };
      });

      queryClient.invalidateQueries({ queryKey: [INBOX_QUERY_KEY] });
    },
  });
}
