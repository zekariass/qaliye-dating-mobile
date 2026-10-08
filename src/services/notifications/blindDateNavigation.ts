import * as Sentry from '@sentry/react-native';

import { fetchBlindDateSession } from '@/api/blindDate/blindDateApi';
import type { BlindDateSessionDto } from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';

// ---------------------------------------------------------------------------
// Route constants — every blind-date deep-link destination
// ---------------------------------------------------------------------------

export const BLIND_DATE_HUB_ROUTE = '/(app)/blind-date';
export const BLIND_DATE_MANAGE_ROUTE = '/(app)/blind-date-manage';
export const BLIND_DATE_PARTICIPANT_ROUTE = '/(app)/blind-date-participant';
export const BLIND_DATE_RESULTS_ROUTE = '/(app)/blind-date-results';

export type BlindDateRoute = {
  pathname: string;
  params?: Record<string, string>;
};

// Minimal router interface — keeps this module free of expo-router imports.
interface RouterLike {
  push: (href: any) => void;
}

/**
 * Hub fallback — used when the push carries no `session_id` (older queued
 * notifications) or the session fetch fails. The "mine" tab is backed by
 * `GET /sessions/mine`, which lists both created and joined sessions, so it
 * is the right landing spot regardless of the caller's role.
 */
export function blindDateHubRoute(): BlindDateRoute {
  return { pathname: BLIND_DATE_HUB_ROUTE, params: { tab: 'mine' } };
}

/**
 * Sessions that already reached a terminal state by the time the user taps.
 * The alert (e.g. BLIND_DATE_REVEAL) may be stale — the session could already
 * be COMPLETED/EXPIRED — so routing keys off live status, not the alert code.
 */
function isEndedSession(session: BlindDateSessionDto): boolean {
  return (
    session.status === 'COMPLETED' ||
    session.status === 'EXPIRED' ||
    session.status === 'CLOSED' ||
    session.status === 'CANCELLED'
  );
}

/**
 * Map a fetched session + the caller's role to a concrete app route.
 *
 * `isCreator` is tri-state: `null` when the signed-in user id isn't available
 * yet. In that case we route to the creator surfaces, which run their own
 * ownership check (`useSessionManage` / `useSessionResults`) and redirect
 * participants into the participant flow.
 *
 * - creator/unknown + live session (OPEN/REVEAL) → manage screen (round
 *   management while OPEN; reveal banner + final-decision panel in REVEAL)
 * - creator/unknown + ended session → results screen (outcome hero, winner,
 *   "Open chat" CTA when `match_id` is present)
 * - participant → participant flow, which derives the correct step from live
 *   state: REVEAL_INTRO / FINAL_DECISION / MATCH (with "Start Chatting") /
 *   NO_MATCH / ELIMINATED
 */
export function resolveBlindDateSessionRoute(
  session: BlindDateSessionDto,
  isCreator: boolean | null,
): BlindDateRoute {
  const params = { sessionId: session.id };

  if (isCreator === false) {
    return { pathname: BLIND_DATE_PARTICIPANT_ROUTE, params };
  }

  return {
    pathname: isEndedSession(session)
      ? BLIND_DATE_RESULTS_ROUTE
      : BLIND_DATE_MANAGE_ROUTE,
    params,
  };
}

function pushRoute(router: RouterLike, route: BlindDateRoute): void {
  if (route.params) {
    router.push({ pathname: route.pathname, params: route.params });
  } else {
    router.push(route.pathname);
  }
}

/**
 * Handle a blind-date ACCOUNT_ALERT tap.
 *
 * Never throws. `session_id` may be absent on older queued notifications and
 * the session may be gone or stale by tap time — `session_not_found`,
 * `not_session_creator`, and any other fetch failure land on the hub instead
 * of dead-ending on an error screen.
 */
export async function navigateBlindDateAlert({
  router,
  alertCode,
  sessionId,
  userId,
}: {
  router: RouterLike;
  alertCode?: string;
  sessionId?: string;
  userId?: string | null;
}): Promise<void> {
  Sentry.addBreadcrumb({
    category: 'blind_date_notification',
    message: 'blind_date_notification_tapped',
    data: {
      alert_code: alertCode ?? null,
      has_session_id: !!sessionId,
    },
    level: 'info',
  });

  if (!sessionId) {
    pushRoute(router, blindDateHubRoute());
    return;
  }

  try {
    const session = await fetchBlindDateSession(sessionId);
    const isCreator = userId == null ? null : session.creator_user_id === userId;
    pushRoute(router, resolveBlindDateSessionRoute(session, isCreator));
  } catch (err) {
    const { code, status } = extractApiError(err);
    
    pushRoute(router, blindDateHubRoute());
  }
}
