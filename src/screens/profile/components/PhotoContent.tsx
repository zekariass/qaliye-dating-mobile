import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProfilePhoto } from '../mockCurrentUserProfile';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const CARD_PADDING = 20;
const CARD_GAP = 12;
const PHOTO_W = Math.round((SCREEN_W - 32 - CARD_PADDING * 2 - CARD_GAP) / 2.1);
const PHOTO_H = Math.round(PHOTO_W * 1.4);

const PhotoCard = memo(function PhotoCard({
  photo,
  onPress,
}: {
  photo: ProfilePhoto;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.photoCard}
      onPress={onPress}
      accessibilityLabel={`View photo ${photo.order + 1}`}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: photo.uri }}
        style={styles.photoImage}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      {photo.isPrimary && (
        <View style={styles.primaryBadge}>
          <Ionicons name="star" size={10} color="#fff" />
          <Text style={styles.primaryBadgeText}>Primary</Text>
        </View>
      )}
    </Pressable>
  );
});

interface PhotoContentProps {
  photos: ProfilePhoto[];
}

export default function PhotoContent({ photos }: PhotoContentProps) {
  const { colors: th } = useTheme();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const { top, bottom } = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const sortedPhotos = [...photos].sort((a, b) => a.order - b.order);

  const openViewer = useCallback((index: number) => setViewerIndex(index), []);
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  const goToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, sortedPhotos.length - 1));
    setViewerIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated: true });
  }, [sortedPhotos.length]);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
        <Text style={[styles.heading, { color: th.text }]}>My Photos</Text>
        <Text style={[styles.subtext, { color: th.textSecondary }]}>
          {photos.length > 0
            ? `${photos.length} photo${photos.length > 1 ? 's' : ''}. Tap a photo to view full screen.`
            : 'No photos yet. Add photos from the edit profile screen.'}
        </Text>

        {sortedPhotos.length > 0 ? (
          <View style={styles.grid}>
            {sortedPhotos.map((photo, idx) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onPress={() => openViewer(idx)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={40} color={th.textMuted} />
            <Text style={[styles.emptyText, { color: th.textMuted }]}>
              No photos yet
            </Text>
          </View>
        )}
      </View>

      {/* Full-screen photo viewer modal */}
      <Modal
        visible={viewerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
      >
        <View style={styles.viewerOverlay}>
          {/* Header bar — close + counter, not overlapping FlatList */}
          <View style={[styles.viewerHeader, { paddingTop: top + 8 }]}>
            <View style={{ width: 40 }} />
            {viewerIndex !== null && sortedPhotos.length > 0 && (
              <Text style={styles.viewerCounterText}>
                {viewerIndex + 1} / {sortedPhotos.length}
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
              data={sortedPhotos}
              keyExtractor={(item) => item.id}
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
                    source={{ uri: item.uri }}
                    style={styles.viewerImage}
                    contentFit="contain"
                    transition={150}
                  />
                </View>
              )}
            />
          )}

          {/* Footer bar — chevrons + primary badge, not overlapping FlatList */}
          <View style={[styles.viewerFooter, { paddingBottom: bottom + 16 }]}>
            {/* Left chevron */}
            <Pressable
              style={[styles.viewerNavBtn, viewerIndex === null || viewerIndex <= 0 ? styles.viewerNavBtnDisabled : null]}
              onPress={() => viewerIndex !== null && viewerIndex > 0 && goToIndex(viewerIndex - 1)}
              disabled={viewerIndex === null || viewerIndex <= 0}
              accessibilityLabel="Previous photo"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={28} color={viewerIndex !== null && viewerIndex > 0 ? '#FFFFFFCC' : '#FFFFFF33'} />
            </Pressable>

            {/* Primary indicator */}
            {viewerIndex !== null && sortedPhotos[viewerIndex]?.isPrimary && (
              <View style={styles.viewerPrimaryBadge}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.viewerPrimaryText}>Primary Photo</Text>
              </View>
            )}

            {/* Right chevron */}
            <Pressable
              style={[styles.viewerNavBtn, viewerIndex === null || viewerIndex >= sortedPhotos.length - 1 ? styles.viewerNavBtnDisabled : null]}
              onPress={() => viewerIndex !== null && viewerIndex < sortedPhotos.length - 1 && goToIndex(viewerIndex + 1)}
              disabled={viewerIndex === null || viewerIndex >= sortedPhotos.length - 1}
              accessibilityLabel="Next photo"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-forward" size={28} color={viewerIndex !== null && viewerIndex < sortedPhotos.length - 1 ? '#FFFFFFCC' : '#FFFFFF33'} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9DDF8',
    padding: CARD_PADDING,
  },
  heading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B1340',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  photoCard: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.primary,
    gap: 3,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  // ─── Full-screen viewer styles ───
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  viewerNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerNavBtnDisabled: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  viewerPrimaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  viewerPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
