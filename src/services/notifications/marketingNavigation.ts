import * as Sentry from '@sentry/react-native';

// ---------------------------------------------------------------------------
// Minimal router interface — keeps this module free of expo-router imports
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface RouterLike {
  push: (href: any) => void;
}

// ---------------------------------------------------------------------------
// Screen → Expo Router route mapping
// ---------------------------------------------------------------------------

const SCREEN_ROUTES: Record<string, string> = {
  // Main tabs — use the group path without '/index'; Expo Router resolves the
  // index automatically and avoids the transparent-group URL ambiguity that
  // produces the "unmatched route qaliyedating:///" error.
  '(tabs)/index':    '/(app)/(tabs)',
  '(tabs)/likes':    '/(app)/(tabs)/likes',
  '(tabs)/matches':  '/(app)/(tabs)/matches',
  '(tabs)/messages': '/(app)/(tabs)/messages',
  '(tabs)/profile':  '/(app)/(tabs)/profile',

  // App screens
  'chat':                 '/(app)/chat',
  'user-profile':         '/(app)/user-profile',
  'edit-profile':         '/(app)/edit-profile',
  'preferences':          '/(app)/preferences',
  'settings':             '/(app)/settings',
  'verify-identity':      '/(app)/verify-identity',
  'boost':                '/(app)/boost',
  'premium':              '/(app)/premium',
  'credits-shop':         '/(app)/credits-shop',
  'balances':             '/(app)/balances',
  'promotions':           '/(app)/promotions',
  'manual-payment':       '/(app)/manual-payment',
  'order-status':         '/(app)/order-status',
  'payment-activity':     '/(app)/payment-activity',
  'blocked-users':        '/(app)/blocked-users',
  'support-conversation': '/(app)/support-conversation',
};

// Use the group path (not /index) — avoids the transparent-group URL resolution
// that produces the "unmatched route qaliyedating:///" error when Expo Router
// strips both (app) and (tabs) groups and ends up with an empty path.
const HOME_ROUTE = '/(app)/(tabs)';
const MESSAGES_ROUTE = '/(app)/(tabs)/messages';

function goHome(router: RouterLike): void {
  router.push(HOME_ROUTE);
}

// ---------------------------------------------------------------------------
// Main handler — call this from both the tap handler and the banner press
// ---------------------------------------------------------------------------

/**
 * Navigate to the deep-link target carried by a MARKETING push notification.
 *
 * Rules (non-negotiable):
 * - Never throws — every error path falls back to the home tab.
 * - `screen` absent or empty → home.
 * - `screen` not in SCREEN_ROUTES → warn + home.
 * - `chat` without `matchId` → messages list.
 * - `user-profile` without `userId` → home.
 * - Unknown params keys are silently ignored.
 */
export function navigateMarketingIntent(
  router: RouterLike,
  screen: string | undefined,
  params: Record<string, unknown> | undefined,
  campaignId: string | undefined,
): void {
  try {
    // Analytics breadcrumb (Sentry — no separate analytics SDK in this project)
    Sentry.addBreadcrumb({
      category: 'marketing_notification',
      message: 'marketing_notification_tapped',
      data: {
        campaign_id: campaignId ?? null,
        screen: screen || 'home',
        has_params: !!(params && Object.keys(params).length > 0),
      },
      level: 'info',
    });

    if (!screen) {
      goHome(router);
      return;
    }

    const route = SCREEN_ROUTES[screen];
    if (!route) {
      console.warn(`[Marketing] Unknown screen "${screen}", falling back to home`);
      goHome(router);
      return;
    }

    // ── Screen-specific param validation ──────────────────────────────────

    if (screen === 'chat') {
      const matchId = typeof params?.matchId === 'string' ? params.matchId : undefined;
      if (!matchId) {
        // Required param missing — open the messages list instead of crashing
        router.push(MESSAGES_ROUTE);
        return;
      }
      router.push({ pathname: route, params: { matchId } });
      return;
    }

    if (screen === 'user-profile') {
      const userId = typeof params?.userId === 'string' ? params.userId : undefined;
      if (!userId) {
        // Required param missing — fall back to home
        goHome(router);
        return;
      }
      router.push({ pathname: route, params: { userId } });
      return;
    }

    // All other screens — only include params when there is actually something
    // to pass; passing `params: {}` causes Expo Router to construct a URL
    // identical to the group path with no segments, which can resolve to an
    // unexpected URL (same transparent-group issue as the HOME_ROUTE above).
    const filtered = params && Object.keys(params).length > 0 ? params : undefined;
    if (filtered) {
      router.push({ pathname: route, params: filtered });
    } else {
      router.push(route);
    }
  } catch (e) {
    console.error('[Marketing] Failed to handle notification navigation', e);
    try { goHome(router); } catch { /* nothing we can do */ }
  }
}
