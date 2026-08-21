import { Dimensions, useWindowDimensions } from 'react-native';

// ---------------------------------------------------------------------------
// Responsive layout helpers for phone + tablet/iPad support
// ---------------------------------------------------------------------------

// ─── Swipe card width ────────────────────────────────────────────────────────

/**
 * Returns the visual card width for the swipe discovery screen.
 * On phones (< 500 px) the caller uses `flex: 1` (full width).
 * On tablets/iPads a uniform 3.5 % margin is applied each side.
 */
export function getSwipeCardWidth(screenW: number): number {
  return Math.round(screenW * 0.93);
}

/**
 * Returns the horizontal offset (from the screen's right edge) that keeps
 * the action-button rail flush with the card's right edge (10 px inside).
 */
export function getActionOverlayRight(screenW: number, inset = 10): number {
  if (screenW < 500) return inset;
  const cardW = getSwipeCardWidth(screenW);
  return Math.floor((screenW - cardW) / 2) + inset;
}

// ─── Tablet text / button scaling ────────────────────────────────────────────

/**
 * Master toggle — set to false to instantly revert all tablet scaling
 * across every component that calls useTabletScale().
 */
const TABLET_SCALE_ENABLED = true;

/**
 * Returns a scale multiplier based on the current screen width:
 *
 *   < 500 px  (phone)          → 1.00  (no change)
 *   500–767 px (small tablet)  → 1.15
 *   768–1023 px (iPad mini/Air)→ 1.25
 *   1024 px + (iPad Pro)       → 1.35
 *
 * Set TABLET_SCALE_ENABLED = false above to disable and return 1.0 everywhere.
 */
export function useTabletScale(): number {
  const { width } = useWindowDimensions();
  if (!TABLET_SCALE_ENABLED || width < 500) return 1.0;
  if (width >= 1024) return 1.35;
  if (width >= 768)  return 1.25;
  return 1.15;
}

/**
 * Scales a base pixel size by the given multiplier and rounds to the
 * nearest integer, ensuring crisp rendering on all pixel densities.
 *
 * Usage:  rs(14, scale)  →  14 on phone, 18 on large iPad
 */
export function rs(baseSize: number, scale: number): number {
  return Math.round(baseSize * scale);
}

// Re-export useWindowDimensions so components can import from one place
export { useWindowDimensions };

// For module-level constants (used in cases where hooks aren't available)
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;
