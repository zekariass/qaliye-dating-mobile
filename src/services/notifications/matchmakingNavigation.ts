/**
 * Resolves matchmaking ACCOUNT_ALERT taps (alert_code = MATCHMAKING_*) to app
 * routes. Backend contract: docs/matchmaking-client-api.md §5.
 *
 * - request lifecycle alerts (created/cancelled/expired) → request status
 * - introduction proposed → introduction decision screen
 * - introduction declined/cancelled/expired → intros list (request is back
 *   to OPEN or the intro has ended)
 * - matched → mutual-interest celebration → chat via match_id
 *
 * Every route degrades gracefully when its id is missing — older queued
 * notifications may lack the newer fields.
 */
import * as Sentry from '@sentry/react-native';

export const MM_REQUEST_STATUS_ROUTE = '/(app)/shimgilina-request-status';
export const MM_INTROS_ROUTE = '/(app)/shimgilina-introductions';
export const MM_INTRO_ROUTE = '/(app)/shimgilina-introduction';
export const MM_MUTUAL_ROUTE = '/(app)/shimgilina-mutual-interest';
export const MM_CHAT_ROUTE = '/(app)/chat';
export const MM_MATCHES_ROUTE = '/(app)/(tabs)/matches';

export type MatchmakingRoute = {
  pathname: string;
  params?: Record<string, string>;
};

// Minimal router interface — keeps this module free of expo-router imports.
interface RouterLike {
  push: (href: any) => void;
}

function pushRoute(router: RouterLike, route: MatchmakingRoute): void {
  if (route.params) {
    router.push({ pathname: route.pathname, params: route.params });
  } else {
    router.push(route.pathname);
  }
}

/**
 * Map a matchmaking alert_code + its entity ids to a concrete app route.
 * Never throws — missing ids fall back to the nearest sensible screen.
 */
export function resolveMatchmakingAlertRoute({
  alertCode,
  introductionId,
  requestId,
  matchId,
}: {
  alertCode?: string;
  introductionId?: string;
  requestId?: string;
  matchId?: string;
}): MatchmakingRoute {
  const requestParams = requestId ? { requestId } : undefined;

  switch (alertCode) {
    case 'MATCHMAKING_INTRODUCTION_PROPOSED':
      return introductionId
        ? { pathname: MM_INTRO_ROUTE, params: { introductionId } }
        : { pathname: MM_INTROS_ROUTE };

    case 'MATCHMAKING_INTRODUCTION_DECLINED':
    case 'MATCHMAKING_INTRODUCTION_CANCELLED':
    case 'MATCHMAKING_INTRODUCTION_EXPIRED':
      return introductionId
        ? { pathname: MM_INTRO_ROUTE, params: { introductionId } }
        : { pathname: MM_INTROS_ROUTE };

    case 'MATCHMAKING_MATCHED':
      if (introductionId) {
        return {
          pathname: MM_MUTUAL_ROUTE,
          params: {
            introductionId,
            ...(matchId ? { matchId } : {}),
          },
        };
      }
      return matchId
        ? { pathname: MM_CHAT_ROUTE, params: { matchId } }
        : { pathname: MM_MATCHES_ROUTE };

    case 'MATCHMAKING_REQUEST_CREATED':
    case 'MATCHMAKING_REQUEST_CANCELLED':
    case 'MATCHMAKING_REQUEST_EXPIRED':
    default:
      return { pathname: MM_REQUEST_STATUS_ROUTE, params: requestParams };
  }
}

/**
 * Handle a matchmaking ACCOUNT_ALERT tap.
 *
 * Never throws. `request_id` on introduction alerts is the recipient's OWN
 * request id (differs per recipient) — pass it straight through.
 */
export function navigateMatchmakingAlert({
  router,
  alertCode,
  introductionId,
  requestId,
  matchId,
}: {
  router: RouterLike;
  alertCode?: string;
  introductionId?: string;
  requestId?: string;
  matchId?: string;
}): void {
  Sentry.addBreadcrumb({
    category: 'matchmaking_notification',
    message: 'matchmaking_notification_tapped',
    data: {
      alert_code: alertCode ?? null,
      has_introduction_id: !!introductionId,
      has_request_id: !!requestId,
      has_match_id: !!matchId,
    },
    level: 'info',
  });

  pushRoute(
    router,
    resolveMatchmakingAlertRoute({ alertCode, introductionId, requestId, matchId }),
  );
}
