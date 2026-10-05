import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import BrowseProfileDetailSheet from '@/components/discovery/BrowseProfileDetailSheet';
import LikeVariantButtons, {
    FALLBACK_VARIANT,
    VariantIcon,
} from '@/components/discovery/LikeVariantButtons';
import { CardDto } from '@/components/discovery/ProfileCard';
import TopLeftActionButtons from '@/components/discovery/TopLeftActionButtons';
import { colors, radius, spacing } from '@/constants/theme';
import { mapProfileToCard } from '@/hooks/discovery/useDiscoveryProfiles';
import { useRewind } from '@/hooks/discovery/useRewind';
import { useSwipeAction } from '@/hooks/discovery/useSwipeAction';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityStatus } from '@/types/activity';
import type { LikeActionVariantDto, SwipeActionResponse } from '@/types/discovery';
import { formatDistance } from '@/utils/formatDistance';
import { LOW_REMAINING_THRESHOLD, likeVariantResetHint } from '@/utils/likeVariants';
import { rs, useTabletScale } from '@/utils/responsive';

const TABLET_BREAK = 500;

interface BrowseItem {
  user_id: string;
  display_name: string;
  age: number;
  distance_km: number | null;
  is_verified: boolean;
  city: string;
  country_name: string;
  photos: string[];
  relationship_intention: string;
  religion?: string;
  occupation?: string;
  bio?: string;
  activity_status?: ActivityStatus;
}

function mapCardToBrowseItem(card: CardDto): BrowseItem {
  return {
    user_id: card.user_id,
    display_name: card.display_name,
    age: card.age,
    distance_km: card.distance_km,
    is_verified: card.is_verified,
    city: card.city,
    country_name: card.country_name,
    photos: (card.photos ?? []).map((p) => p.image_url).filter(Boolean),
    relationship_intention: card.relationship_intention,
    religion: card.religion,
    occupation: card.occupation,
    bio: card.bio,
    activity_status: card.activity_status,
  };
}

function formatIntention(value: string): string {
  if (!value) return '';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Skeleton card ─────────────────────────────────────────────────────────
function SkeletonCard({ themeBg }: { themeBg: string }) {
  return (
    <View style={[styles.card, { backgroundColor: themeBg }]}>
      <View style={styles.skeletonPhoto} />
      <View style={styles.skeletonInfo}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    </View>
  );
}

// ── Profile card ──────────────────────────────────────────────────────────
function BrowseProfileCard({
  item,
  onPress,
  onLikeVariant,
  onPass,
  onSuperMessage,
  onRewind,
  canRewind,
  likeVariants,
  cardBg,
  borderColor,
  textColor,
  isActing,
  onBoost,
  boostActive,
  boostLoading,
  onSwitchToSwipe,
}: {
  item: BrowseItem;
  onPress: (userId: string) => void;
  onLikeVariant: (userId: string, variantCode: string) => void;
  onPass: (userId: string) => void;
  onSuperMessage: (userId: string) => void;
  onRewind: () => void;
  canRewind: boolean;
  likeVariants: LikeActionVariantDto[];
  cardBg: string;
  borderColor: string;
  textColor: string;
  isActing: boolean;
  onBoost?: () => void;
  boostActive?: boolean;
  boostLoading?: boolean;
  onSwitchToSwipe: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { data: myProfile } = useCurrentProfile();
  const myCountry = myProfile?.address?.country_name ?? '';
  const { width: screenW } = useWindowDimensions();
  const isTablet = screenW >= TABLET_BREAK;
  const CARD_W = isTablet ? Math.round(screenW * 0.9) : (screenW - spacing.md * 2);
  const CARD_H = CARD_W * 1.1;
  const scale = useTabletScale();

  const translateX = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const stampOpacity = useSharedValue(0);
  const burstScale = useSharedValue(0);
  const burstOpacity = useSharedValue(0);
  const burstIsSuper = useSharedValue(0);
  const [animating, setAnimating] = useState(false);
  const [showVariantInfo, setShowVariantInfo] = useState(false);
  const [infoH, setInfoH] = useState(0);
  const [burstVariant, setBurstVariant] = useState<LikeActionVariantDto | null>(null);
  const actionType = useSharedValue<'none' | 'pass' | 'like' | 'super_like'>('none');
  const variantList = likeVariants.length > 0 ? likeVariants : [FALLBACK_VARIANT];

  const photos = item.photos;
  const [photoIndex, setPhotoIndex] = useState(0);
  const photoIndexSV = useSharedValue(0);
  const dragX = useSharedValue(0);
  const SNAP_THRESHOLD = Math.max(60, CARD_W * 0.2);

  // Reset photo index when the item (user) changes
  useEffect(() => {
    setPhotoIndex(0);
    photoIndexSV.value = 0;
    dragX.value = 0;
  }, [item.user_id]);

  const photoPanGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      const atStart = photoIndexSV.value <= 0;
      const atEnd = photoIndexSV.value >= photos.length - 1;
      const tx = e.translationX;
      // Rubber-band resistance at the edges so the photo can't be dragged past the first/last
      if ((tx > 0 && atStart) || (tx < 0 && atEnd)) {
        dragX.value = tx * 0.35;
      } else {
        dragX.value = tx;
      }
    })
    .onEnd((e) => {
      const tx = e.translationX;
      const velocity = e.velocityX;
      const canNext = photoIndexSV.value < photos.length - 1;
      const canPrev = photoIndexSV.value > 0;
      const goNext = canNext && (tx < -SNAP_THRESHOLD || velocity < -500);
      const goPrev = canPrev && (tx > SNAP_THRESHOLD || velocity > 500);

      if (goNext) {
        dragX.value = withTiming(-CARD_W, { duration: 220, easing: Easing.out(Easing.cubic) }, () => {
          photoIndexSV.value = photoIndexSV.value + 1;
          dragX.value = 0;
          runOnJS(setPhotoIndex)(photoIndexSV.value);
        });
      } else if (goPrev) {
        dragX.value = withTiming(CARD_W, { duration: 220, easing: Easing.out(Easing.cubic) }, () => {
          photoIndexSV.value = photoIndexSV.value - 1;
          dragX.value = 0;
          runOnJS(setPhotoIndex)(photoIndexSV.value);
        });
      } else {
        dragX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
    });

  const photoTapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      onPress(item.user_id);
    });

  const photoGesture = Gesture.Race(photoPanGesture, photoTapGesture);

  const locationText = useMemo(() => {
    const sameCountry = myCountry !== '' && item.country_name === myCountry;
    const place = sameCountry
      ? item.city
      : item.country_name;
    return place ?? '';
  }, [item.city, item.country_name, myCountry]);

  const animateAndAction = useCallback(
    (action: 'pass' | 'like' | 'super_like', fn: () => void) => {
      if (animating) return;
      setAnimating(true);
      actionType.value = action;

      // Like / super-like: show a big centered 🌹/💍 burst for ~1s first.
      const showBurst = action !== 'pass';
      const hold = showBurst ? 850 : 0;

      if (showBurst) {
        burstIsSuper.value = action === 'super_like' ? 1 : 0;
        burstScale.value = 0;
        burstScale.value = withSequence(
          withSpring(1, { damping: 9, stiffness: 300, mass: 0.7 }),
          withDelay(750, withTiming(1.45, { duration: 300, easing: Easing.out(Easing.cubic) })),
        );
        burstOpacity.value = withSequence(
          withTiming(1, { duration: 150 }),
          withDelay(850, withTiming(0, { duration: 350 })),
        );
      }

      // Show stamp, then slide card off screen
      stampOpacity.value = withDelay(hold, withTiming(1, { duration: 250 }));
      const targetX = action === 'pass' ? -screenW - 60 : screenW + 60;
      setTimeout(() => {
        translateX.value = withTiming(targetX, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        });
        cardOpacity.value = withTiming(0, { duration: 600 });
      }, hold + 250);

      // After animation completes, call the action callback
      setTimeout(() => {
        runOnJS(setAnimating)(false);
        fn();
      }, hold + 250 + 620);
    },
    [animating, stampOpacity, translateX, cardOpacity, actionType, burstScale, burstOpacity, burstIsSuper, screenW],
  );

  const handlePass = useCallback(() => {
    animateAndAction('pass', () => onPass(item.user_id));
  }, [animateAndAction, onPass, item.user_id]);

  const handleLikeVariant = useCallback(
    (variantCode: string) => {
      setBurstVariant(variantList.find((v) => v.code === variantCode) ?? FALLBACK_VARIANT);
      animateAndAction('like', () => onLikeVariant(item.user_id, variantCode));
    },
    [animateAndAction, onLikeVariant, item.user_id, variantList],
  );

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: cardOpacity.value,
  }));

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -photoIndexSV.value * CARD_W + dragX.value }],
  }));

  const likeStampStyle = useAnimatedStyle(() => ({
    opacity: actionType.value === 'like' ? stampOpacity.value : 0,
    transform: [{ rotateZ: '-20deg' }],
  }));

  const passStampStyle = useAnimatedStyle(() => ({
    opacity: actionType.value === 'pass' ? stampOpacity.value : 0,
    transform: [{ rotateZ: '20deg' }],
  }));

  const superLikeStampStyle = useAnimatedStyle(() => ({
    opacity: actionType.value === 'super_like' ? stampOpacity.value : 0,
    transform: [{ rotateZ: '-15deg' }],
  }));

  const likeBurstStyle = useAnimatedStyle(() => ({
    opacity: burstIsSuper.value === 0 ? burstOpacity.value : 0,
    transform: [{ scale: burstScale.value }, { rotateZ: '-10deg' }],
  }));
  const superBurstStyle = useAnimatedStyle(() => ({
    opacity: burstIsSuper.value === 1 ? burstOpacity.value : 0,
    transform: [{ scale: burstScale.value }, { rotateZ: '-10deg' }],
  }));

  return (
    <Animated.View style={[styles.card, { width: CARD_W, backgroundColor: cardBg }, cardAnimatedStyle]}>
      {/* Photo — tap to view profile, swipe horizontally to browse photos */}
      <View>
      <GestureDetector gesture={photoGesture}>
        <Animated.View
          accessibilityLabel={t('discovery.viewProfile', { name: item.display_name })}
          accessibilityRole="button"
        >
          <View style={[styles.photoWrap, { height: CARD_H }]}>
            <Animated.View
              style={[styles.photoTrack, { width: Math.max(1, photos.length) * CARD_W }, trackStyle]}
            >
              {photos.length > 0 ? (
                photos.map((uri, i) => (
                  <View key={i} style={[styles.photo, { width: CARD_W }]}>
                    <Image
                      source={{ uri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  </View>
                ))
              ) : (
                <View style={[styles.photo, { width: CARD_W }, styles.photoPlaceholder]}>
                  <Ionicons name="person" size={48} color={colors.primaryLight} />
                </View>
              )}
            </Animated.View>

            {/* Gradient overlay for text readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.80)']}
              locations={[0.35, 1]}
              style={styles.photoOverlay}
            />

            {/* Photo thumbnails — top right corner */}
            {photos.length > 1 && (
              <View style={styles.photoDotsWrap}>
                {photos.map((uri, i) => (
                  <View
                    key={i}
                    style={[
                      styles.thumb,
                      i === photoIndex ? styles.thumbActive : styles.thumbInactive,
                    ]}
                  >
                    <Image
                      source={{ uri }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Verified badge — top left corner */}
            {item.is_verified && (
              <View style={styles.verifiedBadgeWrap}>
                <VerifiedBadge pill dark />
              </View>
            )}
          </View>

          {/* Action stamps — LIKE / PASS / SUPER LIKE */}
          <Animated.View style={[styles.stamp, styles.likeStamp, likeStampStyle]} pointerEvents="none">
            {burstVariant ? (
              <VariantIcon variant={burstVariant} size={rs(90, scale)} color={colors.heartPink} />
            ) : (
              <Text style={{ fontSize: 90 }}>🌹</Text>
            )}
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.passStamp, passStampStyle]} pointerEvents="none">
            <Ionicons name="close" size={110} color="#FF3B30" />
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.superLikeStamp, superLikeStampStyle]} pointerEvents="none">
            <Text style={styles.superLikeStampText}>{t('discovery.superLikeStamp')}</Text>
          </Animated.View>

          {/* Like / super-like burst — big icon centered on the photo */}
          <Animated.View style={[styles.burstWrap, likeBurstStyle]} pointerEvents="none">
            {burstVariant ? (
              <VariantIcon variant={burstVariant} size={rs(110, scale)} color={colors.heartPink} />
            ) : (
              <Text style={styles.burstEmoji}>🌹</Text>
            )}
          </Animated.View>
          <Animated.View style={[styles.burstWrap, superBurstStyle]} pointerEvents="none">
            <Text style={styles.burstEmoji}>💍</Text>
          </Animated.View>

          {/* Name + age + location — bottom of photo */}
          <View
            style={styles.cardInfo}
            onLayout={(e) => setInfoH(e.nativeEvent.layout.height)}
          >
            <Text style={[styles.cardName, { fontSize: rs(22, scale) }]} numberOfLines={1}>
              {item.display_name}
              <Text style={[styles.cardAge, { fontSize: rs(18, scale) }]}>  · {item.age}</Text>
            </Text>
            {locationText ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={rs(11, scale)} color="rgba(255,255,255,0.85)" />
                <Text style={[styles.locationText, { fontSize: rs(12, scale) }]} numberOfLines={1}>
                  {locationText}
                  {item.distance_km != null && item.distance_km > 0
                    ? `  ·  ${formatDistance(item.distance_km)}`
                    : ''}
                </Text>
              </View>
            ) : null}
            {item.activity_status && item.activity_status !== 'HIDDEN' && item.activity_status !== 'OFFLINE' && (
              <ActivityStatusIndicator
                status={item.activity_status}
                showLabel
                size={rs(10, scale)}
                labelFontSize={rs(13, scale)}
              />
            )}
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Right-edge rail — pass / rewind / super message, same controls as
          swipe mode's left rail. Kept outside the photo gesture so taps don't
          trigger photo paging or the profile tap. */}
      <View
        style={[styles.sideActions, { paddingBottom: infoH + 6 }]}
        pointerEvents="box-none"
      >
        <TopLeftActionButtons
          onPass={handlePass}
          onRewind={onRewind}
          onBoost={onBoost}
          boostActive={boostActive}
          boostLoading={boostLoading}
          onSuperMessage={() => onSuperMessage(item.user_id)}
          disabled={animating || isActing}
          rewindDisabled={!canRewind}
        />
      </View>

      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        {/* Bio */}
        {item.bio ? (
          <Text style={[styles.bioText, { color: textColor }]} numberOfLines={2}>
            {item.bio}
          </Text>
        ) : null}

        {/* Intention + Religion + Occupation chip */}
        {(item.relationship_intention || item.religion || item.occupation) && (
          <View style={styles.intentionRow}>
            {item.relationship_intention ? (
              <View style={[styles.intentionChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.07)' }]}>
                <View style={styles.intentionSegment}>
                  <Ionicons name="heart" size={rs(13, scale)} color="#FF8FAB" />
                  <Text style={[styles.intentionValue, { color: isDark ? '#FFFFFF' : th.text, fontSize: rs(13, scale) }]}>
                    {formatIntention(item.relationship_intention)}
                  </Text>
                </View>
                {item.religion ? (
                  <>
                    <View style={[styles.intentionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.15)' }]} />
                    <View style={styles.intentionSegment}>
                      <MaterialCommunityIcons name="hands-pray" size={rs(13, scale)} color={colors.warning} />
                      <Text style={[styles.intentionValue, { color: isDark ? '#FFFFFF' : th.text, fontSize: rs(13, scale) }]}>
                        {formatIntention(item.religion)}
                      </Text>
                    </View>
                  </>
                ) : null}
                {item.occupation ? (
                  <>
                    <View style={[styles.intentionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.15)' }]} />
                    <View style={styles.intentionSegment}>
                      <Ionicons name="briefcase-outline" size={rs(13, scale)} color={isDark ? '#FFFFFF' : th.textSecondary} />
                      <Text style={[styles.intentionValue, { color: isDark ? '#FFFFFF' : th.text, fontSize: rs(13, scale) }]}>
                        {item.occupation}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : item.religion ? (
              <View style={[styles.intentionChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.07)' }]}>
                <View style={styles.intentionSegment}>
                  <MaterialCommunityIcons name="hands-pray" size={rs(13, scale)} color={colors.warning} />
                  <Text style={[styles.intentionValue, { color: isDark ? '#FFFFFF' : th.text, fontSize: rs(13, scale) }]}>
                    {formatIntention(item.religion)}
                  </Text>
                </View>
                {item.occupation ? (
                  <>
                    <View style={[styles.intentionDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.15)' }]} />
                    <View style={styles.intentionSegment}>
                      <Ionicons name="briefcase-outline" size={rs(13, scale)} color={isDark ? '#FFFFFF' : th.textSecondary} />
                      <Text style={[styles.intentionValue, { color: isDark ? '#FFFFFF' : th.text, fontSize: rs(13, scale) }]}>
                        {item.occupation}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : item.occupation ? (
              <View style={[styles.intentionChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.07)' }]}>
                <View style={styles.intentionSegment}>
                  <Ionicons name="briefcase-outline" size={rs(13, scale)} color={isDark ? '#FFFFFF' : th.textSecondary} />
                  <Text style={[styles.intentionValue, { color: isDark ? '#FFFFFF' : th.text, fontSize: rs(13, scale) }]}>
                    {item.occupation}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Like action buttons — same variants as swipe mode, laid out
          horizontally. Pass / rewind / super message live on the photo rail. */}
      <View style={[styles.actionRow, { borderColor }]}>
        <LikeVariantButtons
          variants={variantList}
          onSelect={handleLikeVariant}
          disabled={animating || isActing}
          horizontal
        />

        {/* What each like means — expands the descriptions panel */}
        <TouchableOpacity
          style={[
            styles.variantInfoBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)' },
          ]}
          onPress={() => setShowVariantInfo((v) => !v)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('discovery.showLikeDescriptions')}
          accessibilityState={{ expanded: showVariantInfo }}
        >
          <Ionicons
            name={showVariantInfo ? 'chevron-up' : 'chevron-down'}
            size={rs(15, scale)}
            color={th.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Variant descriptions — the browse-mode equivalent of swipe mode's
          drag-out drawer, toggled by the ? button above. */}
      {showVariantInfo && (
        <View style={[styles.variantInfoPanel, { borderTopColor: borderColor }]}>
          {variantList.map((variant) => (
            <View key={variant.code} style={styles.variantInfoRow}>
              <VariantIcon variant={variant} size={rs(26, scale)} />
              <View style={styles.variantInfoTextCol}>
                <Text style={[styles.variantInfoName, { color: textColor, fontSize: rs(13.5, scale) }]} numberOfLines={1}>
                  {variant.name}
                  {variant.credits > 0 && (
                    <Text style={[styles.variantInfoCost, { fontSize: rs(11.5, scale) }]}>
                      {` · ${t('discovery.creditCount', { count: variant.credits })}`}
                    </Text>
                  )}
                  {variant.blocked ? (
                    <Text style={[styles.variantInfoLimit, { fontSize: rs(11.5, scale) }]}>
                      {` · ${likeVariantResetHint(variant)}`}
                    </Text>
                  ) : variant.remaining != null && variant.remaining <= LOW_REMAINING_THRESHOLD ? (
                    <Text style={[styles.variantInfoLimit, { fontSize: rs(11.5, scale) }]}>
                      {` · ${t('discovery.remainingLeft', { count: variant.remaining })}`}
                    </Text>
                  ) : null}
                </Text>
                {variant.description ? (
                  <Text style={[styles.variantInfoDesc, { color: th.textSecondary, fontSize: rs(12, scale) }]}>
                    {variant.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

// ── Main component ────────────────────────────────────────────────────────
interface Props {
  cards: CardDto[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  onSwitchToSwipe: () => void;
  onMatch?: (response: SwipeActionResponse) => void;
  onRewind: () => void;
  canRewind: boolean;
  /** Configurable LIKE action variants — same list as the swipe-mode rail. */
  likeVariants: LikeActionVariantDto[];
  swipedIds: Set<string>;
  onCardAction: (userId: string, swiped: boolean, card?: CardDto) => void;
  onSuperMessage?: (userId: string, displayName: string, photoUrl: string | null) => void;
  /** Called after a successful Like or Super Like. Passes true when the action
   *  produced a match so the caller can suppress overlapping prompts. */
  onLikeSuccess?: (isMatch: boolean) => void;
  /** Card-rail boost control — omitted while incognito. */
  onBoost?: () => void;
  boostActive?: boolean;
  boostLoading?: boolean;
}

export default function BrowseModeGrid({
  cards,
  isLoading,
  isError,
  onRefresh,
  isRefreshing,
  onSwitchToSwipe,
  onMatch,
  onRewind,
  canRewind,
  likeVariants,
  swipedIds,
  onCardAction,
  onSuperMessage,
  onLikeSuccess,
  onBoost,
  boostActive,
  boostLoading,
}: Props) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { mutateAsync: swipeAction, isPending: isSwiping } = useSwipeAction();
  const rewindMutation = useRewind();

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const lastHiddenRef = useRef<{ userId: string; card: CardDto } | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardDto | null>(null);
  const [restoredCards, setRestoredCards] = useState<CardDto[]>([]);
  const [isRewinding, setIsRewinding] = useState(false);

  const allItems = useMemo(() => cards.map(mapCardToBrowseItem), [cards]);
  const restoredItems = useMemo(
    () => restoredCards.map(mapCardToBrowseItem),
    [restoredCards],
  );
  const items = useMemo(() => {
    // Restored cards first, then original cards minus hidden and swiped
    const restored = restoredItems.filter((it) => !hiddenIds.has(it.user_id) && !swipedIds.has(it.user_id));
    const original = allItems.filter((it) => !hiddenIds.has(it.user_id) && !swipedIds.has(it.user_id));
    // Avoid duplicates: skip original items already in restored
    const restoredIds = new Set(restored.map((it) => it.user_id));
    const combined = [...restored, ...original.filter((it) => !restoredIds.has(it.user_id))];
    // Final safety net: deduplicate by user_id (preserving first occurrence)
    const seen = new Set<string>();
    return combined.filter((it) => {
      if (seen.has(it.user_id)) return false;
      seen.add(it.user_id);
      return true;
    });
  }, [allItems, restoredItems, hiddenIds, swipedIds]);

  // Map userId back to full CardDto for the detail sheet
  const cardMap = useMemo(() => {
    const m = new Map<string, CardDto>();
    cards.forEach((c) => m.set(c.user_id, c));
    restoredCards.forEach((c) => m.set(c.user_id, c));
    return m;
  }, [cards, restoredCards]);

  const handlePress = useCallback(
    (userId: string) => {
      const card = cardMap.get(userId);
      if (card) {
        setSelectedCard(card);
        setSheetVisible(true);
      }
    },
    [cardMap],
  );

  const handleCloseSheet = useCallback(() => {
    setSheetVisible(false);
    setSelectedCard(null);
  }, []);

  const handleSwipe = useCallback(
    async (type: 'LIKE' | 'PASS' | 'SUPER_LIKE', userId: string, actionVariantCode?: string) => {
      const card = cardMap.get(userId);
      if (card) {
        lastHiddenRef.current = { userId, card };
      }
      setHiddenIds((prev) => new Set(prev).add(userId));
      onCardAction(userId, true);
      // If sheet is open, delay closing so confirmation message is visible
      if (sheetVisible) {
        setTimeout(() => setSheetVisible(false), 1200);
      } else {
        setSheetVisible(false);
      }
      try {
        const response = await swipeAction({ type, targetUserId: userId, actionVariantCode });
        if (type === 'LIKE' || type === 'SUPER_LIKE') {
          if (response.is_match && onMatch) {
            onMatch(response);
          }
          onLikeSuccess?.(!!response.is_match);
        }
      } catch (e) {
        // On error, restore the card so the user can retry
        lastHiddenRef.current = null;
        onCardAction(userId, false);
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
        // Insufficient-credit errors are handled globally by the interceptor
      }
    },
    [swipeAction, onMatch, onLikeSuccess, cardMap, onCardAction, sheetVisible],
  );

  // ── Rewind: call API, show spinner, prepend restored card ──
  const handleBrowseRewind = useCallback(async () => {
    if (isRewinding || !canRewind) return;
    setIsRewinding(true);
    setSheetVisible(false);
    try {
      const response = await rewindMutation.mutateAsync(undefined);
      const res = response as any;
      const rawProfile = res.restoredProfile ?? res.restored_profile;
      const restoredCard: CardDto | null = rawProfile
        ? mapProfileToCard(rawProfile)
        : lastHiddenRef.current?.card ?? null;

      if (restoredCard) {
        // Remove from hiddenIds if present
        setHiddenIds((prev) => {
          if (!prev.has(restoredCard.user_id)) return prev;
          const next = new Set(prev);
          next.delete(restoredCard.user_id);
          return next;
        });
        // Remove from parent swipedIds so it shows in swipe mode too
        onCardAction(restoredCard.user_id, false, restoredCard);
        // Prepend to restored cards (avoid duplicates)
        setRestoredCards((prev) => {
          if (prev.some((c) => c.user_id === restoredCard.user_id)) return prev;
          return [restoredCard, ...prev];
        });
      }
      lastHiddenRef.current = null;
      // Notify parent so swipe mode state stays consistent
      onRewind();
    } catch {
      // Error — just hide spinner, parent handles quota errors
      onRewind();
    } finally {
      setIsRewinding(false);
    }
  }, [isRewinding, canRewind, rewindMutation, onRewind, onCardAction]);

  const handleLikeVariant = useCallback(
    (userId: string, variantCode: string) => handleSwipe('LIKE', userId, variantCode),
    [handleSwipe],
  );
  const handlePass = useCallback(
    (userId: string) => handleSwipe('PASS', userId),
    [handleSwipe],
  );

  const handleSuperMessage = useCallback(
    (userId: string) => {
      const card = cardMap.get(userId);
      if (card && onSuperMessage) {
        onSuperMessage(userId, card.display_name, card.photos?.[0]?.image_url ?? null);
      }
    },
    [cardMap, onSuperMessage],
  );

  const cardBg = isDark ? th.backgroundElement : th.surface;
  const skeletonBg = isDark ? th.backgroundElement : colors.backgroundLavender;

  // ── Loading state ──
  if (isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        <FlatList
          data={Array.from({ length: 4 })}
          keyExtractor={(_, i) => `skeleton-${i}`}
          contentContainerStyle={styles.listContent}
          scrollEnabled={false}
          renderItem={() => <SkeletonCard themeBg={skeletonBg} />}
        />
      </View>
    );
  }

  // ── Error state ──
  if (isError && items.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <View style={[styles.stateIconCircle, { backgroundColor: skeletonBg }]}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
        </View>
        <Text style={[styles.stateTitle, { color: th.text }]}>{t('common.somethingWentWrong')}</Text>
        <Text style={[styles.stateSubtitle, { color: th.textSecondary }]}>
          {t('discovery.checkConnectionRetry')}
        </Text>
        <TouchableOpacity style={styles.stateBtn} activeOpacity={0.85} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.stateBtnText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty state ──
  if (!isLoading && !isError && items.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <View style={[styles.stateIconCircle, { backgroundColor: skeletonBg }]}>
          <Ionicons name="heart-dislike-outline" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.stateTitle, { color: th.text }]}>{t('discovery.noProfilesToBrowse')}</Text>
        <Text style={[styles.stateSubtitle, { color: th.textSecondary }]}>
          {t('discovery.noProfilesToBrowseHint')}
        </Text>
        <TouchableOpacity style={styles.stateBtn} activeOpacity={0.85} onPress={onSwitchToSwipe}>
          <Ionicons name="card-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.stateBtnText}>{t('discovery.backToSwipe')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Grid ──
  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListFooterComponent={
          isRefreshing && items.length > 0 ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <BrowseProfileCard
            item={item}
            onPress={handlePress}
            onLikeVariant={handleLikeVariant}
            onPass={handlePass}
            onSuperMessage={handleSuperMessage}
            onRewind={handleBrowseRewind}
            canRewind={canRewind}
            likeVariants={likeVariants}
            cardBg={cardBg}
            borderColor={th.border}
            textColor={th.text}
            isActing={isSwiping || isRewinding}
            onBoost={onBoost}
            boostActive={boostActive}
            boostLoading={boostLoading}
            onSwitchToSwipe={onSwitchToSwipe}
          />
        )}
      />

      {/* Rewind spinner overlay */}
      {isRewinding && (
        <View style={styles.rewindOverlay} pointerEvents="none">
          <View style={[styles.rewindSpinnerWrap, { backgroundColor: isDark ? th.backgroundElement : th.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.rewindSpinnerText, { color: th.textSecondary }]}>{t('discovery.gettingItBack')}</Text>
          </View>
        </View>
      )}

      {/* Detail sheet */}
      <BrowseProfileDetailSheet
        visible={sheetVisible}
        card={selectedCard}
        onClose={handleCloseSheet}
        onLikeVariant={handleLikeVariant}
        likeVariants={likeVariants}
        isActing={isSwiping || isRewinding}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingBottom: 100,
    gap: 14,
    alignItems: 'center',
  },

  // ── Rewind overlay ──
  rewindOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  rewindSpinnerWrap: {
    borderRadius: radius.lg,
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 12,
  },
  rewindSpinnerText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Card ──
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  photoWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  photoTrack: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
  photo: {
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLavender,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  photoDotsWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 3,
  },
  verifiedBadgeWrap: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 4,
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
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingBottom: 10,
    zIndex: 2,
  },
  cardName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardAge: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.80)',
    fontWeight: '600',
  },

  // ── Action stamps ──
  stamp: {
    position: 'absolute',
    top: '18%',
    zIndex: 5,
  },
  likeStamp: {
    left: spacing.lg,
  },
  passStamp: {
    right: spacing.lg,
  },
  superLikeStamp: {
    left: '50%',
    marginLeft: -80,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 3,
    borderRadius: radius.sm,
    borderColor: colors.primary,
  },
  superLikeStampText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 1,
  },
  burstWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
  },
  burstEmoji: {
    fontSize: 110,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 14,
  },


  // ── Info section (below photo) ──
  infoSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  intentionChip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  intentionSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  intentionDivider: {
    width: 1,
    height: 11,
    borderRadius: 1,
  },
  intentionValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Left-edge photo rail — bottom-anchored; paddingBottom (set inline from
  //    the measured cardInfo height) parks the buttons just above the name. ──
  sideActions: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 10,
    justifyContent: 'flex-end',
    zIndex: 5,
  },

  // ── Action buttons row ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  variantInfoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantInfoPanel: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  variantInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  variantInfoTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  variantInfoName: {
    fontWeight: '700',
  },
  variantInfoCost: {
    color: colors.warning,
    fontWeight: '700',
  },
  variantInfoLimit: {
    color: colors.secondary,
    fontWeight: '700',
  },
  variantInfoDesc: {
    lineHeight: 17,
  },


  // ── Skeleton ──
  skeletonPhoto: {
    width: '100%',
    height: 462,
    backgroundColor: 'rgba(138,44,255,0.08)',
  },
  skeletonInfo: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(138,44,255,0.12)',
  },

  // ── State (empty / error) ──
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
    paddingBottom: 60,
  },
  stateIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stateTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  stateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  stateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  stateBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
