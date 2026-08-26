import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    AppState,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
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

import { PromotionAlert } from '@/components/billing/PromotionAlert';
import { themedAlert, themedAlertDismiss } from '@/components/common/ThemedAlert';
import BrowseModeGrid from '@/components/discovery/BrowseModeGrid';
import CardActionButtons from '@/components/discovery/CardActionButtons';
import CardStack, { CardStackHandle } from '@/components/discovery/CardStack';
import MatchCelebrationOverlay from '@/components/discovery/MatchCelebrationOverlay';
import MorePhotosSection from '@/components/discovery/MorePhotosSection';
import { CardDto } from '@/components/discovery/ProfileCard';
import ProfileDetailsSection from '@/components/discovery/ProfileDetailsSection';
import { BANNER_H, PromotionBanner } from '@/components/discovery/PromotionBanner';
import SuperMessageModal, { type SuperMessageTarget } from '@/components/discovery/SuperMessageModal';
import { SwipeIcon } from '@/components/layout/AppTabBar';
import { NotificationPromptModal } from '@/components/notifications/NotificationPromptModal';
import { IdentityVerificationPromptModal } from '@/components/profile/IdentityVerificationPromptModal';
import { colors, radius, spacing } from '@/constants/theme';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useActivateBoost } from '@/hooks/billing/useActivateBoost';
import { useEligiblePromotions } from '@/hooks/billing/useEligiblePromotions';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { usePromotionBanner } from '@/hooks/billing/usePromotionBanner';
import { mapProfileToCard, useDiscoveryProfiles } from '@/hooks/discovery/useDiscoveryProfiles';
import { useRewind } from '@/hooks/discovery/useRewind';
import { useSendSuperMessage } from '@/hooks/discovery/useSendSuperMessage';
import { useSwipeAction } from '@/hooks/discovery/useSwipeAction';
import { useNotificationPrompt } from '@/hooks/notifications/useNotificationPrompt';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useIdentityVerificationPrompt } from '@/hooks/profile/useIdentityVerificationPrompt';
import { useOtherUserProfile } from '@/hooks/profile/useOtherUserProfile';
import { useTheme } from '@/hooks/use-theme';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import { useDiscoveryStore } from '@/stores/discovery-store';
import { usePromotionStore } from '@/stores/promotion-store';
import type { EligiblePromotionDto } from '@/types/billing';
import {
    canRewind as checkCanRewind,
    canSuperLike as checkCanSuperLike,
    getBoostStatus,
    getQuotaErrorType,
    isInsufficientCreditsError,
    isLimitExceededError,
} from '@/utils/entitlements';
import { showActionErrorAlert } from '@/utils/limitExceededAlert';
import { getActionOverlayRight } from '@/utils/responsive';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
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

function FindingMatchesAnimation({ accentColor, textColor, subtitleColor, gender }: {
  accentColor: string;
  textColor: string;
  subtitleColor: string;
  gender?: string;
}) {
  const loaderIcon = !gender || (gender !== 'MALE' && gender !== 'FEMALE')
    ? require('@/assets/images/loader/loader-icon-male-and-female.webp')
    : gender === 'MALE'
      ? require('@/assets/images/loader/loader-icon-female.webp')
      : require('@/assets/images/loader/loader-icon-male.webp');
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
          <Image source={loaderIcon} style={{ width: 128, height: 128 }} resizeMode="contain" />
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
        <Text style={boostStyles.boostedText}>Boost Active</Text>
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
  const { height: SCREEN_H, width: SCREEN_W } = useWindowDimensions();

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
  const [browseRewindTrigger, setBrowseRewindTrigger] = useState(0);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [matchPhoto, setMatchPhoto] = useState<string | undefined>(undefined);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [syncingCards, setSyncingCards] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [activePromotion, setActivePromotion] = useState<EligiblePromotionDto | null>(null);
  const [modeSwitching, setModeSwitching] = useState(false);
  const [superMessageTarget, setSuperMessageTarget] = useState<SuperMessageTarget | null>(null);
  const viewMode = useDiscoveryStore((s) => s.viewMode);
  const setViewMode = useDiscoveryStore((s) => s.setViewMode);
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
  const sendSuperMessage = useSendSuperMessage();
  const { onMatch: onReviewMatch } = useReviewPrompt();
  const notifPrompt = useNotificationPrompt();
  const idVerifPrompt = useIdentityVerificationPrompt();
  const { mutate: rewind } = useRewind();
  const { entitlements, refreshEntitlements } = useEntitlements();

  const userId = useCurrentUserId();
  const { tryShowPromotion, hasActivePremium } = useEligiblePromotions(userId);
  const {
    promotions: bannerPromotions,
    currentIndex: bannerIndex,
    isVisible: bannerVisible,
    dismiss: dismissBanner,
    onSwipeToIndex: bannerSwipeToIndex,
    onInteractionStart: bannerInteractionStart,
    onInteractionEnd: bannerInteractionEnd,
  } = usePromotionBanner(userId, hasActivePremium);
  const recordExplicitDismissal = usePromotionStore((s) => s.recordExplicitDismissal);
  const markClaimedOrRedeemed = usePromotionStore((s) => s.markClaimedOrRedeemed);
  const clearSessionForUser = usePromotionStore((s) => s.clearSessionForUser);

  const matchVisibleRef = useRef(false);
  const activePromotionRef = useRef<EligiblePromotionDto | null>(null);
  const pendingPromotionRef = useRef<EligiblePromotionDto | null>(null);
  const isFirstFocusRef = useRef(true);
  const prevUserIdRef = useRef<string | undefined>(undefined);
  const hasTriggeredMatchPromotionRef = useRef(false);

  // ── Promotion banner height animation ───────────────────────────────────────
  const bannerHeightSV = useSharedValue(0);

  useEffect(() => {
    bannerHeightSV.value = bannerVisible
      ? withTiming(BANNER_H, { duration: 300, easing: Easing.out(Easing.ease) })
      : withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) });
  }, [bannerVisible, bannerHeightSV]);

  useEffect(() => { matchVisibleRef.current = matchVisible; }, [matchVisible]);
  useEffect(() => { activePromotionRef.current = activePromotion; }, [activePromotion]);

  useEffect(() => {
    if (userId !== prevUserIdRef.current) {
      isFirstFocusRef.current = true;
      hasTriggeredMatchPromotionRef.current = false;
      if (prevUserIdRef.current) {
        clearSessionForUser(prevUserIdRef.current);
        pendingPromotionRef.current = null;
        setActivePromotion(null);
      }
      prevUserIdRef.current = userId;
    }
  }, [userId, clearSessionForUser]);

  useEffect(() => {
    if (hasActivePremium && (activePromotion || pendingPromotionRef.current)) {
      // Premium users can still receive CREDITS promotions — only clear
      // non-CREDITS promotions.
      const activeIsCredits = activePromotion?.benefit_type === 'CREDITS';
      const pendingIsCredits = pendingPromotionRef.current?.benefit_type === 'CREDITS';
      if (!activeIsCredits) setActivePromotion(null);
      if (!pendingIsCredits) pendingPromotionRef.current = null;
    }
  }, [hasActivePremium, activePromotion]);

  useEffect(() => {
    if (!matchVisible) {
      const pending = pendingPromotionRef.current;
      if (pending && !activePromotionRef.current) {
        pendingPromotionRef.current = null;
        setActivePromotion(pending);
      }
    }
  }, [matchVisible]);

  const handleTryShowPromotion = useCallback(async () => {
    if (__DEV__) console.log('[promo] handleTryShowPromotion called, userId:', userId, 'activePromo:', !!activePromotionRef.current, 'matchVisible:', matchVisibleRef.current);
    if (!userId) return;
    if (activePromotionRef.current) return;
    const promo = await tryShowPromotion();
    if (__DEV__) console.log('[promo] handleTryShowPromotion result:', promo?.campaign_key ?? 'null');
    if (!promo) return;
    if (matchVisibleRef.current) {
      if (__DEV__) console.log('[promo] deferring to pending (match visible)');
      pendingPromotionRef.current = promo;
      return;
    }
    if (__DEV__) console.log('[promo] setting active promotion');
    setActivePromotion(promo);
  }, [tryShowPromotion, userId]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocusRef.current) {
        isFirstFocusRef.current = false;
        return;
      }
      const pending = pendingPromotionRef.current;
      if (pending && !activePromotionRef.current && !matchVisibleRef.current) {
        pendingPromotionRef.current = null;
        setActivePromotion(pending);
      }
    }, []),
  );

  // Reset to swipe mode when app returns from background to active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: string) => {
      if (nextAppState === 'active') {
        setViewMode('swipe');
      }
    });
    return () => subscription.remove();
  }, []);

  // Clear mode switching overlay after the new mode has rendered
  useEffect(() => {
    if (!modeSwitching) return;
    const timer = setTimeout(() => setModeSwitching(false), 350);
    return () => clearTimeout(timer);
  }, [modeSwitching, viewMode]);

  const handleExplicitDismissPromotion = useCallback(() => {
    if (activePromotion && userId) {
      recordExplicitDismissal(userId, activePromotion.campaign_key);
    }
    setActivePromotion(null);
  }, [activePromotion, userId, recordExplicitDismissal]);

  const handleProgrammaticClosePromotion = useCallback(() => {
    setActivePromotion(null);
  }, []);

  const handlePromotionSuccess = useCallback((campaignKey: string) => {
    if (userId) {
      markClaimedOrRedeemed(userId, campaignKey);
    }
    setActivePromotion(null);
  }, [userId, markClaimedOrRedeemed]);

  const handleBannerTap = useCallback((promo: EligiblePromotionDto) => {
    dismissBanner();
    // Route to Credits Shop when the promotion is credits-based or is tied to
    // a consumable product without a subscription product. Otherwise route to
    // the Premium paywall.
    const isCreditsPromo =
      promo.benefit_type === 'CREDITS' ||
      (promo.consumable_product_id != null && promo.subscription_product_id == null);
    if (isCreditsPromo) {
      router.push('/(app)/credits-shop' as any);
    } else {
      router.push('/(app)/premium' as any);
    }
  }, [dismissBanner, router]);
  const { data: profileDto } = useCurrentProfile();
  const isIncognito = profileDto?.discovery_mode === 'INCOGNITO';

  const activateBoost = useActivateBoost();
  const boostStatus = useMemo(() => getBoostStatus(entitlements), [entitlements]);

  // ── Boost activation handler ───────────────────────────────────────────────
  const handleBoostActivate = useCallback(() => {
    if (activateBoost.isPending) return;
    if (boostStatus.isActive) return;

    // Always attempt — if no credits the server returns 402 and the global modal fires
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
                if (isInsufficientCreditsError(err)) {
                  // Global modal is already shown — dismiss the "Activating Boost…" loading alert
                  themedAlertDismiss();
                  return;
                }
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
  }, [activateBoost, boostStatus, refreshEntitlements]);

  // ── Queue management ───────────────────────────────────────────────────────

  // Reset queue on background refetch completion (preference change) or backend cursor reset.
  // Append-only for pagination (isFetchingNextPage).
  useEffect(() => {
    setSyncingCards(true);
    const justCompletedRefetch = prevIsRefetchingRef.current && !isRefetching;
    prevIsRefetchingRef.current = isRefetching;

    if (justCompletedRefetch || cursorReset) {
      // Full reset: deduplicate apiCards by user_id in case the backend returns duplicates
      const seen = new Set<string>();
      const deduped = apiCards.filter((c) => {
        if (seen.has(c.user_id)) return false;
        seen.add(c.user_id);
        return true;
      });
      shownIdsRef.current = new Set(deduped.map((c) => c.user_id));
      setDisplayQueue(deduped);
    } else {
      // Append-only: filter out cards already shown, and also deduplicate against
      // the current displayQueue as a safety net in case shownIdsRef is out of sync.
      const newCards = apiCards.filter((c) => !shownIdsRef.current.has(c.user_id));
      if (newCards.length > 0) {
        newCards.forEach((c) => shownIdsRef.current.add(c.user_id));
        setDisplayQueue((prev) => {
          const existingIds = new Set(prev.map((c) => c.user_id));
          const toAdd = newCards.filter((c) => !existingIds.has(c.user_id));
          return [...prev, ...toAdd];
        });
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


  // Pre-fetch next page when queue is running low
  useEffect(() => {
    if (displayQueue.length <= 3 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [displayQueue.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Layout constants ────────────────────────────────────────────────────────
  const TOTAL_TAB = TAB_BAR_PADDING + TAB_BAR_H + Math.max(safeBottom, 12);
  const CARD_AREA_H = SCREEN_H - HEADER_H - TOTAL_TAB - 12;

  const headerContainerStyle = useAnimatedStyle(() => ({
    height: HEADER_H + bannerHeightSV.value,
  }));

  const cardAreaAnimStyle = useAnimatedStyle(() => ({
    height: CARD_AREA_H - bannerHeightSV.value,
  }));

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

  // ── Swipe handler ───────────────────────────────────────────────────────────
  const handleSwipe = useCallback(
    (direction: 'LIKE' | 'PASS', card: CardDto) => {
      const isSuperLike = direction === 'LIKE' && pendingSuperLikeRef.current;
      pendingSuperLikeRef.current = false;
      lastSwipedCardRef.current = card;
      lastSwipedDirRef.current  = direction;
      setDisplayQueue((prev) => prev.filter((c) => c.user_id !== card.user_id));
      setSwipedIds((prev) => new Set(prev).add(card.user_id));
      swipe(
        { type: isSuperLike ? 'SUPER_LIKE' : direction, targetUserId: card.user_id },
        {
          onSuccess: (response) => {
            if (direction === 'LIKE') {
              notifPrompt.onLike();
              // Show identity verification prompt only when no match overlay
              // is about to appear and no other modal is currently blocking.
              if (!response.is_match) {
                idVerifPrompt.onLikeOrSuperLike(notifPrompt.visible);
              }
            }
            if (response.is_match && response.match) {
              setMatchName(response.match.other_user.display_name);
              setMatchPhoto(response.match.other_user.primary_photo_url ?? undefined);
              setMatchId(response.match.match_id);
              setMatchVisible(true);
              if (!hasTriggeredMatchPromotionRef.current) {
                hasTriggeredMatchPromotionRef.current = true;
                handleTryShowPromotion();
              }
            }
          },
          onError: (e) => {
            if (isInsufficientCreditsError(e)) {
              // Restore the profile card so the user can retry after purchasing credits
              shownIdsRef.current.delete(card.user_id);
              setSwipedIds((prev) => { const n = new Set(prev); n.delete(card.user_id); return n; });
              setDisplayQueue((prev) => {
                const filtered = prev.filter((c) => c.user_id !== card.user_id);
                return [card, ...filtered];
              });
              return; // global InsufficientCreditsModal already shown by interceptor
            }
            if (!isLimitExceededError(e)) return;
            const errorType = getQuotaErrorType(e);
            if (isSuperLike || errorType === 'SUPER_LIKE') {
              shownIdsRef.current.delete(card.user_id);
              setSwipedIds((prev) => { const n = new Set(prev); n.delete(card.user_id); return n; });
              setDisplayQueue((prev) => {
                const filtered = prev.filter((c) => c.user_id !== card.user_id);
                return [card, ...filtered];
              });
            } else if (direction === 'LIKE' || errorType === 'LIKES') {
              shownIdsRef.current.delete(card.user_id);
              setSwipedIds((prev) => { const n = new Set(prev); n.delete(card.user_id); return n; });
              setDisplayQueue((prev) => {
                const filtered = prev.filter((c) => c.user_id !== card.user_id);
                return [card, ...filtered];
              });
            } else {
              return;
            }
            showActionErrorAlert(e, router, {
              subscriptionEnabled: entitlements?.country_settings?.subscription_enabled ?? true,
              creditsEnabled: entitlements?.country_settings?.credits_enabled ?? true,
            });
          },
        },
      );
    },
    [swipe, router, onReviewMatch, handleTryShowPromotion, entitlements, notifPrompt, idVerifPrompt],
  );

  // ── Rewind handler ──────────────────────────────────────────────────────────
  const handleRewind = useCallback(async () => {
    if (isRewindingRef.current) return;
    isRewindingRef.current = true;
    setIsRewinding(true);
    await scrollToTop();
    rewind(undefined, {
      onSuccess: (response) => {
        const rawProfile    = response.restored_profile;
        const actionType    = response.reversed_action_type;
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
          setDisplayQueue((prev) => {
            // Avoid duplicates: remove any existing entry for this user before prepending
            const filtered = prev.filter((c) => c.user_id !== restoredCard.user_id);
            return [restoredCard, ...filtered];
          });
          shownIdsRef.current.add(restoredCard.user_id);
          setTimeout(() => {
            setRewindIncoming(false);
            isRewindingRef.current = false;
            setIsRewinding(false);
          }, 600);
        } else {
          isRewindingRef.current = false;
          setIsRewinding(false);
        }
      },
      onError: (e) => {
        isRewindingRef.current = false;
        setIsRewinding(false);
        if (isInsufficientCreditsError(e)) {
          return;
        } else if (isLimitExceededError(e)) {
          showActionErrorAlert(e, router, {
            subscriptionEnabled: entitlements?.country_settings?.subscription_enabled ?? true,
            creditsEnabled: entitlements?.country_settings?.credits_enabled ?? true,
          });
        }
      },
    });
  }, [rewind, scrollToTop, entitlements]);

  // ── Button handlers ─────────────────────────────────────────────────────────
  const handlePass = useCallback(async () => {
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('PASS');
  }, [scrollToTop]);

  const handleLike = useCallback(async () => {
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('LIKE');
  }, [scrollToTop]);

  const handleOpenSuperMessage = useCallback(
    (userId: string, displayName: string, photoUrl: string | null) => {
      setSuperMessageTarget({ userId, displayName, photoUrl });
    },
    [],
  );

  const handleSendSuperMessage = useCallback(
    (targetUserId: string, message: string) => {
      sendSuperMessage.mutate(
        { targetUserId, message },
        {
          onSuccess: () => {
            setSuperMessageTarget(null);
            router.push('/(app)/messages' as any);
          },
          onError: (err: any) => {
            setSuperMessageTarget(null);
            if (isInsufficientCreditsError(err)) return; // global modal already shown

            // 409 — user already has an active Before Match Message for this person
            const apiCode = err?.response?.data?.error?.code;
            if (apiCode === 'DUPLICATE_ACTIVE_ACTION') {
              themedAlert({
                title: 'Message Already Sent',
                message:
                  "You've already sent a Before Match Message to this person. You can only send one message before matching.",
                icon: 'chatbubble-ellipses',
                iconColor: colors.primary,
                buttons: [{ text: 'OK' }],
              });
              return;
            }

            showActionErrorAlert(err, router, {
              subscriptionEnabled: entitlements?.country_settings?.subscription_enabled ?? true,
              creditsEnabled: entitlements?.country_settings?.credits_enabled ?? true,
            });
          },
        },
      );
    },
    [sendSuperMessage, router, entitlements],
  );

  const handleSuperLike = useCallback(async () => {
    pendingSuperLikeRef.current = true;
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('LIKE');
  }, [scrollToTop]);

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
      <Animated.View style={[{ overflow: 'hidden' }, headerContainerStyle]}>
      <View style={styles.header}>
        {/* Mode toggle — replaces Qaliye logo */}
        <TouchableOpacity
          style={styles.logoContainer}
          onPress={() => {
            if (modeSwitching) return;
            setModeSwitching(true);
            setViewMode(viewMode === 'swipe' ? 'browse' : 'swipe');
          }}
          disabled={modeSwitching}
          activeOpacity={0.7}
          accessibilityLabel={viewMode === 'swipe' ? 'Switch to browse mode' : 'Switch to swipe mode'}
          accessibilityRole="button"
        >
          {viewMode === 'swipe' ? (
            <Ionicons name="grid-outline" size={22} color={th.text} />
          ) : (
            <SwipeIcon color={th.text} active={false} inactiveFill={isDark ? '#E5E7EB' : '#0B0B0B'} />
          )}
        </TouchableOpacity>

        {/* Rewind — browse mode only */}
        {viewMode === 'browse' && (
          <TouchableOpacity
            style={[styles.settingsBtn, { borderColor: th.border, backgroundColor: isDark ? th.backgroundElement : th.surface, borderWidth: 1.5 }]}
            onPress={() => setBrowseRewindTrigger((n) => n + 1)}
            activeOpacity={0.7}
            disabled={!checkCanRewind(entitlements)}
            accessibilityLabel="Rewind last action"
            accessibilityRole="button"
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '700',
                color: checkCanRewind(entitlements) ? '#F97316' : th.textSecondary,
              }}
            >
              ↺
            </Text>
          </TouchableOpacity>
        )}

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

      {bannerPromotions.length > 0 && (
        <PromotionBanner
          promotions={bannerPromotions}
          currentIndex={bannerIndex}
          onDismiss={dismissBanner}
          onTap={handleBannerTap}
          onSwipeToIndex={bannerSwipeToIndex}
          onInteractionStart={bannerInteractionStart}
          onInteractionEnd={bannerInteractionEnd}
        />
      )}
      </Animated.View>

      {/* ── Main content (scrollable + fixed buttons) ── */}
      <View style={styles.main}>
        {viewMode === 'browse' ? (
          <BrowseModeGrid
            cards={apiCards}
            isLoading={isLoading}
            isError={isError}
            onRefresh={refetch}
            isRefreshing={isRefetching}
            onSwitchToSwipe={() => setViewMode('swipe')}
            onMatch={(response) => {
              if (response.is_match && response.match) {
                setMatchName(response.match.other_user.display_name);
                setMatchPhoto(response.match.other_user.primary_photo_url ?? undefined);
                setMatchId(response.match.match_id);
                setMatchVisible(true);
                if (!hasTriggeredMatchPromotionRef.current) {
                  hasTriggeredMatchPromotionRef.current = true;
                  handleTryShowPromotion();
                }
              }
            }}
            onRewind={() => {}}
            canRewind={checkCanRewind(entitlements)}
            canSuperLike={checkCanSuperLike(entitlements)}
            onSuperMessage={handleOpenSuperMessage}
            rewindTrigger={browseRewindTrigger}
            swipedIds={swipedIds}
            onCardAction={(userId, swiped, card) => {
              setSwipedIds((prev) => {
                const next = new Set(prev);
                if (swiped) next.add(userId);
                else next.delete(userId);
                return next;
              });
              if (swiped) {
                setDisplayQueue((prev) => prev.filter((c) => c.user_id !== userId));
              } else if (card) {
                setDisplayQueue((prev) => {
                  if (prev.some((c) => c.user_id === userId)) return prev;
                  return [card, ...prev];
                });
              }
            }}
            onLikeSuccess={(isMatch) => {
              // Don't show the prompt when a match overlay is about to appear.
              if (!isMatch) {
                idVerifPrompt.onLikeOrSuperLike(notifPrompt.visible);
              }
            }}
          />
        ) : (
        <>
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
          <Animated.View style={[styles.cardArea, cardAreaAnimStyle]}>

            {showAnimation ? (
              <FindingMatchesAnimation
                accentColor={colors.primary}
                textColor={th.text}
                subtitleColor={th.textSecondary}
                gender={profileDto?.gender}
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

            {/* Rewind loading overlay */}
            {isRewinding && (
              <View style={styles.rewindOverlay} pointerEvents="none">
                <View style={[styles.rewindSpinnerWrap, { backgroundColor: isDark ? th.backgroundElement : th.surface }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.rewindSpinnerText, { color: th.textSecondary }]}>Getting them back…</Text>
                </View>
              </View>
            )}

            {/* Scroll-down hint — overlaid on bottom center of card */}
            {topCard && (
              <View style={styles.scrollHintOverlay} pointerEvents="none">
                <ScrollHint color="#FFFFFF" />
              </View>
            )}
          </Animated.View>

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
          <View style={[styles.actionOverlay, { bottom: TOTAL_TAB + 30, right: getActionOverlayRight(SCREEN_W) }]}>
            <CardActionButtons
              onRewind={handleRewind}
              onPass={handlePass}
              onLike={handleLike}
              onSuperLike={handleSuperLike}
              onSuperMessage={() => {
                const top = displayQueue[0];
                if (top) handleOpenSuperMessage(top.user_id, top.display_name, top.photos?.[0]?.image_url ?? null);
              }}
            />
          </View>
        )}
        </>
        )}
      </View>

      {/* ── Mode switching overlay ── */}
      {modeSwitching && (
        <View style={styles.modeSwitchOverlay} pointerEvents="none">
          <View style={[styles.rewindSpinnerWrap, { backgroundColor: isDark ? th.backgroundElement : th.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.rewindSpinnerText, { color: th.textSecondary }]}>Switching…</Text>
          </View>
        </View>
      )}

      {/* ── Overlays ───────────────────────────────── */}
      <MatchCelebrationOverlay
        visible={matchVisible}
        name={matchName}
        photoUrl={matchPhoto}
        myPhotoUrl={profileDto?.primary_photo_url ?? undefined}
        onSendMessage={() => {
          setMatchVisible(false);
          onReviewMatch();
          if (matchId) {
            router.push({
              pathname: '/(app)/chat' as any,
              params: { matchId, displayName: matchName },
            });
          }
        }}
        onKeepSwiping={() => {
          setMatchVisible(false);
          onReviewMatch();
          // Delay so the match overlay's fade-out completes (~300ms) before
          // the notification prompt appears — prevents two modals overlapping.
          setTimeout(() => notifPrompt.onMatch(), 400);
        }}
      />

      {/* ── Super Message compose modal ── */}
      <SuperMessageModal
        visible={!!superMessageTarget}
        target={superMessageTarget}
        isSending={sendSuperMessage.isPending}
        onSend={handleSendSuperMessage}
        onClose={() => setSuperMessageTarget(null)}
      />

      {/* ── Promotion alert — temporary, non-blocking ── */}
      <PromotionAlert
        promotion={activePromotion}
        onExplicitDismiss={handleExplicitDismissPromotion}
        onProgrammaticClose={handleProgrammaticClosePromotion}
        onSuccess={handlePromotionSuccess}
      />

      {/* ── Notification prompt — shown on first like ── */}
      <NotificationPromptModal
        visible={notifPrompt.visible}
        isLoading={notifPrompt.isLoading}
        onEnable={notifPrompt.handleEnable}
        onDismiss={notifPrompt.handleDismiss}
      />

      {/* ── Identity verification nudge — shown on a progressive schedule ── */}
      <IdentityVerificationPromptModal
        visible={idVerifPrompt.visible}
        onVerifyNow={idVerifPrompt.handleVerifyNow}
        onDismiss={idVerifPrompt.handleDismiss}
      />

      {/* InsufficientCreditsModal is mounted globally in _layout.tsx */}
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
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingTop: 4,
    paddingBottom: 4,
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

  // ── Mode switch overlay ──────────────────────────────────────────────
  modeSwitchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)',
    zIndex: 50,
  },

  // ── Rewind overlay ─────────────────────────────────────────────────────
  rewindOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  rewindSpinnerWrap: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  rewindSpinnerText: {
    fontSize: 14,
    fontWeight: '600',
  },


});
