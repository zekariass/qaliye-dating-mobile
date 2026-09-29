import { useMutation, useQueryClient } from '@tanstack/react-query';

import { joinBlindDateSession } from '@/api/blindDate/blindDateApi';
import { BLIND_DATE_DISCOVER_KEY } from '@/hooks/blindDate/useDiscoverSessions';
import { BLIND_DATE_PARTICIPATIONS_KEY } from '@/hooks/blindDate/useMyParticipations';
import type { BlindDateJoinResponseDto } from '@/types/blindDate';
import { blindDateErrorCode } from '@/utils/blindDateErrors';
import { generateUUID } from '@/utils/uuid';

/**
 * Joins a Blind Date session's Round 1. Paid action — charges
 * BLIND_DATE_PARTICIPATE. A fresh idempotency key is generated per call so
 * retries never double-charge.
 */
export function useJoinSession() {
  const queryClient = useQueryClient();

  return useMutation<BlindDateJoinResponseDto, unknown, { sessionId: string }>({
    // Per the API contract, idempotency_key_in_use is safe to retry once with
    // a freshly generated key.
    mutationFn: ({ sessionId }) =>
      joinBlindDateSession(sessionId, generateUUID()).catch((err) =>
        blindDateErrorCode(err) === 'idempotency_key_in_use'
          ? joinBlindDateSession(sessionId, generateUUID())
          : Promise.reject(err),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLIND_DATE_DISCOVER_KEY });
      queryClient.invalidateQueries({ queryKey: BLIND_DATE_PARTICIPATIONS_KEY });
    },
  });
}
