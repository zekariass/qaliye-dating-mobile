/**
 * Semantic color tokens for the Edit Profile flow.
 * Light theme matches the warm-white/lilac design reference.
 * Dark theme uses the existing dark palette with accessible contrast.
 */

export const SemanticColors = {
  light: {
    bg: '#FDF8FC',
    surface: '#FFFFFF',
    surfaceMuted: '#F5F0FA',
    surfaceElevated: '#FFFFFF',
    textPrimary: '#1A1033',
    textSecondary: '#5C5470',
    textMuted: '#9B93A8',
    border: '#E9DDF8',
    accent: '#8A2CFF',
    accentSoft: '#F0E6FF',
    accentStrong: '#6D1FD4',
    success: '#16A34A',
    info: '#2F80ED',
    danger: '#EF4444',
    navigationBackground: '#FFFFFF',
    navigationInactive: '#9B93A8',
    shadow: '#8A2CFF',
  },
  dark: {
    bg: '#0D0712',
    surface: '#1A1230',
    surfaceMuted: '#160F24',
    surfaceElevated: '#221740',
    textPrimary: '#F3EEFF',
    textSecondary: '#B8AED0',
    textMuted: '#6B5F80',
    border: '#2E1F50',
    accent: '#A855F7',
    accentSoft: '#251840',
    accentStrong: '#C084FC',
    success: '#22C55E',
    info: '#60A5FA',
    danger: '#F87171',
    navigationBackground: '#1A1230',
    navigationInactive: '#6B5F80',
    shadow: '#000000',
  },
} as const;

export type SemanticTheme = { [K in keyof typeof SemanticColors.light]: string };
export type SemanticColorKey = keyof SemanticTheme;
