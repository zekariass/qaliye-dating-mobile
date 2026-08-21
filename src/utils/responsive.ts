import { Dimensions, useWindowDimensions } from 'react-native';

// ---------------------------------------------------------------------------
// Responsive layout helpers for phone + tablet/iPad support
// ---------------------------------------------------------------------------

/**
 * Returns the visual card width for the swipe discovery screen.
 *
 * On phones (< 500 px) the caller should use `flex: 1` (fills the container).
 * This function is only called on tablets/iPads (width >= 500).
 *
 * Breakpoints are calibrated so the card occupies a comfortable portion of the
 * screen at every size while keeping natural horizontal breathing room:
 *
 *   375 – 499 px   phone  → flex:1 (full width, handled by caller)
 *   500 – 767 px   small tablet / large phone  → 90 %
 *   768 – 1023 px  medium tablet / iPad mini/Air → 86 %
 *   1024 px +      large iPad / iPad Pro        → 82 %
 *
 * Results for common breakpoints:
 *   500 px  →  450 px
 *   768 px  →  660 px
 *   1024 px →  840 px
 *   1180 px →  968 px
 *   1366 px → 1120 px
 */
export function getSwipeCardWidth(screenW: number): number {
  if (screenW >= 1024) return Math.round(screenW * 0.82);
  if (screenW >= 768)  return Math.round(screenW * 0.86);
  return Math.round(screenW * 0.90); // 500–767 px
}

/**
 * Returns the horizontal offset (from the screen's right edge) that keeps
 * the action-button rail flush with the card's right edge.
 *
 * Pass the same `screenW` and `cardW` that the ProfileCard uses so both
 * always agree, regardless of screen size.
 *
 * On phones `cardW === screenW` so the offset is simply `inset`.
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
