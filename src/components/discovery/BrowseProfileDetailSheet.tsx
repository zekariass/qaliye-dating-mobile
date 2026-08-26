import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
    withTiming as reanimatedWithTiming,
    Easing as REasing,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import MorePhotosSection from '@/components/discovery/MorePhotosSection';
import { CardDto } from '@/components/discovery/ProfileCard';
import ProfileDetailsSection from '@/components/discovery/ProfileDetailsSection';
import { colors } from '@/constants/theme';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useOtherUserProfile } from '@/hooks/profile/useOtherUserProfile';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/utils/formatDistance';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_W * 1.1);
const ACTION_BTN = 52;
const TOTAL_STARS = 12;
const STAR_RADIUS = 16;

interface Props {
  visible: boolean;
  card: CardDto | null;
  onClose: () => void;
  onLike: (userId: string) => void;
  onPass: (userId: string) => void;
  onSuperLike: (userId: string) => void;
  onSuperMessage?: (userId: string) => void;
  canSuperLike: boolean;
  isActing: boolean;
}

export default function BrowseProfileDetailSheet({
  visible,
  card,
  onClose,
  onLike,
  onPass,
  onSuperLike,
  onSuperMessage,
  canSuperLike,
  isActing,
}: Props) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { t } = useTranslation();

  const [actionTaken, setActionTaken] = useState<'LIKE' | 'PASS' | 'SUPER_LIKE' | null>(null);
  const confirmOpacity = useState(new Animated.Value(0))[0];
  const buttonsOpacity = useState(new Animated.Value(1))[0];

  // ── Hero photo navigation state ──
  const heroPhotos = (card?.photos ?? []).map((p) => p.image_url).filter(Boolean);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const heroSlideX = useSharedValue(0);
  const heroSlideDir = useRef<'next' | 'prev'>('next');
  const heroSkipSlide = useRef(true);

  useEffect(() => {
    setHeroPhotoIndex(0);
    heroSkipSlide.current = true;
  }, [card?.user_id]);

  useEffect(() => {
    if (heroSkipSlide.current) {
      heroSkipSlide.current = false;
      heroSlideX.value = 0;
      return;
    }
    const startOffset = heroSlideDir.current === 'next' ? SCREEN_W : -SCREEN_W;
    heroSlideX.value = startOffset;
    heroSlideX.value = reanimatedWithTiming(0, { duration: 280, easing: REasing.out(REasing.cubic) });
  }, [heroPhotoIndex]);

  const heroPanGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -30 && heroPhotoIndex < heroPhotos.length - 1) {
        heroSlideDir.current = 'next';
        setHeroPhotoIndex((i) => Math.min(i + 1, heroPhotos.length - 1));
      } else if (e.translationX > 30 && heroPhotoIndex > 0) {
        heroSlideDir.current = 'prev';
        setHeroPhotoIndex((i) => Math.max(i - 1, 0));
      }
    });

  const heroTapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (heroPhotos.length <= 1) return;
      heroSlideDir.current = 'next';
      setHeroPhotoIndex((i) => (i + 1) % heroPhotos.length);
    });

  const heroPhotoGesture = Gesture.Race(heroPanGesture, heroTapGesture);

  const heroSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: heroSlideX.value }],
  }));

  // Reset state when sheet is reopened
  useEffect(() => {
    if (visible) {
      setActionTaken(null);
      confirmOpacity.setValue(0);
      buttonsOpacity.setValue(1);
    }
  }, [visible]);

  // Fetch enriched profile data for full details
  const { data: profileDetail, isLoading: profileLoading } = useOtherUserProfile(
    card?.user_id ?? '',
  );

  const enrichedCard: CardDto | null = useMemo(() => {
    if (!card) return null;
    if (!profileDetail) return card;
    return {
      ...card,
      activity_level: profileDetail.activity_level ?? card.activity_level,
      interests: profileDetail.interests?.length ? profileDetail.interests : card.interests,
      languages: profileDetail.languages?.length ? profileDetail.languages : card.languages,
      ethnicities: profileDetail.ethnicities?.length ? profileDetail.ethnicities : card.ethnicities,
      smoking: profileDetail.smoking ?? card.smoking,
      drinking: profileDetail.drinking ?? card.drinking,
      bio: profileDetail.bio ?? card.bio,
    };
  }, [card, profileDetail]);

  const { data: myProfile } = useCurrentProfile();
  const myCountry = myProfile?.address?.country_name ?? '';

  const locationText = useMemo(() => {
    if (!card) return '';
    const sameCountry = myCountry !== '' && card.country_name === myCountry;
    const place = sameCountry ? card.city : card.country_name;
    return place ?? '';
  }, [card, myCountry]);

  const animateToConfirmation = useCallback(() => {
    Animated.timing(buttonsOpacity, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    Animated.timing(confirmOpacity, {
      toValue: 1,
      duration: 300,
      delay: 100,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [buttonsOpacity, confirmOpacity]);

  const handleLike = useCallback(() => {
    if (!card || actionTaken) return;
    setActionTaken('LIKE');
    animateToConfirmation();
    onLike(card.user_id);
  }, [card, onLike, actionTaken, animateToConfirmation]);

  const handlePass = useCallback(() => {
    if (!card || actionTaken) return;
    setActionTaken('PASS');
    animateToConfirmation();
    onPass(card.user_id);
  }, [card, onPass, actionTaken, animateToConfirmation]);

  const handleSuperLike = useCallback(() => {
    if (!card || actionTaken) return;
    setActionTaken('SUPER_LIKE');
    animateToConfirmation();
    onSuperLike(card.user_id);
  }, [card, onSuperLike, actionTaken, animateToConfirmation]);

  const handleSuperMessage = useCallback(() => {
    if (!card || actionTaken) return;
    onSuperMessage?.(card.user_id);
  }, [card, onSuperMessage, actionTaken]);

  if (!card) return null;

  const currentHeroPhoto = heroPhotos.length > 0 ? heroPhotos[Math.min(heroPhotoIndex, heroPhotos.length - 1)] : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <GestureHandlerRootView style={styles.container}>
      <View style={[{ backgroundColor: th.background, flex: 1 }]}>
        {/* ── Header (floating over hero) ── */}
        <View style={[styles.header, { paddingTop: safeTop + 4 }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityLabel="Close profile details"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: safeBottom + 100 }}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Hero photo — swipe horizontally to browse photos */}
          <GestureDetector gesture={heroPhotoGesture}>
            <View style={styles.heroWrap}>
              <Reanimated.View style={[styles.heroPhoto, heroSlideStyle]}>
                {currentHeroPhoto ? (
                  <Image
                    source={{ uri: currentHeroPhoto }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
                    <Ionicons name="person" size={64} color={colors.primaryLight} />
                  </View>
                )}
              </Reanimated.View>

              {/* Gradient overlay */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
                locations={[0.4, 1]}
                style={styles.heroOverlay}
              />

              {/* Photo indicator dots — top right corner */}
              {heroPhotos.length > 1 && (
                <View style={styles.heroDotsWrap}>
                  {heroPhotos.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.heroDot,
                        i === heroPhotoIndex ? styles.heroDotActive : styles.heroDotInactive,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Verified badge */}
              {card.is_verified && (
                <View style={[styles.heroVerified, heroPhotos.length > 1 && { top: 84 }]}>
                  <VerifiedBadge pill dark />
                </View>
              )}

            {/* Name + age + location */}
            <View style={styles.heroInfo}>
              <Text style={styles.heroName} numberOfLines={1}>
                {card.display_name}
                <Text style={styles.heroAge}>  · {card.age}</Text>
              </Text>
              {locationText ? (
                <View style={styles.heroLocationRow}>
                  <Ionicons name="location" size={12} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.heroLocationText} numberOfLines={1}>
                    {locationText}
                    {card.distance_km != null && card.distance_km > 0
                      ? `  ·  ${formatDistance(card.distance_km)}`
                      : ''}
                  </Text>
                </View>
              ) : null}
              {card.activity_status && card.activity_status !== 'HIDDEN' && (
                <ActivityStatusIndicator
                  status={card.activity_status}
                  showLabel
                  size={9}
                  labelFontSize={13}
                />
              )}
            </View>
          </View>
          </GestureDetector>

          {/* Loading overlay while fetching enriched data */}
          {profileLoading && (
            <View style={styles.profileLoadingBar}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.profileLoadingText, { color: th.textSecondary }]}>
                Loading details…
              </Text>
            </View>
          )}

          {/* Profile details */}
          {enrichedCard && (
            <>
              <ProfileDetailsSection card={enrichedCard} />
              <MorePhotosSection photos={enrichedCard.photos} />
            </>
          )}
        </ScrollView>

        {/* ── Fixed action bar — buttons or confirmation ── */}
        <View
          style={[
            styles.actionBar,
            {
              paddingBottom: safeBottom + 8,
              backgroundColor: isDark ? th.backgroundElement : th.surface,
              borderTopColor: th.border,
            },
          ]}
        >
          {/* Action buttons */}
          <Animated.View
            style={[styles.actionRow, { opacity: buttonsOpacity }, actionTaken ? { position: 'absolute', opacity: 0 } : null]}
            pointerEvents={actionTaken ? 'none' : 'auto'}
          >
            {/* Pass */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: isDark ? th.backgroundSelected : '#F3EEFF' },
              ]}
              onPress={handlePass}
              disabled={isActing || !!actionTaken}
              activeOpacity={0.7}
              accessibilityLabel="Pass profile"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={34} color={colors.danger} />
            </TouchableOpacity>

            {/* Like */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.likeBtn,
                { backgroundColor: isDark ? th.backgroundSelected : '#FFE8F3' },
              ]}
              onPress={handleLike}
              disabled={isActing || !!actionTaken}
              activeOpacity={0.7}
              accessibilityLabel="Like profile"
              accessibilityRole="button"
            >
              <Ionicons name="heart" size={32} color={colors.heartPink} />
            </TouchableOpacity>

            {/* Super Like — star burst style matching swipe mode */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: isDark ? th.backgroundSelected : '#F3EEFF' },
                !canSuperLike && styles.actionBtnDisabled,
              ]}
              onPress={handleSuperLike}
              disabled={!canSuperLike || isActing || !!actionTaken}
              activeOpacity={0.7}
              accessibilityLabel="Super like profile"
              accessibilityRole="button"
            >
              <Ionicons name="star" size={26} color={colors.primary} />
              {Array.from({ length: TOTAL_STARS }).map((_, i) => {
                const angle = (i / TOTAL_STARS) * 2 * Math.PI - Math.PI / 2;
                const x = Math.cos(angle) * STAR_RADIUS;
                const y = Math.sin(angle) * STAR_RADIUS;
                return (
                  <Ionicons
                    key={i}
                    name="star"
                    size={5}
                    color={colors.primary}
                    style={[
                      styles.star,
                      { transform: [{ translateX: x }, { translateY: y }] },
                    ]}
                  />
                );
              })}
            </TouchableOpacity>

            {/* Super Message */}
            {onSuperMessage && (
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: isDark ? th.backgroundSelected : '#FFF8E8' },
                ]}
                onPress={handleSuperMessage}
                disabled={isActing || !!actionTaken}
                activeOpacity={0.7}
                accessibilityLabel="Send super message"
                accessibilityRole="button"
              >
                <Ionicons name="chatbubble-ellipses" size={30} color="#F59E0B" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Confirmation message */}
          {actionTaken && (
            <Animated.View
              style={[styles.confirmationWrap, { opacity: confirmOpacity }]}
              pointerEvents="none"
            >
              <Ionicons
                name={actionTaken === 'PASS' ? 'close' : actionTaken === 'SUPER_LIKE' ? 'star' : 'heart'}
                size={22}
                color={actionTaken === 'PASS' ? colors.danger : actionTaken === 'SUPER_LIKE' ? colors.primary : colors.heartPink}
              />
              <Text style={[styles.confirmationText, { color: th.text }]}>
                {actionTaken === 'LIKE'
                  ? `You liked ${card.display_name}`
                  : actionTaken === 'PASS'
                  ? `You passed on ${card.display_name}`
                  : `You Super Liked ${card.display_name}`}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Hero ──
  heroWrap: {
    width: SCREEN_W,
    height: HERO_H,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLavender,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroDotsWrap: {
    position: 'absolute',
    top: 60,
    right: 14,
    flexDirection: 'row',
    gap: 4,
    zIndex: 4,
  },
  heroDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  heroDotActive: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  heroDotInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  heroVerified: {
    position: 'absolute',
    top: 60,
    right: 14,
    zIndex: 3,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 14,
    zIndex: 2,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroAge: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  heroLocationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },

  // ── Loading bar ──
  profileLoadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  profileLoadingText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Action bar ──
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  actionBtn: {
    width: ACTION_BTN,
    height: ACTION_BTN,
    borderRadius: ACTION_BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 14,
  },
  confirmationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 14,
    width: '100%',
  },
  confirmationText: {
    fontSize: 17,
    fontWeight: '700',
  },
  likeBtn: {
    width: ACTION_BTN + 8,
    height: ACTION_BTN + 8,
    borderRadius: (ACTION_BTN + 8) / 2,
  },
  star: {
    position: 'absolute',
  },
});
