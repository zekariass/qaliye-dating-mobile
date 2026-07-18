import type { StaffConversationListParams } from '@/types/support';

// ---------------------------------------------------------------------------
// Staff support query keys — isolated from user support keys and chat keys
// ---------------------------------------------------------------------------

export const staffSupportKeys = {
  all: ['staff-support'] as const,
  lists: () => [...staffSupportKeys.all, 'list'] as const,
  list: (params?: StaffConversationListParams) =>
    [...staffSupportKeys.lists(), params ?? {}] as const,
  detail: (conversationId: string) =>
    [...staffSupportKeys.all, 'detail', conversationId] as const,
  messages: (conversationId: string) =>
    [...staffSupportKeys.all, 'messages', conversationId] as const,
  notes: (conversationId: string) =>
    [...staffSupportKeys.all, 'notes', conversationId] as const,
};
