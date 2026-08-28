import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { colors, spacing } from '@/constants/theme';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import type { ActivityStatus } from '@/types/activity';
import { formatDistance } from '@/utils/formatDistance';
import { getSwipeCardWidth, rs, useTabletScale } from '@/utils/responsive';

const SWIPE_THRESHOLD = 120;

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  ethnicities?: import('@/types/catalog').EthnicityOption[];
  ethnicityOtherText?: string | null;
  languages?: import('@/types/catalog').LanguageOption[];
  nationality?: string;
  religion?: string;
  education_level?: string;
  occupation?: string;
  marital_status?: string;
  has_children?: boolean;
  wants_children?: boolean;
  smoking?: boolean;
  drinking?: boolean;
  smoking_detail?: string | null;
  drinking_detail?: string | null;
  activity_level?: string | null;
  interests?: string[];
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
  const isTablet = width >= 500;
  const tabletCardW = isTablet ? getSwipeCardWidth(width) : undefined;
  const scale = useTabletScale();
  const { data: myProfile } = useCurrentProfile();
  const myCountry = myProfile?.address?.country_name ?? '';

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

  // Swipe-direction border: transparent → green (LIKE) or red (PASS), proportional to swipe progress
  const borderStyle = useAnimatedStyle(() => {
    const x = translateX.value;
    const borderColor = interpolateColor(
      x,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      ['#FF3B30', 'transparent', colors.primary],
    );
    const borderWidth = Math.max(0, Math.min(4, Math.abs(x) / SWIPE_THRESHOLD * 4));
    return { borderColor, borderWidth };
  });

  const locationText = (() => {
    const sameCountry = myCountry !== '' && card.country_name === myCountry;
    const place = sameCountry
      ? (card.city ?? card.residency_type)
      : (card.country_name ?? card.residency_type);
    if (card.distance_km != null && card.distance_km > 0) {
      return `${place} · ${formatDistance(card.distance_km)}`;
    }
    return place;
  })();

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.swipeWrap, animatedStyle]}>
        <Animated.View style={[styles.imageCard, isTablet && { width: tabletCardW, alignSelf: 'center' as const }, borderStyle]}>
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

          {/* Bottom gradient shadow for text readability */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.90)', 'rgba(0,0,0,0.88)']}
            locations={[0, 0.6, 1]}
            style={styles.bottomGradient}
          />

          {/* Photo thumbnails — top edge */}
          {safePhotos.length > 1 && (
            <View style={styles.barsRow}>
              {safePhotos.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.thumb,
                    i === photoIndex ? styles.thumbActive : styles.thumbInactive,
                  ]}
                >
                  <Image
                    source={{ uri: p.image_url }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </View>
              ))}
            </View>
          )}

          {/* Swipe stamps — Tinder-style icons */}
          <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]}>
            <Ionicons name="heart" size={100} color={colors.primary} />
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.passStamp, passStampStyle]}>
            <Ionicons name="close" size={110} color="#FF3B30" />
          </Animated.View>

          {/* Profile info overlay — bottom left */}
          <View style={styles.infoBox}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { fontSize: rs(32, scale) }]}>{card.display_name}</Text>
              <Text style={[styles.nameSeparator, { fontSize: rs(28, scale) }]}>·</Text>
              <Text style={[styles.age, { fontSize: rs(28, scale) }]}>{card.age}</Text>
              {card.activity_status && card.activity_status !== 'HIDDEN' && card.activity_status !== 'OFFLINE' && (
                <ActivityStatusIndicator
                  status={card.activity_status}
                  showLabel
                  size={rs(10, scale)}
                  labelFontSize={rs(13, scale)}
                  style={styles.statusDot}
                />
              )}
            </View>
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={rs(14, scale)} color="rgba(255,255,255,0.85)" />
              <Text style={[styles.distance, { fontSize: rs(14, scale) }]}>{locationText}</Text>
            </View>
            {(() => {
              const intention = card.relationship_intention
                ? toTitleCase(card.relationship_intention)
                : null;
              const religion = card.religion ? toTitleCase(card.religion) : null;
              const occupation = card.occupation?.trim() ? card.occupation.trim() : null;
              if (!intention && !religion && !occupation) return null;
              return (
                <View style={styles.intentionChip}>
                  {intention && (
                    <View style={styles.intentionSegment}>
                      <Ionicons name="heart" size={rs(13, scale)} color="#FF8FAB" />
                      <Text style={[styles.intentionValue, { fontSize: rs(13, scale) }]}>
                        {intention}
                      </Text>
                    </View>
                  )}
                  {intention && religion && <View style={styles.intentionDivider} />}
                  {religion && (
                    <View style={styles.intentionSegment}>
                      <MaterialCommunityIcons name="hands-pray" size={rs(13, scale)} color={colors.warning} />
                      <Text style={[styles.intentionValue, { fontSize: rs(13, scale) }]}>
                        {religion}
                      </Text>
                    </View>
                  )}
                  {(intention || religion) && occupation && <View style={styles.intentionDivider} />}
                  {occupation && (
                    <View style={styles.intentionSegment}>
                      <Ionicons name="briefcase-outline" size={rs(13, scale)} color="#9CA3AF" />
                      <Text style={[styles.intentionValue, { fontSize: rs(13, scale) }]}>
                        {occupation}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>

          {/* Verified — bottom right of photo */}
          {card.is_verified && (
            <View style={styles.verifiedRow}>
              <VerifiedBadge pill dark />
            </View>
          )}
        </Animated.View>
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
    borderColor: 'transparent',
    borderWidth: 0,
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
  barsRow: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: 6,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  thumbInactive: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    opacity: 0.6,
  },
  stamp: {
    position: 'absolute',
    top: '18%',
  },
  likeStamp: {
    left: spacing.lg,
  },
  passStamp: {
    right: spacing.lg,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 250,
    zIndex: 1,
  },
  infoBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg + 6,
    paddingTop: spacing.xl,
    gap: 6,
    zIndex: 2,
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
  verifiedRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 3,
  },
  age: {
    fontSize: 28,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  nameSeparator: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
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
  intentionChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
  },
  intentionSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  intentionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.2,
  },
  intentionDivider: {
    width: 1,
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderRadius: 1,
  },
  intentionValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // keep for any external reference
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
