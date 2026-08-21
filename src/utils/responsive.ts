import { Dimensions, useWindowDimensions } from 'react-native';

// ---------------------------------------------------------------------------
// Responsive layout helpers for phone + tablet/iPad support
// ---------------------------------------------------------------------------

/** Max content width for full-screen experiences (swipe cards, etc.) */
export const MAX_CARD_WIDTH = 420;

/** Max content width for list/grid screens */
export const MAX_CONTENT_WIDTH = 600;

/** Max content width for two-column grids */
export const MAX_GRID_WIDTH = 720;

/**
 * Returns the effective card width for the swipe screen.
 * On phones this is `screenWidth - padding`.
 * On tablets/iPads this is capped at MAX_CARD_WIDTH and centered.
 */
export function getCardWidth(screenWidth: number, padding = 32): number {
  return Math.min(screenWidth - padding, MAX_CARD_WIDTH);
}

/**
 * Returns the horizontal margin needed to center content
 * when the screen is wider than maxWidth.
 */
export function getCenterMargin(screenWidth: number, contentWidth: number): number {
  if (screenWidth <= contentWidth) return 0;
  return Math.floor((screenWidth - contentWidth) / 2);
}

/**
 * Returns { width, marginHorizontal } for a centered card
 * that respects a max width on tablets.
 */
export function getCenteredCardLayout(screenWidth: number, maxWidth = MAX_CARD_WIDTH, padding = 32) {
  const width = Math.min(screenWidth - padding, maxWidth);
  const marginHorizontal = getCenterMargin(screenWidth, width);
  return { width, marginHorizontal };
}

/**
 * Returns the effective screen width capped at maxContentWidth,
 * plus the horizontal margin to center it.
 */
export function getCenteredContentLayout(screenWidth: number, maxContentWidth = MAX_CONTENT_WIDTH) {
  const width = Math.min(screenWidth, maxContentWidth);
  const marginHorizontal = getCenterMargin(screenWidth, width);
  return { width, marginHorizontal };
}

// Re-export useWindowDimensions so components can import from one place
export { useWindowDimensions };

// For module-level constants (used in cases where hooks aren't available)
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;
