import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { bdColors } from '@/constants/blindDateTheme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Soft decorative backdrop for Blind Date flow screens — large, blurred
 * violet/pink blobs floating off the corners over the theme background.
 *
 * When artwork is ready, pass `source` to render it full-bleed under a
 * theme-tinted scrim that keeps foreground text readable in both modes:
 *
 *   <FlowBackdrop source={require('@/assets/blind-date-bg.png')} />
 */
export function FlowBackdrop({ source }: { source?: ImageSource }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const blobOpacity = isDark ? 0.16 : 0.30;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {source ? (
        <>
          <Image
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: isDark ? 'rgba(13,7,18,0.82)' : 'rgba(255,249,251,0.86)' },
            ]}
          />
        </>
      ) : (
        <>
          <View
            style={[
              styles.blob,
              styles.blobTopRight,
              { backgroundColor: bdColors.primary, opacity: blobOpacity },
            ]}
          />
          <View
            style={[
              styles.blob,
              styles.blobBottomLeft,
              { backgroundColor: bdColors.accent, opacity: blobOpacity * 0.8 },
            ]}
          />
          <View
            style={[
              styles.blob,
              styles.blobMidLeft,
              { backgroundColor: th.border, opacity: blobOpacity },
            ]}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  blobTopRight: { top: -90, right: -80 },
  blobBottomLeft: { bottom: -70, left: -90 },
  blobMidLeft: { top: '42%', left: -140, width: 200, height: 200, borderRadius: 100 },
});
