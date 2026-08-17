import { themedAlert } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import {
    getLimitExceededDetails,
    isInsufficientCreditsError,
    isLimitExceededError,
    periodTypeLabel,
    type LimitExceededError,
} from '@/utils/entitlements';

type RouterLike = { push: (href: any) => void };

type ActionConfig = {
  /** Icon for the alert */
  icon: React.ComponentProps<typeof import('@expo/vector-icons').Ionicons>['name'];
  /** Icon color */
  iconColor: string;
  /** Fallback title if server doesn't provide a message */
  fallbackTitle: string;
  /** Fallback message builder — receives the period type label (e.g. "daily", "monthly", "billing cycle") */
  fallbackMessage: (periodLabel: string) => string;
};

const ACTION_CONFIGS: Record<string, ActionConfig> = {
  LIKES: {
    icon: 'heart-outline',
    iconColor: colors.heartPink,
    fallbackTitle: 'No More Likes',
    fallbackMessage: (p) => `You've used all your ${p} likes.`,
  },
  SUPER_LIKE: {
    icon: 'star-outline',
    iconColor: colors.warning,
    fallbackTitle: 'No More Super Likes',
    fallbackMessage: (p) => `You've used all your ${p} Super Likes.`,
  },
  REWIND: {
    icon: 'arrow-undo-outline',
    iconColor: colors.primary,
    fallbackTitle: 'No More Rewinds',
    fallbackMessage: (p) => `You've used all your ${p} Rewinds.`,
  },
  BOOST: {
    icon: 'rocket-outline',
    iconColor: colors.primary,
    fallbackTitle: 'No More Boosts',
    fallbackMessage: (p) => `You've used all your ${p} Boosts.`,
  },
  VOICE_MESSAGE: {
    icon: 'mic-outline',
    iconColor: colors.warning,
    fallbackTitle: 'Voice Message Limit Reached',
    fallbackMessage: (p) => `You've used all your ${p} voice messages.`,
  },
  IMAGE_MESSAGE: {
    icon: 'image-outline',
    iconColor: colors.warning,
    fallbackTitle: 'Image Message Limit Reached',
    fallbackMessage: (p) => `You've used all your ${p} image messages.`,
  },
  SEE_WHO_LIKED_YOU: {
    icon: 'eye-outline',
    iconColor: colors.primary,
    fallbackTitle: 'Reveal Limit Reached',
    fallbackMessage: (p) => `You've used all your ${p} reveals.`,
  },
  RETURN_PASSED_PROFILE: {
    icon: 'arrow-undo-outline',
    iconColor: colors.primary,
    fallbackTitle: 'Revisit Limit Reached',
    fallbackMessage: (p) => `You've used all your ${p} revisits.`,
  },
  SUPER_MESSAGE: {
    icon: 'star-outline',
    iconColor: colors.warning,
    fallbackTitle: 'Super Message Limit Reached',
    fallbackMessage: (p) => `You've used all your ${p} super messages.`,
  },
};

function getConfig(actionType: string | undefined): ActionConfig {
  return ACTION_CONFIGS[actionType ?? ''] ?? {
    icon: 'lock-closed-outline',
    iconColor: colors.primary,
    fallbackTitle: 'Limit Reached',
    fallbackMessage: (p) => `You have reached your ${p} limit.`,
  };
}

/**
 * Shows the appropriate alert for a limit-exceeded or insufficient-credit error.
 *
 * - HTTP 429 LIMIT_EXCEEDED → shows "Go Premium" (if subscriptionEnabled) + reset hint
 * - HTTP 402 insufficient credits → shows "Buy Credits" (if creditsEnabled)
 * - Otherwise → generic error
 */
export function showActionErrorAlert(
  error: unknown,
  router: RouterLike,
  opts: {
    subscriptionEnabled: boolean;
    creditsEnabled: boolean;
    /** Override the action type (useful when the error doesn't include details) */
    actionTypeOverride?: string;
  },
): void {
  const subscriptionEnabled = opts.subscriptionEnabled;
  const creditsEnabled = opts.creditsEnabled;

  // ── 402: Insufficient credits — handled by global interceptor modal ──
  if (isInsufficientCreditsError(error)) {
    return;
  }

  // ── 429: Limit exceeded ──
  if (isLimitExceededError(error)) {
    const details: LimitExceededError | null = getLimitExceededDetails(error);
    const actionType = details?.details.action_type ?? opts.actionTypeOverride ?? '';
    const config = getConfig(actionType);

    const periodLabel = periodTypeLabel(details?.details.period_type);

    themedAlert({
      title: config.fallbackTitle,
      message: config.fallbackMessage(periodLabel),
      icon: config.icon,
      iconColor: config.iconColor,
      buttons: [
        ...(subscriptionEnabled ? [{
          text: 'Go Premium',
          style: 'default' as const,
          icon: 'crown',
          iconFamily: 'material' as const,
          iconColor: '#FFD700',
          onPress: () => router.push('/(app)/premium' as any),
        }] : []),
        { text: 'OK', style: 'cancel' as const },
      ],
    });
    return;
  }

  // ── Other errors ──
  const message =
    (error as any)?.response?.data?.error?.message ??
    (error as any)?.response?.data?.message ??
    'Something went wrong. Please try again.';
  themedAlert({
    title: 'Error',
    message,
    icon: 'alert-circle-outline',
    iconColor: colors.danger,
    buttons: [{ text: 'OK', style: 'cancel' as const }],
  });
}
