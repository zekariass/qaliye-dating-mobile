import '@/global.css';

import { Platform } from 'react-native';

export const colors = {
  primary: '#8A2CFF',
  primaryDark: '#5B18D6',
  primaryLight: '#B777FF',

  secondary: '#FF4FA3',
  secondaryDark: '#D92C85',
  secondaryLight: '#FF9BCD',

  heartPink: '#FF4FA3',
  heartRose: '#FF7ABF',
  softPink: '#FFE4F3',

  background: '#FFF6FB',
  backgroundSoft: '#F7EEFF',
  backgroundLavender: '#EFE7FF',

  surface: '#FFFFFF',
  surfaceSoft: '#FAF7FF',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  border: '#E9DDF8',

  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  verifiedBlue: '#2F80ED',

  blackTab: '#06070D',
} as const;

export const gradients = {
  primary: ['#A020F0', '#6D35FF'] as const,
  romantic: ['#FF4FA3', '#8A2CFF'] as const,
  splash: ['#FFF6FB', '#F7EEFF', '#EFE7FF'] as const,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  md: 18,
  lg: 22,
  xl: 28,
  '2xl': 36,
  '3xl': 48,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  card: {
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Colors = {
  light: {
    text: colors.textPrimary,
    background: colors.background,
    backgroundElement: colors.backgroundSoft,
    backgroundSelected: colors.backgroundLavender,
    textSecondary: colors.textSecondary,
    surface: colors.surface,
    border: colors.border,
    textMuted: colors.textMuted,
  },
  dark: {
    text: '#F3EEFF',
    background: '#0D0712',
    backgroundElement: '#160F24',
    backgroundSelected: '#251840',
    textSecondary: '#9CA3AF',
    surface: '#1A1230',
    border: '#2E1F50',
    textMuted: '#6B7280',
  },
} as const;

export type AppTheme = { [K in keyof typeof Colors.light]: string };

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: spacing.xs,
  two: spacing.sm,
  three: spacing.md,
  four: spacing.lg,
  five: spacing.xl,
  six: spacing.xxxl,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
