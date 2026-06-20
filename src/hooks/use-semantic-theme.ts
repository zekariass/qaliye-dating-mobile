import { useColorScheme } from 'react-native';

import { SemanticColors, type SemanticTheme } from '@/constants/semantic-colors';
import { useThemeStore } from '@/stores/theme-store';

export function useSemanticTheme(): { sem: SemanticTheme; mode: 'light' | 'dark' } {
  const systemScheme = useColorScheme();
  const storeMode = useThemeStore((s) => s.mode);

  const effective: 'light' | 'dark' =
    storeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : storeMode;

  return { sem: SemanticColors[effective] as SemanticTheme, mode: effective };
}
