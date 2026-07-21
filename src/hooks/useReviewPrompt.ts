import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { useCallback } from 'react';

const MATCH_COUNT_KEY = 'qaliye_review_match_count';
const LAST_PROMPT_KEY = 'qaliye_review_last_prompt_ts';

const MATCH_THRESHOLD = 3;
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function useReviewPrompt() {
  const onMatch = useCallback(async () => {
    try {
      const [countStr, lastPromptStr] = await AsyncStorage.multiGet([
        MATCH_COUNT_KEY,
        LAST_PROMPT_KEY,
      ]);

      const count = (countStr[1] ? parseInt(countStr[1], 10) : 0) + 1;
      await AsyncStorage.setItem(MATCH_COUNT_KEY, String(count));

      const lastPrompt = lastPromptStr[1] ? parseInt(lastPromptStr[1], 10) : 0;
      const cooldownPassed = Date.now() - lastPrompt >= COOLDOWN_MS;

      if (count >= MATCH_THRESHOLD && cooldownPassed) {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
        }
        await AsyncStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
      }
    } catch {
      // Non-fatal — silently ignore
    }
  }, []);

  return { onMatch };
}
