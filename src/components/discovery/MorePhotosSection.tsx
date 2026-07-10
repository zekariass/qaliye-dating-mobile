import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    FlatList,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const { width: W, height: H } = Dimensions.get('window');
const H_PAD = spacing.md;
const GAP = 8;
const CELL_W = (W - H_PAD * 2 - GAP) / 2;
const CELL_H = Math.round(CELL_W * 1.35);
const FULL_W = W - H_PAD * 2;
const FULL_H = Math.round(FULL_W * 1.25);

// ---------------------------------------------------------------------------
// Full-screen swipable photo viewer
// ---------------------------------------------------------------------------
function PhotoViewer({
  visible,
  photos,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  photos: { image_url: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const listRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  const handleShow = useCallback(() => {
    setCurrentIndex(initialIndex);
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }, 30);
  }, [initialIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) setCurrentIndex(viewableItems[0].index ?? 0);
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <View style={viewer.bg}>
        {/* Header — close + counter */}
        <View style={[viewer.header, { paddingTop: safeTop + 8 }]}>
          <TouchableOpacity onPress={onClose} style={viewer.closeBtn} activeOpacity={0.8}
            accessibilityLabel="Close photo viewer">
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={viewer.counterPill}>
            <Text style={viewer.counterText}>{currentIndex + 1} / {photos.length}</Text>
          </View>
        </View>

        {/* Swipable images */}
        <FlatList
          ref={listRef}
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => (
            <View style={viewer.slide}>
              <Image
                source={{ uri: item.image_url }}
                style={viewer.fullPhoto}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          )}
        />

        {/* Dot indicators */}
        {photos.length > 1 && (
          <View style={[viewer.dots, { paddingBottom: safeBottom + 16 }]}>
            {photos.map((_, i) => (
              <View
                key={i}
                style={[viewer.dot, i === currentIndex ? viewer.dotOn : viewer.dotOff]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const viewer = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPhoto: {
    width: W,
    height: H,
  },
  dots: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOn:  { backgroundColor: '#FFF' },
  dotOff: { backgroundColor: 'rgba(255,255,255,0.35)' },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface Props {
  photos: { image_url: string }[];
}

export default function MorePhotosSection({ photos }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const safePhotos = photos ?? [];
  const extraPhotos = safePhotos.slice(1); // skip primary
  if (extraPhotos.length === 0) return null;

  const openViewer = (fullArrayIndex: number) => {
    setViewerIndex(fullArrayIndex);
    setViewerVisible(true);
  };

  // ── Single extra photo — full-width ──────────────────────────────────────
  if (extraPhotos.length === 1) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: th.text }]}>{t('discovery.morePhotos')}</Text>
        <TouchableOpacity
          style={[styles.fullCell, { borderColor: th.border }]}
          activeOpacity={0.85}
          onPress={() => openViewer(1)}
          accessibilityLabel="Photo 2"
        >
          <Image
            source={{ uri: extraPhotos[0].image_url }}
            style={styles.photo}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        </TouchableOpacity>
        <PhotoViewer
          visible={viewerVisible}
          photos={safePhotos}
          initialIndex={viewerIndex}
          onClose={() => setViewerVisible(false)}
        />
      </View>
    );
  }

  // ── Multiple extra photos — 2-column grid ────────────────────────────────
  // Build rows of 2; indices are in the full `safePhotos` array (extraPhotos[i] = safePhotos[i+1])
  const rows: [number, number | null][] = extraPhotos.reduce<[number, number | null][]>(
    (acc, _, i) => {
      if (i % 2 === 0) acc.push([i + 1, extraPhotos[i + 1] !== undefined ? i + 2 : null]);
      return acc;
    },
    [],
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: th.text }]}>{t('discovery.morePhotos')}</Text>

      <View style={styles.grid}>
        {rows.map(([leftIdx, rightIdx], rowIdx) => (
          <View key={rowIdx} style={styles.row}>
            <TouchableOpacity
              style={[styles.cell, { borderColor: th.border }]}
              activeOpacity={0.85}
              onPress={() => openViewer(leftIdx)}
              accessibilityLabel={`Photo ${leftIdx + 1}`}
            >
              <Image
                source={{ uri: safePhotos[leftIdx].image_url }}
                style={styles.photo}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            </TouchableOpacity>

            {rightIdx !== null ? (
              <TouchableOpacity
                style={[styles.cell, { borderColor: th.border }]}
                activeOpacity={0.85}
                onPress={() => openViewer(rightIdx)}
                accessibilityLabel={`Photo ${rightIdx + 1}`}
              >
                <Image
                  source={{ uri: safePhotos[rightIdx].image_url }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.cell} />
            )}
          </View>
        ))}
      </View>

      <PhotoViewer
        visible={viewerVisible}
        photos={safePhotos}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: spacing.xl,
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  grid: {
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    width: CELL_W,
    height: CELL_H,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fullCell: {
    width: FULL_W,
    height: FULL_H,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
