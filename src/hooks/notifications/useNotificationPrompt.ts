import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { useNotificationPermission } from './useNotificationPermission';

const LIKE_COUNT_KEY = 'qaliye_notif_like_count';
const MESSAGE_COUNT_KEY = 'qaliye_notif_message_count';

// Single shared key — once ANY prompt has been shown (including from the
// onboarding completion screen) no further in-app prompts will fire.
// Exported so CompletionStep can write it when its own popup is shown.
export const NOTIFICATION_PROMPT_SHOWN_KEY = 'qaliye_notif_prompt_shown';

// Wait for meaningful engagement before interrupting with a permission ask.
const LIKE_THRESHOLD = 3;
const MESSAGE_THRESHOLD = 2;
// Match trigger has no threshold — one match is already a peak moment.

type PromptTrigger = 'like' | 'message' | 'match';

export function useNotificationPrompt() {
  const { status, requestPermission } = useNotificationPermission();
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<PromptTrigger | null>(null);

  const checkAndMaybeShow = useCallback(
    async (trigger: PromptTrigger) => {
      if (Platform.OS === 'web') return;
      if (status === 'granted') return;

      try {
        // ── Match: skip the counter, fire immediately on first match ────────
        // A confirmed mutual match is the highest-value moment in the app.
        // One is enough to justify showing the prompt; we just guard against
        // the shared flag so we never show it twice.
        if (trigger === 'match') {
          const shownStr = await AsyncStorage.getItem(NOTIFICATION_PROMPT_SHOWN_KEY);
          if (shownStr === 'true') return;

          Sentry.addBreadcrumb({
            category: 'notification_prompt',
            message: 'notification_prompt_shown',
            data: { trigger },
            level: 'info',
          });
          setCurrentTrigger('match');
          setVisible(true);
          await AsyncStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'true');
          return;
        }

        // ── Like / Message: count-based threshold ────────────────────────────
        const countKey = trigger === 'like' ? LIKE_COUNT_KEY : MESSAGE_COUNT_KEY;
        const threshold = trigger === 'like' ? LIKE_THRESHOLD : MESSAGE_THRESHOLD;

        const [countStr, shownStr] = await AsyncStorage.multiGet([
          countKey,
          NOTIFICATION_PROMPT_SHOWN_KEY,
        ]);

        const count = (countStr[1] ? parseInt(countStr[1], 10) : 0) + 1;
        await AsyncStorage.setItem(countKey, String(count));

        // Shared flag: skip if any prompt (including the onboarding one) was
        // already shown to this user.
        const alreadyShown = shownStr[1] === 'true';
        if (alreadyShown) return;

        if (count >= threshold) {
          Sentry.addBreadcrumb({
            category: 'notification_prompt',
            message: 'notification_prompt_shown',
            data: { trigger, count },
            level: 'info',
          });
          setCurrentTrigger(trigger);
          setVisible(true);
          // Mark immediately so a rapid second event can't show a duplicate.
          await AsyncStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'true');
        }
      } catch {
        // Non-fatal — never block the caller
      }
    },
    [status],
  );

  const onLike = useCallback(() => checkAndMaybeShow('like'), [checkAndMaybeShow]);
  const onMessage = useCallback(() => checkAndMaybeShow('message'), [checkAndMaybeShow]);
  const onMatch = useCallback(() => checkAndMaybeShow('match'), [checkAndMaybeShow]);

  const handleEnable = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    Sentry.addBreadcrumb({
      category: 'notification_prompt',
      message: 'notification_prompt_enable_tapped',
      data: { trigger: currentTrigger },
      level: 'info',
    });

    try {
      const granted = await requestPermission();

      Sentry.addBreadcrumb({
        category: 'notification_prompt',
        message: 'notification_permission_result',
        data: { granted, trigger: currentTrigger },
        level: 'info',
      });

      if (!granted) {
        // iOS: after the first denial the system dialog never shows again.
        // Offer the Settings shortcut so the user can still enable manually.
        await Linking.openSettings();
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
      setVisible(false);
    }
  }, [isLoading, requestPermission, currentTrigger]);

  const handleDismiss = useCallback(() => {
    Sentry.addBreadcrumb({
      category: 'notification_prompt',
      message: 'notification_prompt_dismissed',
      data: { trigger: currentTrigger },
      level: 'info',
    });
    setVisible(false);
  }, [currentTrigger]);

  return {
    visible,
    isLoading,
    currentTrigger,
    onLike,
    onMessage,
    onMatch,
    handleEnable,
    handleDismiss,
  };
}
