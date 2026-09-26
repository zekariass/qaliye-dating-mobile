import { apiClient } from '@/api/apiClient';
import type {
    BlindDateCatalogCategoryDto,
    BlindDateCatalogQuestionDto,
    BlindDateConfigurationDto,
    BlindDateConfigurationPatch,
    BlindDateCustomQuestionDto,
    BlindDateFinalDecisionResponseDto,
    BlindDateFinalDecisionValue,
    BlindDateJoinResponseDto,
    BlindDateMySessionDto,
    BlindDateParticipationDto,
    BlindDateQuestionSetDto,
    BlindDateRosterParticipantDto,
    BlindDateSelectionDecision,
    BlindDateSessionDto,
    BlindDateSessionQuestionDto,
    BlindDateSessionResultsDto,
    BlindDateSessionSummaryDto,
    BlindDateSetQuestionDto,
    CreateBlindDateSessionPayload
} from '@/types/blindDate';

const BASE = '/api/v1/blind-date';

// ─── Paged response normalization ────────────────────────────────────────────
// The documented discovery endpoint returns a plain array; other list
// endpoints (assumed, see below) may return { items, has_next, page }.
// normalizePage accepts both shapes.

export type BlindDatePage<T> = {
  items: T[];
  page: number;
  has_next: boolean;
};

function normalizePage<T>(raw: unknown, page: number, size: number): BlindDatePage<T> {
  if (Array.isArray(raw)) {
    return { items: raw as T[], page, has_next: (raw as T[]).length >= size };
  }
  const obj = (raw ?? {}) as Record<string, unknown>;
  const items = (obj.items ?? obj.content ?? obj.data ?? []) as T[];
  const hasNext =
    typeof obj.has_next === 'boolean'
      ? obj.has_next
      : typeof obj.hasNext === 'boolean'
        ? obj.hasNext
        : items.length >= size;
  return { items, page, has_next: hasNext };
}

// ─── Configuration ────────────────────────────────────────────────────────────

export async function fetchBlindDateConfiguration(): Promise<BlindDateConfigurationDto> {
  const res = await apiClient.get<BlindDateConfigurationDto>(`${BASE}/configuration`);
  return res.data;
}

export async function patchBlindDateConfiguration(
  patch: BlindDateConfigurationPatch,
): Promise<BlindDateConfigurationDto> {
  const res = await apiClient.patch<BlindDateConfigurationDto>(`${BASE}/configuration`, {
    ...(patch.languageCode !== undefined ? { language_code: patch.languageCode } : {}),
    ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
  });
  return res.data;
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export async function fetchCatalogCategories(
  language: string = 'en',
): Promise<BlindDateCatalogCategoryDto[]> {
  const res = await apiClient.get<BlindDateCatalogCategoryDto[]>(`${BASE}/catalog/categories`, {
    params: { language },
  });
  return res.data;
}

export async function fetchCatalogQuestions(
  language: string = 'en',
  categoryId?: string,
): Promise<BlindDateCatalogQuestionDto[]> {
  const res = await apiClient.get<BlindDateCatalogQuestionDto[]>(`${BASE}/catalog/questions`, {
    params: categoryId ? { categoryId, language } : { language },
  });
  return res.data;
}

// ─── Question set ─────────────────────────────────────────────────────────────

export async function fetchQuestionSet(): Promise<BlindDateQuestionSetDto> {
  const res = await apiClient.get<BlindDateQuestionSetDto>(`${BASE}/question-set`);
  return res.data;
}

export async function addSetQuestion(
  questionId: string,
  answer?: string,
): Promise<BlindDateSetQuestionDto> {
  const res = await apiClient.post<BlindDateSetQuestionDto>(`${BASE}/question-set/questions`, {
    question_id: questionId,
    ...(answer ? { answer } : {}),
  });
  return res.data;
}

export async function updateSetQuestionAnswer(
  setQuestionId: string,
  answer: string,
): Promise<void> {
  await apiClient.post(`${BASE}/question-set/questions/${setQuestionId}/answer`, { answer });
}

export async function deleteSetQuestion(setQuestionId: string): Promise<void> {
  await apiClient.delete(`${BASE}/question-set/questions/${setQuestionId}`);
}

export async function reorderSetQuestion(
  setQuestionId: string,
  sortOrder: number,
): Promise<void> {
  await apiClient.patch(`${BASE}/question-set/questions/${setQuestionId}/order`, { sort_order: sortOrder });
}

export async function createCustomQuestion(
  question: string,
  answer: string,
): Promise<BlindDateCustomQuestionDto> {
  const res = await apiClient.post<BlindDateCustomQuestionDto>(
    `${BASE}/question-set/custom-questions`,
    { question, answer },
  );
  return res.data;
}

export async function updateCustomQuestion(
  customQuestionId: string,
  patch: { question?: string; answer?: string; sortOrder?: number },
): Promise<BlindDateCustomQuestionDto> {
  const res = await apiClient.patch<BlindDateCustomQuestionDto>(
    `${BASE}/question-set/custom-questions/${customQuestionId}`,
    {
      ...(patch.question !== undefined ? { question: patch.question } : {}),
      ...(patch.answer !== undefined ? { answer: patch.answer } : {}),
      ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
    },
  );
  return res.data;
}

export async function deleteCustomQuestion(customQuestionId: string): Promise<void> {
  await apiClient.delete(`${BASE}/question-set/custom-questions/${customQuestionId}`);
}

// ─── Discovery ────────────────────────────────────────────────────────────────

export async function fetchDiscoverSessions(
  page: number = 0,
  size: number = 20,
): Promise<BlindDatePage<BlindDateSessionSummaryDto>> {
  const res = await apiClient.get(`${BASE}/sessions/discover`, {
    params: { page: String(page), size: String(size) },
  });
  return normalizePage<BlindDateSessionSummaryDto>(res.data, page, size);
}

// ─── My Sessions (creator side) ───────────────────────────────────────────────
// NOTE: a "list my sessions" endpoint is not in the published API doc yet.
// `/sessions/mine` is the assumed route — confirm with backend before release.

export async function fetchMySessions(
  page: number = 0,
  size: number = 20,
): Promise<BlindDatePage<BlindDateMySessionDto>> {
  const res = await apiClient.get(`${BASE}/sessions/mine`, {
    params: { page: String(page), size: String(size) },
  });
  return normalizePage<BlindDateMySessionDto>(res.data, page, size);
}

// ─── My Participations ────────────────────────────────────────────────────────
// The documented `/participations` payload is session-shaped (same as
// `/sessions/mine`): each row is a session with `role`, `participant_id`,
// `participant_status`, `current_round_id`, `current_round_number` and the
// `creator` preview. An embedded-`session` participant row is also handled
// defensively.

function normalizeParticipation(raw: Record<string, unknown>): BlindDateParticipationDto {
  const embedded = (raw.session ?? null) as BlindDateSessionSummaryDto | null;
  const session: BlindDateSessionSummaryDto | null =
    embedded ??
    (raw.id
      ? {
          id: raw.id as string,
          creator_user_id: (raw.creator_user_id ?? '') as string,
          status: (raw.status ?? 'OPEN') as BlindDateSessionSummaryDto['status'],
          language_code: (raw.language_code ?? 'en') as string,
          expires_at: (raw.expires_at ?? null) as string | null,
          created_at: (raw.created_at ?? '') as string,
          participant_count: (raw.participant_count ?? 0) as number,
          creator: (raw.creator ?? null) as BlindDateSessionSummaryDto['creator'],
          final_decision: (raw.final_decision ??
            null) as BlindDateSessionSummaryDto['final_decision'],
          title: (raw.title ?? null) as BlindDateSessionSummaryDto['title'],
          description: (raw.description ?? null) as BlindDateSessionSummaryDto['description'],
          topics: (raw.topics ?? null) as BlindDateSessionSummaryDto['topics'],
          current_round_number: (raw.current_round_number ?? undefined) as number | undefined,
        }
      : null);
  return {
    participant_id: (raw.participant_id ?? (embedded ? (raw.id as string) : '') ?? '') as string,
    session_id: (raw.session_id ?? session?.id ?? '') as string,
    status: (raw.participant_status ?? 'ACTIVE') as BlindDateParticipationDto['status'],
    current_round_id: (raw.current_round_id ?? null) as string | null,
    current_round_number: (raw.current_round_number ?? session?.current_round_number ?? null) as
      | number
      | null,
    joined_at: (raw.joined_at ?? raw.created_at ?? '') as string,
    advanced_at: (raw.advanced_at ?? null) as string | null,
    finalist_at: (raw.finalist_at ?? null) as string | null,
    eliminated_at: (raw.eliminated_at ?? null) as string | null,
    answers_submitted: (raw.answers_submitted ?? null) as boolean | null,
    pending_question_count: (raw.pending_question_count ?? null) as number | null,
    session,
  };
}

export async function fetchMyParticipations(
  page: number = 0,
  size: number = 20,
): Promise<BlindDatePage<BlindDateParticipationDto>> {
  const res = await apiClient.get(`${BASE}/participations`, {
    params: { page: String(page), size: String(size) },
  });
  const paged = normalizePage<Record<string, unknown>>(res.data, page, size);
  return { ...paged, items: paged.items.map(normalizeParticipation) };
}

// ─── Session detail & lifecycle ───────────────────────────────────────────────

export async function fetchBlindDateSession(sessionId: string): Promise<BlindDateSessionDto> {
  const res = await apiClient.get<BlindDateSessionDto>(`${BASE}/sessions/${sessionId}`);
  return res.data;
}

export async function createBlindDateSession(
  payload: CreateBlindDateSessionPayload,
): Promise<BlindDateSessionDto> {
  const res = await apiClient.post<BlindDateSessionDto>(
    `${BASE}/sessions`,
    {
      idempotency_key: payload.idempotencyKey,
      question_ids: payload.questionIds,
      custom_question_ids: payload.customQuestionIds,
      language_code: payload.languageCode,
      expires_at: payload.expiresAt,
    },
    { metadata: { actionCode: 'BLIND_DATE_SESSION_CREATE' } } as any,
  );
  return res.data;
}

export async function closeBlindDateSession(sessionId: string): Promise<void> {
  await apiClient.post(`${BASE}/sessions/${sessionId}/close`);
}

// ─── Rounds ───────────────────────────────────────────────────────────────────

export async function fetchRoundQuestions(
  roundId: string,
): Promise<BlindDateSessionQuestionDto[]> {
  const res = await apiClient.get<BlindDateSessionQuestionDto[]>(
    `${BASE}/rounds/${roundId}/questions`,
  );
  return res.data;
}

export async function closeCurrentRound(sessionId: string): Promise<void> {
  await apiClient.post(`${BASE}/sessions/${sessionId}/rounds/close`);
}

export async function createNextRound(
  sessionId: string,
  questionIds: string[],
  customQuestionIds: string[],
): Promise<void> {
  await apiClient.post(`${BASE}/sessions/${sessionId}/rounds`, {
    question_ids: questionIds,
    custom_question_ids: customQuestionIds,
  });
}

// ─── Participation ────────────────────────────────────────────────────────────

export async function joinBlindDateSession(
  sessionId: string,
  idempotencyKey: string,
): Promise<BlindDateJoinResponseDto> {
  const res = await apiClient.post<BlindDateJoinResponseDto>(
    `${BASE}/sessions/${sessionId}/join`,
    { idempotency_key: idempotencyKey },
    { metadata: { actionCode: 'BLIND_DATE_PARTICIPATE' } } as any,
  );
  return res.data;
}

export async function submitParticipantAnswers(
  participantId: string,
  answers: Record<string, string>,
): Promise<void> {
  await apiClient.post(`${BASE}/participants/${participantId}/answers`, { answers });
}

export async function withdrawParticipation(participantId: string): Promise<void> {
  await apiClient.post(`${BASE}/participants/${participantId}/withdraw`);
}

// ─── Roster (creator) ─────────────────────────────────────────────────────────

/** Creator-only roster: participants + their current-round answers (anonymous). */
export async function fetchSessionParticipants(
  sessionId: string,
): Promise<BlindDateRosterParticipantDto[]> {
  const res = await apiClient.get<BlindDateRosterParticipantDto[]>(
    `${BASE}/sessions/${sessionId}/participants`,
  );
  return res.data;
}

/**
 * Creator-only session results: final outcome, the revealed winner (finalist)
 * with their profile, and the winner's answers grouped by round.
 */
export async function fetchSessionResults(
  sessionId: string,
): Promise<BlindDateSessionResultsDto> {
  const res = await apiClient.get<BlindDateSessionResultsDto>(
    `${BASE}/sessions/${sessionId}/results`,
  );
  return res.data;
}

// ─── Selections (creator) ─────────────────────────────────────────────────────

export async function submitRoundSelection(
  sessionId: string,
  participantId: string,
  decision: BlindDateSelectionDecision,
): Promise<void> {
  await apiClient.post(`${BASE}/sessions/${sessionId}/selections`, {
    participant_id: participantId,
    decision,
  });
}

// ─── Final decision ───────────────────────────────────────────────────────────

export async function submitFinalDecision(
  sessionId: string,
  decision: Exclude<BlindDateFinalDecisionValue, 'PENDING'>,
): Promise<BlindDateFinalDecisionResponseDto> {
  const res = await apiClient.post<BlindDateFinalDecisionResponseDto>(
    `${BASE}/sessions/${sessionId}/final-decision`,
    { decision },
  );
  return res.data;
}
