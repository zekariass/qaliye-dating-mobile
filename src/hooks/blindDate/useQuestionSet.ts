import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
    addSetQuestion,
    createCustomQuestion,
    deleteCustomQuestion,
    deleteSetQuestion,
    fetchQuestionSet,
    patchBlindDateConfiguration,
    reorderSetQuestion,
    updateCustomQuestion,
    updateSetQuestionAnswer,
} from '@/api/blindDate/blindDateApi';
import { BLIND_DATE_CONFIG_KEY } from '@/hooks/blindDate/useBlindDateConfiguration';
import type {
    BlindDateConfigurationPatch,
    BlindDateQuestionSetDto,
    BlindDateSetQuestionDto,
} from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';

export const BLIND_DATE_QUESTION_SET_KEY = ['blindDate', 'questionSet'] as const;

/** Error codes meaning "the row is already gone" — refetch instead of alerting. */
const GONE_CODES = new Set([
  'question_not_found',
  'set_question_not_found',
  'custom_question_not_found',
]);

export function useQuestionSet(opts?: { enabled?: boolean }) {
  const query = useQuery<BlindDateQuestionSetDto>({
    queryKey: BLIND_DATE_QUESTION_SET_KEY,
    queryFn: fetchQuestionSet,
    staleTime: 30_000,
    enabled: opts?.enabled ?? true,
  });

  const questions = useMemo(
    () => [...(query.data?.questions ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [query.data],
  );
  const customQuestions = useMemo(
    () => [...(query.data?.custom_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [query.data],
  );

  return { ...query, questions, customQuestions };
}

export function useQuestionSetMutations() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: BLIND_DATE_QUESTION_SET_KEY });

  /** Shared onError: "not found" → the list is stale, refetch silently. */
  const onMutationError = (err: unknown, fallback: (msg: string) => void) => {
    const { code, message } = extractApiError(err);
    if (GONE_CODES.has(code.toLowerCase())) {
      void invalidate();
      return;
    }
    fallback(message);
  };

  const addQuestion = useMutation({
    mutationFn: ({ questionId, answer }: { questionId: string; answer?: string }) =>
      addSetQuestion(questionId, answer),
    onSuccess: (created: BlindDateSetQuestionDto) => {
      // Append to cache so the just-added question appears instantly.
      queryClient.setQueryData<BlindDateQuestionSetDto>(BLIND_DATE_QUESTION_SET_KEY, (old) =>
        old ? { ...old, questions: [...old.questions, created] } : old,
      );
      void invalidate();
    },
  });

  const updateAnswer = useMutation({
    mutationFn: ({ setQuestionId, answer }: { setQuestionId: string; answer: string }) =>
      updateSetQuestionAnswer(setQuestionId, answer),
    onSuccess: (_r, { setQuestionId, answer }) => {
      queryClient.setQueryData<BlindDateQuestionSetDto>(BLIND_DATE_QUESTION_SET_KEY, (old) =>
        old
          ? {
              ...old,
              questions: old.questions.map((q) =>
                q.id === setQuestionId ? { ...q, answer } : q,
              ),
            }
          : old,
      );
      void invalidate();
    },
  });

  const removeQuestion = useMutation({
    mutationFn: (setQuestionId: string) => deleteSetQuestion(setQuestionId),
    onSuccess: invalidate,
  });

  const reorderQuestion = useMutation({
    mutationFn: ({ setQuestionId, sortOrder }: { setQuestionId: string; sortOrder: number }) =>
      reorderSetQuestion(setQuestionId, sortOrder),
    onSuccess: invalidate,
  });

  const addCustom = useMutation({
    mutationFn: ({ question, answer }: { question: string; answer: string }) =>
      createCustomQuestion(question, answer),
    onSuccess: invalidate,
  });

  const editCustom = useMutation({
    mutationFn: ({
      customQuestionId,
      patch,
    }: {
      customQuestionId: string;
      patch: { question?: string; answer?: string; sortOrder?: number };
    }) => updateCustomQuestion(customQuestionId, patch),
    onSuccess: invalidate,
  });

  const removeCustom = useMutation({
    mutationFn: (customQuestionId: string) => deleteCustomQuestion(customQuestionId),
    onSuccess: invalidate,
  });

  const patchConfig = useMutation({
    mutationFn: (patch: BlindDateConfigurationPatch) => patchBlindDateConfiguration(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BLIND_DATE_CONFIG_KEY });
      // Question text is translated server-side per language_code — refetch
      // the set so the new language applies without a manual refresh.
      void invalidate();
    },
  });

  return {
    addQuestion,
    updateAnswer,
    removeQuestion,
    reorderQuestion,
    addCustom,
    editCustom,
    removeCustom,
    patchConfig,
    onMutationError,
    invalidate,
  };
}
