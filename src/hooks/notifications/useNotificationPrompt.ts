import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { useNotificationPermission } from './useNotificationPermission';

const LIKE_COUNT_KEY = 'qaliye_notif_like_count';
const MESSAGE_COUNT_KEY = 'qaliye_notif_message_count';
const LIKE_PROMPT_SHOWN_KEY = 'qaliye_notif_like_prompt_shown';
const MESSAGE_PROMPT_SHOWN_KEY = 'qaliye_notif_message_prompt_shown';

const LIKE_THRESHOLD = 1;
const MESSAGE_THRESHOLD = 1;

type PromptTrigger = 'like' | 'message';

export function useNotificationPrompt() {
  const { status, requestPermission } = useNotificationPermission();
  const [visible, setVisible] = useState(false);
  const [currentTrigger, setCurrentTrigger] = useState<PromptTrigger | null>(null);

  const checkAndMaybeShow = useCallback(
    async (trigger: PromptTrigger) => {
      if (Platform.OS === 'web') return;
      if (status === 'granted') return;

      const countKey = trigger === 'like' ? LIKE_COUNT_KEY : MESSAGE_COUNT_KEY;
      const shownKey =
        trigger === 'like' ? LIKE_PROMPT_SHOWN_KEY : MESSAGE_PROMPT_SHOWN_KEY;
      const threshold =
        trigger === 'like' ? LIKE_THRESHOLD : MESSAGE_THRESHOLD;

      try {
        const [countStr, shownStr] = await AsyncStorage.multiGet([
          countKey,
          shownKey,
        ]);

        const count = (countStr[1] ? parseInt(countStr[1], 10) : 0) + 1;
        await AsyncStorage.setItem(countKey, String(count));

        const alreadyShown = shownStr[1] === 'true';
        if (alreadyShown) return;

        if (count >= threshold) {
          setCurrentTrigger(trigger);
          setVisible(true);
          await AsyncStorage.setItem(shownKey, 'true');
        }
      } catch {
        // Non-fatal
      }
    },
    [status],
  );

  const onLike = useCallback(() => checkAndMaybeShow('like'), [checkAndMaybeShow]);
  const onMessage = useCallback(
    () => checkAndMaybeShow('message'),
    [checkAndMaybeShow],
  );

  const handleEnable = useCallback(async () => {
    await requestPermission();
    setVisible(false);
  }, [requestPermission]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    visible,
    currentTrigger,
    onLike,
    onMessage,
    handleEnable,
    handleDismiss,
  };
}
