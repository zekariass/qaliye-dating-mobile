import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

// ---------------------------------------------------------------------------
// Hook — fires callbacks when app transitions foreground ↔ background
// ---------------------------------------------------------------------------

export function useAppStateChat(
  onForeground: () => void,
  onBackground: () => void,
) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appState.current;
      appState.current = nextState;

      if (prev.match(/inactive|background/) && nextState === 'active') {
        onForeground();
      } else if (
        prev === 'active' &&
        nextState.match(/inactive|background/)
      ) {
        onBackground();
      }
    });

    return () => subscription.remove();
  }, [onForeground, onBackground]);
}
