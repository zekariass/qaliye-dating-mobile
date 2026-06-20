/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from 'react-native';

import { AppTheme, Colors } from '@/constants/theme';
import { useThemeStore } from '@/stores/theme-store';

export function useTheme(): { colors: AppTheme; mode: 'light' | 'dark' } {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);

  const effective: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  return { colors: Colors[effective], mode: effective };
}
