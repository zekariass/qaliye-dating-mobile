import { Image } from 'expo-image';
import type { ImageStyle, StyleProp } from 'react-native';

// blind-date-icon.png is 512×248 — keep the asset's aspect ratio.
const ICON_ASPECT = 512 / 248;

interface Props {
  /** Icon height in px (default 16 — matches inline badge/icon sizes). */
  size?: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * Small inline Blind Date indicator shown next to a matched user's name.
 * Render it only when `isBlindDateMatch(...)` is true.
 */
export function BlindDateBadge({ size = 16, style }: Props) {
  return (
    <Image
      source={require('@/assets/images/blind-date-icon.png')}
      style={[{ width: size * ICON_ASPECT, height: size }, style]}
      contentFit="contain"
      accessibilityElementsHidden
    />
  );
}
