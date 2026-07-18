import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import QaliyeLogo from '@/components/common/QaliyeLogo';
import { themedAlert } from '@/components/common/ThemedAlert';
import CardActionButtons from '@/components/discovery/CardActionButtons';
import CardStack, { CardStackHandle } from '@/components/discovery/CardStack';
import MatchCelebrationOverlay from '@/components/discovery/MatchCelebrationOverlay';
import MorePhotosSection from '@/components/discovery/MorePhotosSection';
import { CardDto } from '@/components/discovery/ProfileCard';
import ProfileDetailsSection from '@/components/discovery/ProfileDetailsSection';
import { colors, radius, spacing } from '@/constants/theme';
import { useActivateBoost } from '@/hooks/billing/useActivateBoost';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { mapProfileToCard, useDiscoveryProfiles } from '@/hooks/discovery/useDiscoveryProfiles';
import { useRewind } from '@/hooks/discovery/useRewind';
import { useSwipeAction } from '@/hooks/discovery/useSwipeAction';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useOtherUserProfile } from '@/hooks/profile/useOtherUserProfile';
import { useTheme } from '@/hooks/use-theme';
import { isPremiumPlan } from '@/types/billing';
import {
    canRewind as checkCanRewind,
    canSuperLike as checkCanSuperLike,
    getBoostStatus,
    getQuotaErrorType,
    getRewindsStatus,
    isQuotaError
} from '@/utils/entitlements';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const { height: SCREEN_H } = Dimensions.get('window');
const HEADER_H = 56;
const TAB_BAR_PADDING = 18;
const TAB_BAR_H = 68;

// ---------------------------------------------------------------------------
// Ripple / sonar loading animation
// ---------------------------------------------------------------------------
const AVATAR_SIZE = 108;
const RING_MAX = 280;
const RING_START_SCALE = AVATAR_SIZE / RING_MAX;

function RippleRing({ delay, accentColor }: { delay: number; accentColor: string }) {
  const scale   = useSharedValue(RING_START_SCALE);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.55, { duration: 60 }),
          withTiming(0, { duration: 2340, easing: Easing.out(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: RING_MAX,
          height: RING_MAX,
          borderRadius: RING_MAX / 2,
          borderWidth: 2.5,
          borderColor: accentColor,
        },
        animStyle,
      ]}
    />
  );
}

function FindingMatchesAnimation({ accentColor, textColor, subtitleColor }: {
  accentColor: string;
  textColor: string;
  subtitleColor: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0 }}>
      <View style={{ width: RING_MAX, height: RING_MAX, alignItems: 'center', justifyContent: 'center' }}>
        <RippleRing delay={0}    accentColor={accentColor} />
        <RippleRing delay={800}  accentColor={accentColor} />
        <RippleRing delay={1600} accentColor={accentColor} />
        <View
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: AVATAR_SIZE / 2,
            backgroundColor: accentColor + '18',
            borderWidth: 3,
            borderColor: accentColor + '55',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Ionicons name="person" size={46} color={accentColor} />
        </View>
      </View>
      <Text style={{ color: textColor, fontSize: 18, fontWeight: '700', marginTop: 8, textAlign: 'center', letterSpacing: -0.3 }}>
        Finding your matches…
      </Text>
      <Text style={{ color: subtitleColor, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
        Looking for amazing people near you
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Animated scroll-hint chevron
// ---------------------------------------------------------------------------
function ScrollHint({ color }: { color: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.scrollHint, animStyle]}>
      <Ionicons name="chevron-down" size={22} color={color} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Boost control (center of header)
// ---------------------------------------------------------------------------
type BoostControlProps = {
  boostStatus: ReturnType<typeof getBoostStatus>;
  isActivating: boolean;
  onActivate: () => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
};

function BoostControl({ boostStatus, isActivating, onActivate, themeColors, isDark }: BoostControlProps) {
  if (boostStatus.isActive) {
    return (
      <View style={boostStyles.boostedBadge}>
        <Ionicons name="rocket" size={14} color="#FFF" />
        <Text style={boostStyles.boostedText}>Boosted</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onActivate}
      disabled={isActivating}
      activeOpacity={0.7}
      style={[
        boostStyles.boostBtn,
        {
          backgroundColor: isDark ? themeColors.backgroundElement : themeColors.surface,
          borderColor: themeColors.border,
          borderWidth: 1.5,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Activate Boost"
    >
      {isActivating ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="rocket-outline" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}

const boostStyles = StyleSheet.create({
  boostedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  boostedText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  boostBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});

// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { bottom: safeBottom } = useSafeAreaInsets();

  const cardStackRef        = useRef<CardStackHandle>(null);
  const scrollRef            = useRef<ScrollView>(null);
  const scrollY              = useRef(0);
  const isRewindingRef        = useRef(false);
  const pendingSuperLikeRef   = useRef(false);
  const shownIdsRef           = useRef<Set<string>>(new Set());
  const lastSwipedCardRef     = useRef<CardDto | null>(null);
  const lastSwipedDirRef      = useRef<'LIKE' | 'PASS'>('LIKE');
  const prevIsRefetchingRef   = useRef(false);

  const [displayQueue, setDisplayQueue] = useState<CardDto[]>([]);
  const [rewindIncoming, setRewindIncoming] = useState<'LIKE' | 'PASS' | false>(false);
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [matchPhoto, setMatchPhoto] = useState<string | undefined>(undefined);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [syncingCards, setSyncingCards] = useState(false);
  const [superLikeExhausted, setSuperLikeExhausted] = useState(false);
  const router = useRouter();

  // ── API hooks ──────────────────────────────────────────────────────────────
  const {
    cards: apiCards,
    isLoading,
    isError,
    error: discoveryError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    cursorReset,
    isRefetching,
  } = useDiscoveryProfiles();

  const { mutate: swipe } = useSwipeAction();
  const { mutate: rewind } = useRewind();
  const { entitlements, refreshEntitlements } = useEntitlements();
  const { data: profileDto } = useCurrentProfile();
  const isIncognito = profileDto?.discovery_mode === 'INCOGNITO';

  const activateBoost = useActivateBoost();
  const boostStatus = useMemo(() => getBoostStatus(entitlements), [entitlements]);

  // ── Boost activation handler ───────────────────────────────────────────────
  const handleBoostActivate = useCallback(() => {
    if (activateBoost.isPending) return;
    if (boostStatus.isActive) return;

    if (boostStatus.canActivate) {
      themedAlert({
        title: 'Activate Boost',
        message: `Boost will make your profile appear more frequently to others for ${boostStatus.durationMinutes} minutes. Ready to stand out?`,
        icon: 'rocket',
        iconColor: colors.primary,
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Activate',
            style: 'default',
            onPress: () => {
              themedAlert({
                title: 'Activating Boost…',
                loading: true,
                buttons: [],
              });
              activateBoost.mutate(undefined, {
                onSuccess: () => {
                  themedAlert({
                    title: 'Boost Active!',
                    message: 'Your profile is now being shown to more people. Enjoy the spotlight!',
                    icon: 'checkmark-circle',
                    iconColor: colors.success,
                    buttons: [{ text: 'OK' }],
                  });
                  refreshEntitlements();
                },
                onError: (err) => {
                  if (err.code === 'BOOST_ALREADY_ACTIVE') {
                    themedAlert({
                      title: 'Already Boosted',
                      message: 'A boost is already active. Enjoy the spotlight!',
                      icon: 'rocket',
                      iconColor: colors.primary,
                      buttons: [{ text: 'OK' }],
                    });
                  } else {
                    themedAlert({
                      title: 'Boost Failed',
                      message: err.message || 'Could not activate boost. Please try again.',
                      icon: 'alert-circle',
                      iconColor: colors.danger,
                      buttons: [{ text: 'OK' }],
                    });
                  }
                  refreshEntitlements();
                },
              });
            },
          },
        ],
      });
      return;
    }

    // No boost credits available
    const hasPremium = isPremiumPlan(entitlements?.plan);
    if (hasPremium) {
      themedAlert({
        title: 'No Boost Credits',
        message: 'You have an active Premium subscription but no Boost credits. Visit the Credits Shop to buy more.',
        icon: 'rocket-outline',
        iconColor: colors.primary,
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Buy Boost Credit',
            style: 'default',
            onPress: () => router.push('/(app)/credits-shop' as any),
          },
        ],
      });
    } else {
      themedAlert({
        title: 'No Boost Credits',
        message: 'You need Boost credits to activate a Boost. Upgrade to Premium or buy Boost credits separately.',
        icon: 'rocket-outline',
        iconColor: colors.primary,
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Buy Premium',
            style: 'default',
            onPress: () => router.push('/(app)/premium' as any),
          },
          {
            text: 'Buy Boost Credit',
            style: 'default',
            onPress: () => router.push('/(app)/credits-shop' as any),
          },
        ],
      });
    }
  }, [activateBoost, boostStatus, entitlements, refreshEntitlements, router]);

  // ── Queue management ───────────────────────────────────────────────────────

  // Reset queue on background refetch completion (preference change) or backend cursor reset.
  // Append-only for pagination (isFetchingNextPage).
  useEffect(() => {
    setSyncingCards(true);
    const justCompletedRefetch = prevIsRefetchingRef.current && !isRefetching;
    prevIsRefetchingRef.current = isRefetching;

    if (justCompletedRefetch || cursorReset) {
      shownIdsRef.current = new Set(apiCards.map((c) => c.user_id));
      setDisplayQueue(apiCards);
    } else {
      const newCards = apiCards.filter((c) => !shownIdsRef.current.has(c.user_id));
      if (newCards.length > 0) {
        newCards.forEach((c) => shownIdsRef.current.add(c.user_id));
        setDisplayQueue((prev) => [...prev, ...newCards]);
      }
    }

    // Allow one frame for the state to land, then mark sync as done
    const raf = requestAnimationFrame(() => setSyncingCards(false));
    return () => cancelAnimationFrame(raf);
  }, [apiCards, isRefetching, cursorReset]);

  // ── Loading timeout: show wave animation for up to 10s, then fallback to empty state
  useEffect(() => {
    if (!isLoading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Debug: log top card location fields
  useEffect(() => {
    if (displayQueue.length > 0) {
      const top = displayQueue[0];
      console.log('[DiscoverScreen] top card location debug:', {
        user_id: top.user_id,
        display_name: top.display_name,
        city: top.city,
        country_name: top.country_name,
        residency_type: top.residency_type,
        distance_km: top.distance_km,
      });
    }
  }, [displayQueue[0]?.user_id]);

  // Pre-fetch next page when queue is running low
  useEffect(() => {
    if (displayQueue.length <= 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [displayQueue.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Layout constants ────────────────────────────────────────────────────────
  const TOTAL_TAB = TAB_BAR_PADDING + TAB_BAR_H + Math.max(safeBottom, 12);
  const CARD_AREA_H = SCREEN_H - HEADER_H - TOTAL_TAB - 12;

  const topCard = displayQueue[0] ?? null;

  // Fetch full profile for the top card to get lifestyle fields (activity_level,
  // interests, languages, ethnicities) that the discovery feed doesn't include.
  const { data: topProfileDetail } = useOtherUserProfile(topCard?.user_id ?? '');

  const enrichedTopCard: CardDto | null = useMemo(() => {
    if (!topCard) return null;
    if (!topProfileDetail) return topCard;
    return {
      ...topCard,
      activity_level: topProfileDetail.activity_level ?? topCard.activity_level,
      interests: topProfileDetail.interests?.length ? topProfileDetail.interests : topCard.interests,
      languages: topProfileDetail.languages?.length ? topProfileDetail.languages : topCard.languages,
      ethnicities: topProfileDetail.ethnicities?.length ? topProfileDetail.ethnicities : topCard.ethnicities,
      smoking: topProfileDetail.smoking ?? topCard.smoking,
      drinking: topProfileDetail.drinking ?? topCard.drinking,
    };
  }, [topCard, topProfileDetail]);

  // ── Scroll helper ───────────────────────────────────────────────────────────
  const scrollToTop = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (scrollY.current <= 2) { resolve(); return; }
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        setTimeout(resolve, 320);
      }),
    [],
  );

  // ── Super Like exhaustion action sheet ──────────────────────────────────────
  useEffect(() => {
    if (!superLikeExhausted) return;
    themedAlert({
      title: 'Super Likes',
      message: "You've used all your Super Likes.",
      icon: 'star-outline',
      iconColor: colors.warning,
      buttons: [
        {
          text: 'Buy Super Likes',
          onPress: () => {
            setSuperLikeExhausted(false);
            router.push({ pathname: '/(app)/credits-shop', params: { focus: 'SUPERLIKE' } } as any);
          },
        },
        {
          text: 'Upgrade to Premium',
          onPress: () => {
            setSuperLikeExhausted(false);
            router.push('/(app)/premium' as any);
          },
        },
        { text: 'Not now', style: 'cancel', onPress: () => setSuperLikeExhausted(false) },
      ],
    });
  }, [superLikeExhausted, router]);

  // ── Swipe handler ───────────────────────────────────────────────────────────
  const handleSwipe = useCallback(
    (direction: 'LIKE' | 'PASS', card: CardDto) => {
      const isSuperLike = direction === 'LIKE' && pendingSuperLikeRef.current;
      pendingSuperLikeRef.current = false;
      lastSwipedCardRef.current = card;
      lastSwipedDirRef.current  = direction;
      setDisplayQueue((prev) => prev.filter((c) => c.user_id !== card.user_id));
      swipe(
        { type: isSuperLike ? 'SUPER_LIKE' : direction, targetUserId: card.user_id },
        {
          onSuccess: (response) => {
            if (response.isMatch && response.match) {
              setMatchName(response.match.otherUser.displayName);
              setMatchPhoto(response.match.otherUser.primaryPhotoUrl ?? undefined);
              setMatchId(response.match.matchId);
              setMatchVisible(true);
            }
          },
          onError: (e) => {
            if (!isQuotaError(e)) return;
            const errorType = getQuotaErrorType(e);
            if (isSuperLike || errorType === 'SUPER_LIKES') {
              shownIdsRef.current.delete(card.user_id);
              setDisplayQueue((prev) => [card, ...prev]);
              setSuperLikeExhausted(true);
            } else if (direction === 'LIKE' || errorType === 'LIKES') {
              shownIdsRef.current.delete(card.user_id);
              setDisplayQueue((prev) => [card, ...prev]);
              router.push('/(app)/premium' as any);
            }
          },
        },
      );
    },
    [swipe, router],
  );

  // ── Rewind handler ──────────────────────────────────────────────────────────
  const handleRewind = useCallback(async () => {
    if (isRewindingRef.current) return;
    if (!checkCanRewind(entitlements)) {
      const status = getRewindsStatus(entitlements);
      if (status.creditsAvailable > 0) {
        router.push('/(app)/premium' as any);
      } else {
        router.push({ pathname: '/(app)/credits-shop', params: { focus: 'REWIND' } } as any);
      }
      return;
    }
    isRewindingRef.current = true;
    await scrollToTop();
    rewind(undefined, {
      onSuccess: (response) => {
        const res = response as any;
        const rawProfile    = res.restoredProfile ?? res.restored_profile;
        const actionType    = res.reversedActionType ?? res.reversed_action_type;
        const dir: 'LIKE' | 'PASS' = actionType === 'PASS' ? 'PASS' : 'LIKE';

        const restoredCard: CardDto | null = rawProfile
          ? mapProfileToCard(rawProfile)
          : lastSwipedCardRef.current;

        const effectiveDir: 'LIKE' | 'PASS' = rawProfile
          ? dir
          : lastSwipedDirRef.current;

        if (restoredCard) {
          setRewindIncoming(effectiveDir);
          shownIdsRef.current.delete(restoredCard.user_id);
          setDisplayQueue((prev) => [restoredCard, ...prev]);
          shownIdsRef.current.add(restoredCard.user_id);
          setTimeout(() => {
            setRewindIncoming(false);
            isRewindingRef.current = false;
          }, 600);
        } else {
          isRewindingRef.current = false;
        }
      },
      onError: (e) => {
        isRewindingRef.current = false;
        if (isQuotaError(e)) {
          const status = getRewindsStatus(entitlements);
          if (status.creditsAvailable > 0) {
            router.push('/(app)/premium' as any);
          } else {
            router.push({ pathname: '/(app)/credits-shop', params: { focus: 'REWIND' } } as any);
          }
        }
      },
    });
  }, [rewind, scrollToTop, entitlements, router]);

  // ── Button handlers ─────────────────────────────────────────────────────────
  const handlePass = useCallback(async () => {
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('PASS');
  }, [scrollToTop]);

  const handleLike = useCallback(async () => {
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('LIKE');
  }, [scrollToTop]);

  const handleSuperLike = useCallback(async () => {
    if (!checkCanSuperLike(entitlements)) {
      setSuperLikeExhausted(true);
      return;
    }
    pendingSuperLikeRef.current = true;
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('LIKE');
  }, [scrollToTop, entitlements]);

  // Keep the suspense loader visible while we are fetching or while the API
  // has already returned cards but they have not yet been synced into the
  // display queue. This prevents the "no more profiles" empty state from
  // flickering for one frame before the first cards render.
  const showAnimation =
    (isLoading || syncingCards || (displayQueue.length === 0 && apiCards.length > 0)) &&
    !loadingTimedOut &&
    !isError;
  const isEmpty =
    !isLoading && !isError && !syncingCards && displayQueue.length === 0 && apiCards.length === 0;

  const errorInfo = isError
    ? (() => {
        const err = discoveryError as any;
        const code = err?.response?.data?.error?.code ?? err?.code;
        const backendMsg = err?.response?.data?.error?.message ?? err?.message;
        if (code === 'DISCOVERY_ACTOR_INELIGIBLE') {
          return {
            icon: 'person-circle-outline' as const,
            title: 'Account not ready',
            subtitle: 'Your account is not eligible to use discovery yet. Please complete your profile to start matching.',
          };
        }
        if (err?.response?.status === 403) {
          return {
            icon: 'lock-closed-outline' as const,
            title: 'Access restricted',
            subtitle: backendMsg ?? 'You do not have permission to access discovery.',
          };
        }
        return {
          icon: 'cloud-offline-outline' as const,
          title: t('common.errorTitle', { defaultValue: 'Something went wrong' }),
          subtitle: backendMsg ?? t('common.errorRetryHint', { defaultValue: 'Check your connection and try again.' }),
        };
      })()
    : null;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────── */}
      <View style={styles.header}>
        {/* Qaliye logo */}
        <View
          style={[
            styles.logoContainer,
            { backgroundColor: isDark ? th.backgroundElement : th.surface, borderColor: th.border },
          ]}
        >
          <QaliyeLogo />
        </View>

        {/* Incognito indicator OR Boost control */}
        {isIncognito ? (
          <View style={styles.incognitoIndicator}>
            <Ionicons name="eye-off" size={12} color={th.textSecondary} />
            <Text style={[styles.incognitoText, { color: th.textSecondary }]}>Private mode</Text>
          </View>
        ) : (
          <BoostControl
            boostStatus={boostStatus}
            isActivating={activateBoost.isPending}
            onActivate={handleBoostActivate}
            themeColors={th}
            isDark={isDark}
          />
        )}

        {/* Settings / Preferences */}
        <TouchableOpacity
          style={[styles.settingsBtn, { borderColor: th.border, backgroundColor: isDark ? th.backgroundElement : th.surface, borderWidth: 1.5 }]}
          onPress={() => router.push('/(app)/preferences')}
          activeOpacity={0.7}
          accessibilityLabel={t('discovery.openPreferences')}
        >
          <Ionicons name="options-outline" size={21} color={th.text} />
        </TouchableOpacity>
      </View>

      {/* ── Main content (scrollable + fixed buttons) ── */}
      <View style={styles.main}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: TOTAL_TAB + 8 - 50 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
          bounces
        >
          {/* Card zone — fixed height filling available space */}
          <View style={[styles.cardArea, { height: CARD_AREA_H }]}>
            {showAnimation ? (
              <FindingMatchesAnimation
                accentColor={colors.primary}
                textColor={th.text}
                subtitleColor={th.textSecondary}
              />
            ) : isEmpty ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender }]}>
                  <Ionicons name="heart-dislike-outline" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: th.text }]}>
                  {t('discovery.noMoreProfiles')}
                </Text>
                <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
                  {t('discovery.noMoreProfilesHint', { defaultValue: 'Try expanding your preferences or check back later for new people.' })}
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(app)/preferences')}
                >
                  <Ionicons name="options-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyBtnText}>{t('discovery.adjustPreferences')}</Text>
                </TouchableOpacity>
              </View>
            ) : isError && errorInfo ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender }]}>
                  <Ionicons name={errorInfo.icon} size={48} color={colors.danger} />
                </View>
                <Text style={[styles.emptyTitle, { color: th.text }]}>
                  {errorInfo.title}
                </Text>
                <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
                  {errorInfo.subtitle}
                </Text>
                <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={() => refetch()}>
                  <Ionicons name="refresh-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyBtnText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CardStack
                ref={cardStackRef}
                cards={displayQueue}
                onSwipe={handleSwipe}
                animateTopCardIn={rewindIncoming}
              />
            )}

            {/* Scroll-down hint — overlaid on bottom center of card */}
            {topCard && (
              <View style={styles.scrollHintOverlay} pointerEvents="none">
                <ScrollHint color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Profile details — below card, visible when scrolling */}
          {enrichedTopCard && (
            <>
              <ProfileDetailsSection card={enrichedTopCard} />
              <MorePhotosSection photos={enrichedTopCard.photos} />
            </>
          )}
        </ScrollView>

        {/* Fixed action buttons — float on the right edge over content */}
        {!isLoading && !isError && !isEmpty && (
          <View style={[styles.actionOverlay, { bottom: TOTAL_TAB + 8 }]}>
            <CardActionButtons
              onRewind={handleRewind}
              onPass={handlePass}
              onLike={handleLike}
              onSuperLike={handleSuperLike}
            />
          </View>
        )}
      </View>

      {/* ── Overlays ───────────────────────────────── */}
      <MatchCelebrationOverlay
        visible={matchVisible}
        name={matchName}
        photoUrl={matchPhoto}
        onSendMessage={() => {
          setMatchVisible(false);
          if (matchId) {
            router.push({
              pathname: '/(app)/chat' as any,
              params: { matchId, displayName: matchName },
            });
          }
        }}
        onKeepSwiping={() => setMatchVisible(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  logoContainer: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  incognitoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  incognitoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  // ── Scroll / Main ───────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  main: {
    flex: 1,
    position: 'relative',
  },

  // ── Card area ───────────────────────────────────────────────────────────
  cardArea: {
    marginHorizontal: 6,
    paddingVertical: 4,
  },
  actionOverlay: {
    position: 'absolute',
    right: 10,
    zIndex: 10,
  },

  // ── Scroll hint ─────────────────────────────────────────────────────────
  scrollHint: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 6,
  },
  scrollHintOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
