/**
 * Formats a distance in kilometers for display.
 * Values >= 1000 are converted to "1k", "2.5k" etc.
 * Values < 1000 are shown as-is (e.g. "850 km").
 */
export function formatDistance(km: number): string {
  if (km >= 1000) {
    const k = km / 1000;
    const rounded = Math.round(k * 10) / 10;
    return `${rounded}k km`;
  }
  return `${km} km`;
}
