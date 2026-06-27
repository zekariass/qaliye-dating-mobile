import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import {
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { colors, radius, spacing } from '@/constants/theme';
import type { ActivityStatus } from '@/types/activity';

const SWIPE_THRESHOLD = 120;

export type CardDto = {
  user_id: string;
  display_name: string;
  age: number;
  distance_km: number | null;
  is_verified: boolean;
  relationship_intention: string;
  residency_type: string;
  city: string;
  country_name: string;
  photos: { image_url: string }[];
  // Extended profile fields (optional — populated for detail view)
  bio?: string;
  gender?: string;
  height_cm?: number;
  ethnicity?: string;
  nationality?: string;
  religion?: string;
  education_level?: string;
  occupation?: string;
  marital_status?: string;
  has_children?: boolean;
  wants_children?: boolean;
  smoking?: boolean;
  drinking?: boolean;
  prompt_answers?: { promptText: string; answerText: string }[];
  activity_status?: ActivityStatus;
};

export interface ProfileCardHandle {
  swipeOut: (direction: 'LIKE' | 'PASS') => void;
}

interface Props {
  card: CardDto;
  isTop: boolean;
  onSwipe: (direction: 'LIKE' | 'PASS') => void;
  animateIn?: 'LIKE' | 'PASS' | false;
}

const ProfileCard = forwardRef<ProfileCardHandle, Props>(
  function ProfileCard({ card, isTop, onSwipe, animateIn = false as const }, ref) {
  const { width } = useWindowDimensions();
  const CARD_W = width - 32;

  const [photoIndex, setPhotoIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Rewind entry: fly in from the side the card originally left from
  useEffect(() => {
    if (animateIn && isTop) {
      // LIKE swiped right → re-enter from right; PASS swiped left → re-enter from left
      translateX.value = animateIn === 'LIKE' ? 700 : -700;
      translateY.value = 0;
      translateX.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateIn]); // re-run if animateIn changes (handles batching race on mount)

  // Programmatic swipe for action buttons
  useImperativeHandle(ref, () => ({
    swipeOut(direction: 'LIKE' | 'PASS') {
      const target = direction === 'LIKE' ? 700 : -700;
      translateX.value = withTiming(target, { duration: 480 }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onSwipe, direction);
      });
    },
  }), [onSwipe]);

  const rotation = useDerivedValue(() => `${translateX.value / 22}deg`);
  const likeOpacity = useDerivedValue(() =>
    Math.max(0, Math.min(1, translateX.value / SWIPE_THRESHOLD))
  );
  const passOpacity = useDerivedValue(() =>
    Math.max(0, Math.min(1, -translateX.value / SWIPE_THRESHOLD))
  );

  const safePhotos = card.photos ?? [];

  const cyclePhoto = useCallback(() => {
    if (safePhotos.length === 0) return;
    setPhotoIndex((i) => (i + 1) % safePhotos.length);
  }, [safePhotos.length]);

  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .activeOffsetX([-14, 14])   // only activate on clear horizontal movement
    .failOffsetY([-20, 20])     // yield to vertical scroll when scroll-dominant
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const direction = e.translationX > 0 ? 'LIKE' : 'PASS';
        translateX.value = withTiming(direction === 'LIKE' ? 600 : -600, { duration: 280 });
        scheduleOnRN(onSwipe, direction);
      } else {
        translateX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
        translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
      }
    });

  const tapGesture = Gesture.Tap()
    .enabled(isTop)
    .runOnJS(true)
    .onEnd(() => {
      cyclePhoto();
    });

  const gesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: rotation.value },
    ],
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: likeOpacity.value,
    transform: [{ rotateZ: '-20deg' }],
  }));

  const passStampStyle = useAnimatedStyle(() => ({
    opacity: passOpacity.value,
    transform: [{ rotateZ: '20deg' }],
  }));

  const locationText = (() => {
    const parts = [card.city, card.country_name].filter(Boolean);
    const place = parts.length > 0 ? parts.join(', ') : card.residency_type;
    if (card.distance_km != null && card.distance_km > 0) {
      return `${place} · ${card.distance_km} km`;
    }
    return place;
  })();

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.swipeWrap, animatedStyle]}>
        <View style={styles.imageCard}>
          {/* Photo */}
          {safePhotos.length > 0 ? (
            <Image
              source={{ uri: safePhotos[photoIndex]?.image_url }}
              style={styles.photo}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              accessibilityLabel={`Profile photo of ${card.display_name}`}
            />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={64} color="#FFFFFF" />
            </View>
          )}

          {/* Photo dots — top right */}
          <View style={styles.dotsRow}>
            {safePhotos.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === photoIndex ? styles.dotActive : styles.dotInactive]}
              />
            ))}
          </View>

          {/* Swipe stamps */}
          <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
            <Text style={styles.likeStampText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.passStamp, passStampStyle]}>
            <Text style={styles.passStampText}>PASS</Text>
          </Animated.View>

          {/* Profile info overlay — bottom left */}
          <View style={styles.infoBox}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{card.display_name}</Text>
              {card.is_verified && (
                <View style={styles.badgeWrap}>
                  <VerifiedBadge size={20} />
                </View>
              )}
              <Text style={styles.age}>{card.age}</Text>
              {card.activity_status && card.activity_status !== 'HIDDEN' && card.activity_status !== 'OFFLINE' && (
                <ActivityStatusIndicator
                  status={card.activity_status}
                  size={10}
                  style={styles.statusDot}
                />
              )}
            </View>
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.distance}>{locationText}</Text>
            </View>
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{card.relationship_intention}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

export default ProfileCard;

const styles = StyleSheet.create({
  swipeWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  imageCard: {
    flex: 1,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: colors.backgroundLavender,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  photo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLavender,
  },
  dotsRow: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  stamp: {
    position: 'absolute',
    top: '18%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 3,
    borderRadius: radius.sm,
  },
  likeStamp: {
    left: spacing.lg,
    borderColor: colors.primary,
  },
  likeStampText: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 2,
  },
  passStamp: {
    right: spacing.lg,
    borderColor: colors.danger,
  },
  passStampText: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.danger,
    letterSpacing: 2,
  },
  infoBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  badgeWrap: {
    marginBottom: 2,
  },
  age: {
    fontSize: 30,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  distance: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  pillRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.70)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pillText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  statusDot: {
    marginBottom: 2,
  },
});
