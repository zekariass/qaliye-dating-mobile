import * as Sentry from '@sentry/react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useVerificationPromptStore } from '@/stores/verification-prompt-store';

import { useCurrentProfile } from './useCurrentProfile';

// ---------------------------------------------------------------------------
// Hook — identity verification prompt schedule
// ---------------------------------------------------------------------------
//
// Shows a "Verify Your Identity" modal contextually during Like / Super Like
// actions according to a progressive back-off schedule:
//
//   Prompt 1  — first eligible Like / Super Like
//   Prompt 2  — 3 days after prompt 1
//   Prompt 3  — 7 days after prompt 2
//   Prompt 4  — 14 days after prompt 3
//   Prompt 5+ — 30 days after the previous prompt
//
// The prompt is suppressed when any of the following is true:
//   • The user is already verified (is_verified === true)
//   • Verification is pending or under manual review
//   • The schedule says it is not due yet
//   • Another modal is blocking the UI (isBlockingModalVisible === true)
//
// Coordination with other prompts
// ---------------------------------
// Pass `isBlockingModalVisible: true` when another prompt (e.g. the
// notification permission prompt) is currently visible.  The identity
// verification prompt will be deferred — it will fire on the next eligible
// Like / Super Like action instead.
//
// ---------------------------------------------------------------------------

export function useIdentityVerificationPrompt() {
  const router = useRouter();
  const userId = useCurrentUserId();
  const { data: profile } = useCurrentProfile();

  const isDue = useVerificationPromptStore((s) => s.isDue);
  const recordShown = useVerificationPromptStore((s) => s.recordShown);

  const [visible, setVisible] = useState(false);

  // Derive eligibility from profile data so the hook stays reactive.
  const isVerified = profile?.is_verified ?? true; // default true → safe (no prompt)
  const verificationStatus = profile?.verification_status;
  const isPendingOrUnderReview =
    verificationStatus === 'PENDING' || verificationStatus === 'MANUAL_REVIEW';

  /**
   * Call this after a successful Like or Super Like action.
   *
   * @param isBlockingModalVisible - Pass `true` when another modal (e.g. the
   *   notification prompt or match celebration overlay) is currently visible.
   *   The prompt will be deferred to the next eligible action rather than
   *   shown immediately.
   */
  const onLikeOrSuperLike = useCallback(
    (isBlockingModalVisible: boolean) => {
      if (!userId) return;
      if (isVerified) return;
      if (isPendingOrUnderReview) return;
      if (isBlockingModalVisible) return;  // defer — another modal is active
      if (!isDue(userId)) return;

      Sentry.addBreadcrumb({
        category: 'identity_verification_prompt',
        message: 'identity_verification_prompt_shown',
        level: 'info',
      });

      // Record before showing so a rapid second call cannot duplicate.
      recordShown(userId);
      setVisible(true);
    },
    [userId, isVerified, isPendingOrUnderReview, isDue, recordShown],
  );

  const handleVerifyNow = useCallback(() => {
    setVisible(false);
    Sentry.addBreadcrumb({
      category: 'identity_verification_prompt',
      message: 'identity_verification_prompt_verify_now_tapped',
      level: 'info',
    });
    router.push('/(app)/verify-identity' as any);
  }, [router]);

  const handleDismiss = useCallback(() => {
    Sentry.addBreadcrumb({
      category: 'identity_verification_prompt',
      message: 'identity_verification_prompt_dismissed',
      level: 'info',
    });
    setVisible(false);
  }, []);

  return {
    /** Whether the prompt modal should be visible. */
    visible,
    /** Call after a successful Like or Super Like to evaluate schedule. */
    onLikeOrSuperLike,
    /** User tapped "Verify Now" — opens the verification flow. */
    handleVerifyNow,
    /** User tapped "Maybe Later" or dismissed the modal. */
    handleDismiss,
  };
}
