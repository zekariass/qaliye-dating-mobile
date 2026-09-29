import type { MatchSource } from '@/types/discovery';

/**
 * Anything carrying a match source — wire DTOs use snake_case
 * (`match_source`), domain models use camelCase (`matchSource`).
 */
export type MatchSourceCarrier = {
  matchSource?: MatchSource | null;
  match_source?: MatchSource | null;
};

/**
 * True when the match was created via a Blind Date session.
 * A missing source (older cached/persisted data) is treated as 'DISCOVERY'.
 */
export function isBlindDateMatch(
  m: MatchSourceCarrier | null | undefined,
): boolean {
  return (m?.matchSource ?? m?.match_source) === 'BLIND_DATE';
}
