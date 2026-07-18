import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GALLERY_H = Math.round(SCREEN_H * 0.46);

const BTN_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.35,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 8,
} as const;

interface Props {
  images: string[];
  safeTop: number;
  onBack: () => void;
  onMore: () => void;
}

function ProfileHeroGallery({ images, safeTop, onBack, onMore }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const listRef = useRef<FlatList>(null);
  const { top, bottom } = useSafeAreaInsets();

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      setActiveIdx(idx);
    },
    [],
  );

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const closeViewer = useCallback(() => setViewerIndex(null), []);

  const goToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, images.length - 1));
    setViewerIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
  }, [images.length]);

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
          <TouchableOpacity
            key={i}
            activeOpacity={1}
            onPress={() => openViewer(i)}
          >
            <Image
              source={{ uri }}
              style={{ width: SCREEN_W, height: GALLERY_H }}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Back button */}
      <Pressable
        style={[styles.circleBtn, styles.backBtn, { top: safeTop + 14 }, BTN_SHADOW]}
        onPress={onBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true }}
      >
        <Ionicons name="arrow-back" size={22} color="#FFF" />
      </Pressable>

      {/* More options button */}
      <Pressable
        style={[styles.circleBtn, styles.moreBtn, { top: safeTop + 14 }, BTN_SHADOW]}
        onPress={onMore}
        accessibilityLabel="More profile options"
        accessibilityRole="button"
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true }}
      >
        <Ionicons name="ellipsis-horizontal" size={22} color="#FFF" />
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

      {/* Full-screen photo viewer modal */}
      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <View style={styles.viewerOverlay}>
          {/* Header bar — close + counter */}
          <View style={[styles.viewerHeader, { paddingTop: top + 8 }]}>
            <View style={{ width: 40 }} />
            {viewerIndex !== null && images.length > 0 && (
              <Text style={styles.viewerCounterText}>
                {viewerIndex + 1} / {images.length}
              </Text>
            )}
            <Pressable
              style={styles.viewerCloseBtn}
              onPress={closeViewer}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Horizontal swipeable gallery */}
          {viewerIndex !== null && (
            <FlatList
              ref={listRef}
              data={images}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={viewerIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_W,
                offset: SCREEN_W * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                setViewerIndex(idx);
              }}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <View style={styles.viewerImageWrap}>
                  <Image
                    source={{ uri: item }}
                    style={styles.viewerImage}
                    contentFit="contain"
                    transition={150}
                  />
                </View>
              )}
            />
          )}

          {/* Footer bar — chevrons */}
          <View style={[styles.viewerFooter, { paddingBottom: bottom + 16 }]}>
            <Pressable
              style={[styles.viewerNavBtn, viewerIndex === null || viewerIndex <= 0 ? styles.viewerNavBtnDisabled : null]}
              onPress={() => viewerIndex !== null && viewerIndex > 0 && goToIndex(viewerIndex - 1)}
              disabled={viewerIndex === null || viewerIndex <= 0}
              accessibilityLabel="Previous photo"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={28} color={viewerIndex !== null && viewerIndex > 0 ? '#FFFFFFCC' : '#FFFFFF33'} />
            </Pressable>

            <Pressable
              style={[styles.viewerNavBtn, viewerIndex === null || viewerIndex >= images.length - 1 ? styles.viewerNavBtnDisabled : null]}
              onPress={() => viewerIndex !== null && viewerIndex < images.length - 1 && goToIndex(viewerIndex + 1)}
              disabled={viewerIndex === null || viewerIndex >= images.length - 1}
              accessibilityLabel="Next photo"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={28} color={viewerIndex !== null && viewerIndex < images.length - 1 ? '#FFFFFFCC' : '#FFFFFF33'} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  circleBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.52)',
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

  // ── Full-screen viewer styles ──
  viewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  viewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  viewerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCounterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewerImageWrap: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.7,
  },
  viewerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10,
  },
  viewerNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerNavBtnDisabled: {
    backgroundColor: 'transparent',
  },
});

export default memo(ProfileHeroGallery);
