import { fetchBlindDateSession } from '@/api/blindDate/blindDateApi';
import type { BlindDateSessionDto } from '@/types/blindDate';

import {
    blindDateHubRoute,
    BLIND_DATE_HUB_ROUTE,
    BLIND_DATE_MANAGE_ROUTE,
    BLIND_DATE_PARTICIPANT_ROUTE,
    BLIND_DATE_RESULTS_ROUTE,
    navigateBlindDateAlert,
    resolveBlindDateSessionRoute,
} from '../blindDateNavigation';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@/api/blindDate/blindDateApi', () => ({
  fetchBlindDateSession: jest.fn(),
}));

const mockFetchSession = fetchBlindDateSession as jest.Mock;

const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const CREATOR_ID = '11111111-2222-3333-4444-555555555555';
const OTHER_USER_ID = '99999999-8888-7777-6666-555555555555';

function session(overrides: Partial<BlindDateSessionDto> = {}): BlindDateSessionDto {
  return {
    id: SESSION_ID,
    creator_user_id: CREATOR_ID,
    status: 'OPEN',
    language_code: 'en',
    expires_at: null,
    created_at: '2026-09-01T00:00:00Z',
    participant_count: 3,
    rounds: [],
    current_round_number: 1,
    ...overrides,
  };
}

function makeRouter() {
  return { push: jest.fn() };
}

describe('resolveBlindDateSessionRoute', () => {
  it('routes the creator of a live session to the manage screen', () => {
    const route = resolveBlindDateSessionRoute(session({ status: 'OPEN' }), true);
    expect(route).toEqual({
      pathname: BLIND_DATE_MANAGE_ROUTE,
      params: { sessionId: SESSION_ID },
    });
  });

  it('routes the creator of a REVEAL session to the manage screen', () => {
    const route = resolveBlindDateSessionRoute(session({ status: 'REVEAL' }), true);
    expect(route.pathname).toBe(BLIND_DATE_MANAGE_ROUTE);
  });

  it.each(['COMPLETED', 'EXPIRED', 'CLOSED', 'CANCELLED'] as const)(
    'routes the creator of a %s session to the results screen',
    (status) => {
      const route = resolveBlindDateSessionRoute(session({ status }), true);
      expect(route).toEqual({
        pathname: BLIND_DATE_RESULTS_ROUTE,
        params: { sessionId: SESSION_ID },
      });
    },
  );

  it('routes a participant to the participant flow regardless of status', () => {
    for (const status of ['OPEN', 'REVEAL', 'COMPLETED', 'EXPIRED'] as const) {
      const route = resolveBlindDateSessionRoute(session({ status }), false);
      expect(route).toEqual({
        pathname: BLIND_DATE_PARTICIPANT_ROUTE,
        params: { sessionId: SESSION_ID },
      });
    }
  });

  it('falls back to the creator surfaces when the role is unknown', () => {
    expect(resolveBlindDateSessionRoute(session({ status: 'REVEAL' }), null).pathname)
      .toBe(BLIND_DATE_MANAGE_ROUTE);
    expect(resolveBlindDateSessionRoute(session({ status: 'COMPLETED' }), null).pathname)
      .toBe(BLIND_DATE_RESULTS_ROUTE);
  });
});

describe('navigateBlindDateAlert', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lands on the hub when session_id is absent (older queued notifications)', async () => {
    const router = makeRouter();

    await navigateBlindDateAlert({
      router,
      alertCode: 'BLIND_DATE_REVEAL',
      sessionId: undefined,
      userId: CREATOR_ID,
    });

    expect(mockFetchSession).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith({
      pathname: BLIND_DATE_HUB_ROUTE,
      params: { tab: 'mine' },
    });
  });

  it('routes the creator to the manage screen for a live session', async () => {
    mockFetchSession.mockResolvedValue(session({ status: 'REVEAL' }));
    const router = makeRouter();

    await navigateBlindDateAlert({
      router,
      alertCode: 'BLIND_DATE_REVEAL',
      sessionId: SESSION_ID,
      userId: CREATOR_ID,
    });

    expect(mockFetchSession).toHaveBeenCalledWith(SESSION_ID);
    expect(router.push).toHaveBeenCalledWith({
      pathname: BLIND_DATE_MANAGE_ROUTE,
      params: { sessionId: SESSION_ID },
    });
  });

  it('routes the creator of a completed session to the results screen', async () => {
    mockFetchSession.mockResolvedValue(session({ status: 'COMPLETED' }));
    const router = makeRouter();

    await navigateBlindDateAlert({
      router,
      alertCode: 'BLIND_DATE_MATCHED',
      sessionId: SESSION_ID,
      userId: CREATOR_ID,
    });

    expect(router.push).toHaveBeenCalledWith({
      pathname: BLIND_DATE_RESULTS_ROUTE,
      params: { sessionId: SESSION_ID },
    });
  });

  it('routes a participant to the participant flow', async () => {
    mockFetchSession.mockResolvedValue(session({ status: 'REVEAL' }));
    const router = makeRouter();

    await navigateBlindDateAlert({
      router,
      alertCode: 'BLIND_DATE_ELIMINATED',
      sessionId: SESSION_ID,
      userId: OTHER_USER_ID,
    });

    expect(router.push).toHaveBeenCalledWith({
      pathname: BLIND_DATE_PARTICIPANT_ROUTE,
      params: { sessionId: SESSION_ID },
    });
  });

  it.each(['session_not_found', 'not_session_creator'])(
    'lands on the hub when the session fetch fails with %s',
    async (code) => {
      mockFetchSession.mockRejectedValue({
        response: { status: 404, data: { error: { code, message: 'nope' } } },
      });
      const router = makeRouter();

      await navigateBlindDateAlert({
        router,
        alertCode: 'BLIND_DATE_NO_MATCH',
        sessionId: SESSION_ID,
        userId: CREATOR_ID,
      });

      expect(router.push).toHaveBeenCalledWith({
        pathname: BLIND_DATE_HUB_ROUTE,
        params: { tab: 'mine' },
      });
    },
  );

  it('lands on the hub on any other fetch failure (offline, 5xx, …)', async () => {
    mockFetchSession.mockRejectedValue(new Error('Network request failed'));
    const router = makeRouter();

    await navigateBlindDateAlert({
      router,
      alertCode: 'BLIND_DATE_REVEAL',
      sessionId: SESSION_ID,
      userId: CREATOR_ID,
    });

    expect(router.push).toHaveBeenCalledWith({
      pathname: BLIND_DATE_HUB_ROUTE,
      params: { tab: 'mine' },
    });
  });
});

describe('blindDateHubRoute', () => {
  it('points at the hub "mine" tab', () => {
    expect(blindDateHubRoute()).toEqual({
      pathname: BLIND_DATE_HUB_ROUTE,
      params: { tab: 'mine' },
    });
  });
});
