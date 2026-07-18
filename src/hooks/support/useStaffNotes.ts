import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { createStaffNote, getStaffNotes } from '@/api/support/staffSupportApi';
import type { StaffNoteDto } from '@/types/support';
import { generateUUID } from '@/utils/uuid';
import { staffSupportKeys } from './useStaffSupportKeys';

export function useStaffNotes(conversationId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<StaffNoteDto[], Error>({
    queryKey: staffSupportKeys.notes(conversationId),
    queryFn: () => getStaffNotes(conversationId, { limit: 50, offset: 0 }),
    staleTime: 60_000,
    retry: 2,
  });

  const mutation = useMutation({
    mutationFn: async (body: string) => {
      const clientNoteId = generateUUID();
      return createStaffNote(conversationId, { client_note_id: clientNoteId, body });
    },
    onSuccess: (newNote) => {
      queryClient.setQueryData<StaffNoteDto[]>(
        staffSupportKeys.notes(conversationId),
        (prev) => (prev ? [newNote, ...prev] : [newNote]),
      );
    },
  });

  const addNote = useCallback(
    (body: string) => mutation.mutateAsync(body),
    [mutation],
  );

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    addNote,
    isAdding: mutation.isPending,
    addError: mutation.error,
    resetAdd: mutation.reset,
  };
}

export function useStaffNoteComposer() {
  const [text, setText] = useState('');
  return { text, setText };
}
