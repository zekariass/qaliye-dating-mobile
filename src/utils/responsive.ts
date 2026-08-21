import { Dimensions, useWindowDimensions } from 'react-native';

// ---------------------------------------------------------------------------
// Responsive layout helpers for phone + tablet/iPad support
// ---------------------------------------------------------------------------

/**
 * Returns the visual card width for the swipe discovery screen.
 *
 * On phones (< 500 px) the caller uses `flex: 1` (fills the container at
 * full width with no horizontal margins).
 *
 * On tablets/iPads a uniform 3.5 % margin is applied on each side so the
 * card stays visibly inset from the screen edges without wasting screen space.
 *
 *   500 px  →  465 px  (17 px each side)
 *   768 px  →  714 px  (27 px each side)
 *   1024 px →  952 px  (36 px each side)
 *   1180 px → 1097 px  (41 px each side)
 *   1366 px → 1270 px  (48 px each side)
 */
export function getSwipeCardWidth(screenW: number): number {
  return Math.round(screenW * 0.93);
}

/**
 * Returns the horizontal offset (from the screen's right edge) that keeps
 * the action-button rail flush with the card's right edge (10 px inside).
 *
 * On phones cardW === screenW, so the result is simply `inset`.
 */
export function getActionOverlayRight(screenW: number, inset = 10): number {
  if (screenW < 500) return inset;
  const cardW = getSwipeCardWidth(screenW);
  return Math.floor((screenW - cardW) / 2) + inset;
}

// Re-export useWindowDimensions so components can import from one place
export { useWindowDimensions };

// For module-level constants (used in cases where hooks aren't available)
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;
