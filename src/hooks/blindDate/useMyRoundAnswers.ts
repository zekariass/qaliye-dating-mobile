import { useQueries } from '@tanstack/react-query';

import { fetchRoundQuestions } from '@/api/blindDate/blindDateApi';
import type { BlindDateRoundDto, BlindDateSessionQuestionDto } from '@/types/blindDate';

export type MyRoundAnswers = {
  round_id: string;
  round_number: number;
  questions: BlindDateSessionQuestionDto[];
};

/**
 * Fetches the caller's own answers for every round of a session — powers the
 * participant "Blind Date ended" screen, which shows a full history instead
 * of only the round the caller was last active in.
 *
 * `GET /rounds/{roundId}/questions` has no creator/participant restriction —
 * it simply returns `my_answer: null` for rounds the caller never reached —
 * so this works for any session the caller has ever joined, no matter which
 * round they were eliminated in.
 */
export function useMyRoundAnswers(rounds: BlindDateRoundDto[]) {
  const sorted = [...rounds].sort((a, b) => a.round_number - b.round_number);

  const queries = useQueries({
    queries: sorted.map((r) => ({
      queryKey: ['blindDate', 'roundQuestions', r.id],
      queryFn: () => fetchRoundQuestions(r.id),
      staleTime: 30_000,
    })),
  });

  const rows: MyRoundAnswers[] = sorted.map((r, i) => ({
    round_id: r.id,
    round_number: r.round_number,
    questions: queries[i]?.data ?? [],
  }));

  return { rows, isLoading: queries.some((q) => q.isLoading) };
}
