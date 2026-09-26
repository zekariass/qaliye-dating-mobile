// ─── Blind Date — palette & gradients ────────────────────────────────────────
// Mapped onto the app's primary violet identity so every Blind Date surface
// shares the same look & feel as the rest of the app.

import { colors } from '@/constants/theme';

export const bdColors = {
  /** App primary violet — CTA / brand accent for Blind Date surfaces. */
  primary: colors.primary,
  /** Lighter violet for emphasis and active states. */
  primaryLight: colors.primaryLight,
  /** App secondary pink — highlights, glows, celebration accents. */
  accent: colors.secondary,
  /** Golden star — finalist / trophy moments. */
  gold: '#F59E0B',
  /** Soft violet surface tint for warm cards and chips (light theme). */
  surfaceWarm: colors.backgroundLavender,
  /** Soft violet surface accent for dark theme. */
  surfaceWarmDark: '#2E1F50',
  /** Neutral slate used for eliminated/ended states. */
  slate: '#8A93A6',
} as const;

export const bdGradients = {
  /** Main hero gradient — app violet. */
  hero: ['#6D35FF', '#8A2CFF', '#B777FF'] as const,
  /** Dark violet background for reveal/countdown moments. */
  dark: ['#160B2E', '#2E1F50', '#4A2C8A'] as const,
  /** Finalist / trophy moments. */
  gold: ['#92400E', '#D97706', '#F59E0B'] as const,
  /** Match celebration — app romantic pink → violet. */
  match: ['#FF4FA3', '#B777FF', '#8A2CFF'] as const,
  /** Gentle lavender surface tint for soft cards. */
  soft: ['#EFE7FF', '#FFE4F3'] as const,
  /** Warm dark gradient for dark mode hero cards. */
  darkHero: ['#2E1F50', '#160B2E'] as const,
} as const;
