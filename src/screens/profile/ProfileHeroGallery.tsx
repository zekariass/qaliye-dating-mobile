import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback, useRef, useState } from 'react';
import {
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    View
} from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GALLERY_H = Math.round(SCREEN_H * 0.46);

const BTN_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.18,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
} as const;

interface Props {
  images: string[];
  safeTop: number;
  onBack: () => void;
  onMore: () => void;
}

function ProfileHeroGallery({ images, safeTop, onBack, onMore }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      setActiveIdx(idx);
    },
    [],
  );

  return (
    <View style={{ width: SCREEN_W, height: GALLERY_H, paddingTop: safeTop }}>
      {/* Paging gallery */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {images.map((uri, i) => (
          <Image
            key={i}
            source={{ uri }}
            style={{ width: SCREEN_W, height: GALLERY_H }}
            contentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
          />
        ))}
      </ScrollView>

      {/* Back button */}
      <Pressable
        style={[styles.circleBtn, styles.backBtn, { top: safeTop + 14 }, BTN_SHADOW]}
        onPress={onBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
      >
        <Ionicons name="arrow-back" size={20} color="#111827" />
      </Pressable>

      {/* More options button */}
      <Pressable
        style={[styles.circleBtn, styles.moreBtn, { top: safeTop + 14 }, BTN_SHADOW]}
        onPress={onMore}
        accessibilityLabel="More profile options"
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color="#8A2CFF" />
      </Pressable>

      {/* Pagination dots */}
      <View style={[styles.dotsRow, { pointerEvents: 'none' }]}>
        {images.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIdx ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  circleBtn: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backBtn: { left: 16 },
  moreBtn: { right: 16 },
  dotsRow: {
    position: 'absolute',
    bottom: 44,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: '#8A2CFF' },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.60)' },
});

export default memo(ProfileHeroGallery);
