import { useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THROTTLE_MS = 2500;

// ---------------------------------------------------------------------------
// Hook — throttles outgoing typing broadcasts
// ---------------------------------------------------------------------------

export function useTypingIndicator(
  sendTyping: (isTyping: boolean) => void,
) {
  const lastSentAt = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTextChange = useCallback(
    (text: string) => {
      const hasText = text.trim().length > 0;
      if (!hasText) {
        console.log('[useTypingIndicator] Sending typing=false (empty text)');
        sendTyping(false);
        lastSentAt.current = 0;
        if (stopTimer.current) {
          clearTimeout(stopTimer.current);
          stopTimer.current = null;
        }
        return;
      }

      const now = Date.now();
      if (now - lastSentAt.current >= THROTTLE_MS) {
        console.log('[useTypingIndicator] Sending typing=true (throttled)');
        sendTyping(true);
        lastSentAt.current = now;
      }

      if (stopTimer.current) clearTimeout(stopTimer.current);
      stopTimer.current = setTimeout(() => {
        console.log('[useTypingIndicator] Sending typing=false (timeout)');
        sendTyping(false);
        lastSentAt.current = 0;
        stopTimer.current = null;
      }, THROTTLE_MS);
    },
    [sendTyping],
  );

  const stopTyping = useCallback(() => {
    sendTyping(false);
    lastSentAt.current = 0;
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
  }, [sendTyping]);

  return { onTextChange, stopTyping };
}
