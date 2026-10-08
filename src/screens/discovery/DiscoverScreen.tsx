import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEFAULT_LIKE_VARIANT_CODE } from '@/api/discovery/discoveryApi';
import { PromoListSheet } from '@/components/billing/PromoListSheet';
import { PromotionAlert } from '@/components/billing/PromotionAlert';
import { themedAlert, themedAlertDismiss } from '@/components/common/ThemedAlert';
import ActionRail from '@/components/discovery/ActionRail';
import BrowseModeGrid from '@/components/discovery/BrowseModeGrid';
import CardStack, { CardStackHandle } from '@/components/discovery/CardStack';
import MatchCelebrationOverlay from '@/components/discovery/MatchCelebrationOverlay';
import MorePhotosSection from '@/components/discovery/MorePhotosSection';
import { CardDto } from '@/components/discovery/ProfileCard';
import ProfileDetailsSection from '@/components/discovery/ProfileDetailsSection';
import { BANNER_H, PromotionBanner } from '@/components/discovery/PromotionBanner';
import SuperMessageModal, { type SuperMessageTarget } from '@/components/discovery/SuperMessageModal';
import TopLeftActionButtons from '@/components/discovery/TopLeftActionButtons';
import { SwipeIcon } from '@/components/layout/AppTabBar';
import { NotificationPromptModal } from '@/components/notifications/NotificationPromptModal';
import { IdentityVerificationPromptModal } from '@/components/profile/IdentityVerificationPromptModal';
import { bdGradients } from '@/constants/blindDateTheme';
import { colors, gradients, radius, spacing } from '@/constants/theme';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useActivateBoost } from '@/hooks/billing/useActivateBoost';
import { isPromoCurrentlyValid, isPromoStructurallyValid, useEligiblePromotions } from '@/hooks/billing/useEligiblePromotions';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { usePromotionBanner } from '@/hooks/billing/usePromotionBanner';
import { mapProfileToCard, useDiscoveryProfiles } from '@/hooks/discovery/useDiscoveryProfiles';
import { useLikeActions } from '@/hooks/discovery/useLikeActions';
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
  getBoostStatus,
  getQuotaErrorType,
  isInsufficientCreditsError,
  isLimitExceededError
} from '@/utils/entitlements';
import { defaultLikeVariant } from '@/utils/likeVariants';
import { showActionErrorAlert } from '@/utils/limitExceededAlert';
import { isBlindDateMatch } from '@/utils/matchSource';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const HEADER_H = 56;
const TAB_BAR_PADDING = 18;
const TAB_BAR_H = 68;

// Ways-to-meet pills layout. false = both pills inline in the header center
// and boost sits on the swipe card's action rail; true = dedicated pills row
// under the header with the single Blind Date pill + boost back in the header.
const FEATURE_PILLS_ROW = false;
const PILLS_ROW_H = FEATURE_PILLS_ROW ? 52 : 0;

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

/** Loader artwork for the *opposite* gender — a male viewer sees the female icon and vice versa. */
function loaderIconForGender(gender?: string | null) {
  if (gender === 'MALE') return require('@/assets/images/loader/loader-icon-female.webp');
  if (gender === 'FEMALE') return require('@/assets/images/loader/loader-icon-male.webp');
  return require('@/assets/images/loader/loader-icon-male-and-female.webp');
}

function FindingMatchesAnimation({ accentColor, textColor, subtitleColor, gender }: {
  accentColor: string;
  textColor: string;
  subtitleColor: string;
  gender?: string;
}) {
  const { t } = useTranslation();
  const loaderIcon = loaderIconForGender(gender);
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
        {t('discovery.findingMatches')}
      </Text>
      <Text style={{ color: subtitleColor, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
        {t('discovery.findingMatchesSubtitle')}
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
// Feature pills — compact "ways to meet" links (header center or pills row)
// ---------------------------------------------------------------------------
type FeaturePillProps = {
  label: string;
  onPress: () => void;
  /** Dense header/pills-row contexts — shrink the icon to leave room. */
  compact?: boolean;
  /** Stretch to fill the parent row cell instead of hugging content. */
  fill?: boolean;
  isDark: boolean;
};

/** Blind Date — primary CTA: hero gradient, mask icon on a white chip. */
function BlindDateButton({ label, onPress, compact, fill, isDark }: FeaturePillProps) {
  return (
    <TouchableOpacity
      style={[styles.featurePill, styles.blindDateBtn, fill && styles.featurePillFill]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={bdGradients.hero as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
      />
      <View style={styles.bdIconChip}>
        <Image
          source={require('@/assets/images/blind-date-icon.png')}
          style={[styles.blindDateIcon, compact && styles.blindDateIconCompact]}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.featurePillText, { color: '#FFFFFF' }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Boost control (center of header)
// ---------------------------------------------------------------------------
type BoostControlProps = {
  boostStatus: ReturnType<typeof getBoostStatus>;
  isActivating: boolean;
  onActivate: () => void;
  /** Tap on the active badge → show the boost-active modal. */
  onShowStatus: () => void;
  themeColors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
};

function BoostControl({ boostStatus, isActivating, onActivate, onShowStatus, themeColors, isDark }: BoostControlProps) {
  const { t } = useTranslation();
  if (boostStatus.isActive) {
    // Icon-only badge — a labelled pill here overflows the header row and
    // clips off the left edge on narrower screens. Tappable: opens the
    // boost-active status modal.
    return (
      <TouchableOpacity
        onPress={onShowStatus}
        activeOpacity={0.8}
        style={boostStyles.boostedBadge}
        accessibilityRole="button"
        accessibilityLabel={t('discovery.boost.activeLabel')}
        accessibilityHint={t('discovery.boost.activeHint')}
      >
        <Ionicons name="rocket" size={20} color="#FFF" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onActivate}
      disabled={isActivating}
      activeOpacity={0.7}
      style={[
        boostStyles.boostBtn,
        boostStyles.boostBtnGlow,
        {
          backgroundColor: isDark ? themeColors.backgroundElement : themeColors.surface,
          borderColor: colors.primary,
          borderWidth: 1.5,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={t('discovery.boost.activateTitle')}
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
  // Same 42×42 footprint as boostBtn so the header layout stays identical
  // whether boost is active or not.
  boostedBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
  boostBtnGlow: {
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
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
  // Scroll offset as a shared value — the card's action buttons counter-
  // translate by this so they stay pinned on screen while the card scrolls.
  const scrollY              = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => { scrollY.value = e.contentOffset.y; },
  });
  const isRewindingRef        = useRef(false);
  // Holds the variant code explicitly picked via the rail; null = send the
  // catalog's default variant (resolved at swipe time via `is_default`).
  const pendingLikeVariantRef = useRef<string | null>(null);
  const shownIdsRef           = useRef<Set<string>>(new Set());
  const lastSwipedCardRef     = useRef<CardDto | null>(null);
  const lastSwipedDirRef      = useRef<'LIKE' | 'PASS'>('LIKE');
  const prevIsRefetchingRef   = useRef(false);

  const [displayQueue, setDisplayQueue] = useState<CardDto[]>([]);
  const [rewindIncoming, setRewindIncoming] = useState<'LIKE' | 'PASS' | false>(false);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [matchPhoto, setMatchPhoto] = useState<string | undefined>(undefined);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchIsBlindDate, setMatchIsBlindDate] = useState(false);
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
    isFetchNextPageError,
    cursorReset,
    isRefetching,
  } = useDiscoveryProfiles();

  const { mutate: swipe } = useSwipeAction();
  const { variants: likeVariants } = useLikeActions();
  const defaultLikeCode = defaultLikeVariant(likeVariants)?.code ?? DEFAULT_LIKE_VARIANT_CODE;
  const sendSuperMessage = useSendSuperMessage();
  const { onMatch: onReviewMatch } = useReviewPrompt();
  const notifPrompt = useNotificationPrompt();
  const idVerifPrompt = useIdentityVerificationPrompt();
  const { mutate: rewind } = useRewind();
  const { entitlements, refreshEntitlements } = useEntitlements();

  const userId = useCurrentUserId();
  const { tryShowPromotion, hasActivePremium, data: eligiblePromoData, refetch: refetchPromos } = useEligiblePromotions(userId);
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

  // ── Promo entry icon ─────────────────────────────────────────────────────
  // Promos the backend already deems this user entitled to (status, time
  // window, country, gender, eligibility type, global + per-user caps are all
  // checked server-side). The icon is a passive, user-initiated entry point —
  // intentionally NOT gated by the display-frequency rules (dismissal
  // cooldowns, shown-this-session, permanentlyHidden) that limit the proactive
  // banner, so it stays visible as long as any entitled promo exists.
  const entryPromos = useMemo(() => {
    const now = new Date();
    return (eligiblePromoData ?? []).filter(
      (p) =>
        (!hasActivePremium || p.benefit_type === 'CREDITS') &&
        isPromoStructurallyValid(p) &&
        isPromoCurrentlyValid(p, now),
    );
  }, [eligiblePromoData, hasActivePremium]);

  // Route a non-claimable promotion to the shop — the same targets as the
  // banner CTA and PromotionAlert's "View offer".
  const routePromoToShop = useCallback(
    (promo: EligiblePromotionDto) => {
      const isCreditsPromo =
        promo.benefit_type === 'CREDITS' ||
        (promo.consumable_product_id != null && promo.subscription_product_id == null);
      router.push((isCreditsPromo ? '/(app)/credits-shop' : '/(app)/premium') as any);
    },
    [router],
  );

  const [promoListOpen, setPromoListOpen] = useState(false);

  const handlePromoEntryTap = useCallback(() => {
    if (entryPromos.length === 0) return;
    // Multiple entitled promos → let the user pick; single promo → straight
    // to its action.
    if (entryPromos.length > 1) {
      setPromoListOpen(true);
      return;
    }
    const promo = entryPromos[0];
    if (promo.can_redeem) {
      setActivePromotion(promo);
      return;
    }
    routePromoToShop(promo);
  }, [entryPromos, routePromoToShop]);

  const handlePromoListSelect = useCallback(
    (promo: EligiblePromotionDto) => {
      setPromoListOpen(false);
      if (promo.can_redeem) {
        setActivePromotion(promo);
        return;
      }
      routePromoToShop(promo);
    },
    [routePromoToShop],
  );

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
    
    if (!userId) return;
    if (activePromotionRef.current) return;
    const promo = await tryShowPromotion();
    
    if (!promo) return;
    if (matchVisibleRef.current) {
      
      pendingPromotionRef.current = promo;
      return;
    }
    
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

  // Keep the promo entry icon in sync with backend entitlement whenever the
  // discovery tab regains focus.
  useFocusEffect(
    useCallback(() => {
      if (userId) refetchPromos();
    }, [userId, refetchPromos]),
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
      title: t('discovery.boost.activateTitle'),
      message: t('discovery.boost.confirmMessage', { minutes: boostStatus.durationMinutes }),
      icon: 'rocket',
      iconColor: colors.primary,
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('discovery.boost.activate'),
          style: 'default',
          onPress: () => {
            themedAlert({
              title: t('discovery.boost.activating'),
              loading: true,
              buttons: [],
            });
            activateBoost.mutate(undefined, {
              onSuccess: () => {
                themedAlert({
                  title: t('discovery.boost.activeSuccessTitle'),
                  message: t('discovery.boost.activeSuccessMessage'),
                  icon: 'checkmark-circle',
                  iconColor: colors.success,
                  buttons: [{ text: t('common.ok') }],
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
                    title: t('discovery.boost.alreadyActiveTitle'),
                    message: t('discovery.boost.alreadyActiveMessage'),
                    icon: 'rocket',
                    iconColor: colors.primary,
                    buttons: [{ text: t('common.ok') }],
                  });
                } else {
                  themedAlert({
                    title: t('discovery.boost.failedTitle'),
                    message: err.message || t('discovery.boost.failedMessage'),
                    icon: 'alert-circle',
                    iconColor: colors.danger,
                    buttons: [{ text: t('common.ok') }],
                  });
                }
                refreshEntitlements();
              },
            });
          },
        },
      ],
    });
  }, [activateBoost, boostStatus, refreshEntitlements, t]);

  // Tapping the active boost badge → status modal with remaining time.
  const handleBoostStatusPress = useCallback(() => {
    const mins = Math.max(1, Math.ceil(boostStatus.remainingSeconds / 60));
    themedAlert({
      title: t('discovery.boost.statusTitle'),
      message: t('discovery.boost.statusMessage', { count: mins }),
      icon: 'rocket',
      iconColor: colors.primary,
      buttons: [{ text: t('common.ok') }],
    });
  }, [boostStatus, t]);

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


  // Pre-fetch next page when queue is running low. The isFetchNextPageError
  // guard stops this effect from re-firing after every failed attempt —
  // isFetchingNextPage flipping false would otherwise retrigger fetchNextPage
  // in an unbounded loop while the queue stays <= 3.
  useEffect(() => {
    if (displayQueue.length <= 3 && hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      fetchNextPage();
    }
  }, [displayQueue.length, hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  // ── Layout constants ────────────────────────────────────────────────────────
  const TOTAL_TAB = TAB_BAR_PADDING + TAB_BAR_H + Math.max(safeBottom, 12);
  const CARD_AREA_H = SCREEN_H - HEADER_H - PILLS_ROW_H - TOTAL_TAB - 12;

  const headerContainerStyle = useAnimatedStyle(() => ({
    height: HEADER_H + PILLS_ROW_H + bannerHeightSV.value,
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
      // Marriage & relationship prefs (snake_case primary, camelCase fallback)
      marriage_timeline: topProfileDetail.marriage_timeline ?? topProfileDetail.marriageTimeline ?? topCard.marriage_timeline,
      long_distance_relationship: topProfileDetail.long_distance_relationship ?? topProfileDetail.longDistanceRelationship ?? topCard.long_distance_relationship,
      family_involvement: topProfileDetail.family_involvement ?? topProfileDetail.familyInvolvement ?? topCard.family_involvement,
      religion_importance: topProfileDetail.religion_importance ?? topProfileDetail.religionImportance ?? topCard.religion_importance,
      willing_to_relocate: topProfileDetail.willing_to_relocate ?? topProfileDetail.willingToRelocate ?? topCard.willing_to_relocate,
    };
  }, [topCard, topProfileDetail]);

  // ── Scroll helper ───────────────────────────────────────────────────────────
  const scrollToTop = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (scrollY.value <= 2) { resolve(); return; }
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        setTimeout(resolve, 320);
      }),
    [scrollY],
  );

  // ── Swipe handler ───────────────────────────────────────────────────────────
  const handleSwipe = useCallback(
    (direction: 'LIKE' | 'PASS', card: CardDto) => {
      const likeVariantCode = pendingLikeVariantRef.current ?? defaultLikeCode;
      pendingLikeVariantRef.current = null;
      lastSwipedCardRef.current = card;
      lastSwipedDirRef.current  = direction;
      setDisplayQueue((prev) => prev.filter((c) => c.user_id !== card.user_id));
      setSwipedIds((prev) => new Set(prev).add(card.user_id));
      swipe(
        {
          type: direction,
          targetUserId: card.user_id,
          actionVariantCode: likeVariantCode,
        },
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
              setMatchIsBlindDate(isBlindDateMatch(response.match));
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
            if (errorType === 'SUPER_LIKE') {
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
    [swipe, router, onReviewMatch, handleTryShowPromotion, entitlements, notifPrompt, idVerifPrompt, defaultLikeCode],
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
          // Remove from swipedIds so the restored profile is visible in Browse Mode too
          setSwipedIds((prev) => {
            const next = new Set(prev);
            next.delete(restoredCard.user_id);
            return next;
          });
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
        } else {
          // Anything else (nothing to undo, network failure…) — don't leave
          // the tap as a silent no-op.
          themedAlert({
            title: t('discovery.rewindFailedTitle', { defaultValue: 'Could not rewind' }),
            message: t('discovery.rewindFailedMessage', { defaultValue: 'There is no recent action to undo, or the connection failed. Please try again.' }),
            icon: 'arrow-undo-outline',
            iconColor: colors.warning,
            buttons: [{ text: t('common.ok') }],
          });
        }
      },
    });
  }, [rewind, scrollToTop, entitlements, router, t]);

  // ── Button handlers ─────────────────────────────────────────────────────────
  const handlePass = useCallback(async () => {
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('PASS');
  }, [scrollToTop]);

  const handleLikeVariant = useCallback(async (actionVariantCode: string) => {
    pendingLikeVariantRef.current = actionVariantCode;
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
          onSuccess: (sm) => {
            setSuperMessageTarget(null);
            // The send consumed this card — remove it from both queues like a
            // swipe does, otherwise it lingers in swipe/browse until refetch.
            setDisplayQueue((prev) => prev.filter((c) => c.user_id !== targetUserId));
            setSwipedIds((prev) => new Set(prev).add(targetUserId));
            if (sm.match_id) {
              // Receiver had already liked us — instant match.
              setMatchName(sm.receiver?.display_name ?? '');
              setMatchPhoto(sm.receiver?.photo_url ?? undefined);
              setMatchId(sm.match_id);
              setMatchIsBlindDate(false);
              setMatchVisible(true);
              if (!hasTriggeredMatchPromotionRef.current) {
                hasTriggeredMatchPromotionRef.current = true;
                handleTryShowPromotion();
              }
            } else {
              router.push('/(app)/messages' as any);
            }
          },
          onError: (err: any) => {
            setSuperMessageTarget(null);
            if (isInsufficientCreditsError(err)) return; // global modal already shown

            // 409 — user already has an active Before-Match Message for this person
            const apiCode = err?.response?.data?.error?.code;
            if (apiCode === 'DUPLICATE_ACTIVE_ACTION') {
              themedAlert({
                title: t('discovery.superMessage.alreadySentTitle'),
                message: t('discovery.superMessage.alreadySentMessage'),
                icon: 'chatbubble-ellipses',
                iconColor: colors.primary,
                buttons: [{ text: t('common.ok') }],
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
    [sendSuperMessage, router, entitlements, handleTryShowPromotion],
  );

  // Cards the API has returned but the sync effect hasn't moved into the
  // display queue yet (one-frame gap between apiCards changing and the effect
  // running). Prevents the "no more profiles" state from flickering on render.
  // Cards that are all already in shownIdsRef don't count — that's the real
  // end of the feed, not a pending sync.
  const pendingSyncCards =
    displayQueue.length === 0 &&
    apiCards.some((c) => !shownIdsRef.current.has(c.user_id));
  // Keep the suspense loader visible while fetching, while a sync is pending,
  // or while the queue is empty but a next page exists. Note: apiCards.length
  // must not be used here — it accumulates every fetched card and never
  // shrinks, so it can't tell an empty deck mid-feed from an exhausted one.
  const showAnimation =
    (isLoading || syncingCards || pendingSyncCards || (displayQueue.length === 0 && hasNextPage)) &&
    !loadingTimedOut &&
    !isError;
  const isEmpty =
    !isLoading && !isError && !syncingCards && displayQueue.length === 0 && !hasNextPage && !isFetchingNextPage;

  const errorInfo = isError
    ? (() => {
        const err = discoveryError as any;
        const code = err?.response?.data?.error?.code ?? err?.code;
        const backendMsg = err?.response?.data?.error?.message ?? err?.message;
        if (code === 'DISCOVERY_ACTOR_INELIGIBLE') {
          return {
            icon: 'person-circle-outline' as const,
            title: t('discovery.errorAccountNotReady'),
            subtitle: t('discovery.errorAccountNotReadySubtitle'),
          };
        }
        if (err?.response?.status === 403) {
          return {
            icon: 'lock-closed-outline' as const,
            title: t('discovery.errorAccessRestricted'),
            subtitle: backendMsg ?? t('discovery.errorAccessRestrictedSubtitle'),
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
        <View style={styles.headerLeft}>
          {/* Mode toggle — replaces Qaliye logo */}
          <TouchableOpacity
            style={[styles.settingsBtn, styles.modeToggleBtn, { borderColor: colors.primary, backgroundColor: isDark ? th.backgroundElement : th.surface, borderWidth: 1.5 }]}
            onPress={() => {
              if (modeSwitching) return;
              setModeSwitching(true);
              setViewMode(viewMode === 'swipe' ? 'browse' : 'swipe');
            }}
            disabled={modeSwitching}
            activeOpacity={0.7}
            accessibilityLabel={viewMode === 'swipe' ? t('discovery.switchToBrowse') : t('discovery.switchToSwipe')}
            accessibilityRole="button"
          >
            {viewMode === 'swipe' ? (
              <Ionicons name="grid-outline" size={22} color={colors.primary} />
            ) : (
              <SwipeIcon color={colors.primary} active={false} inactiveFill={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Blind date button — centered between the mode toggle and the right cluster */}
        <View style={styles.blindDateCenterWrap}>
          <BlindDateButton
            label={t('discovery.blindDate', { defaultValue: 'Try Blind Dating' })}
            onPress={() => router.push('/(app)/blind-date' as any)}
            compact={viewMode === 'browse'}
            isDark={isDark}
          />
        </View>

        <View style={styles.headerRight}>
          {/* Incognito indicator OR Boost control */}
          {isIncognito ? (
            <View style={styles.incognitoIndicator}>
              <Ionicons name="eye-off" size={12} color={th.textSecondary} />
              <Text style={[styles.incognitoText, { color: th.textSecondary }]}>{t('discovery.privateMode')}</Text>
            </View>
          ) : (
            <BoostControl
              boostStatus={boostStatus}
              isActivating={activateBoost.isPending}
              onActivate={handleBoostActivate}
              onShowStatus={handleBoostStatusPress}
              themeColors={th}
              isDark={isDark}
            />
          )}

          {/* Settings / Preferences */}
          <TouchableOpacity
            style={[styles.settingsBtn, styles.modeToggleBtn, { borderColor: colors.primary, backgroundColor: isDark ? th.backgroundElement : th.surface, borderWidth: 1.5 }]}
            onPress={() => router.push('/(app)/preferences')}
            activeOpacity={0.7}
            accessibilityLabel={t('discovery.openPreferences')}
          >
            <Ionicons name="options-outline" size={21} color={colors.primary} />
          </TouchableOpacity>
        </View>
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
            onSwitchToSwipe={() => {
              if (modeSwitching) return;
              setModeSwitching(true);
              setViewMode('swipe');
            }}
            onMatch={(response) => {
              if (response.is_match && response.match) {
                setMatchName(response.match.other_user.display_name);
                setMatchPhoto(response.match.other_user.primary_photo_url ?? undefined);
                setMatchId(response.match.match_id);
                setMatchIsBlindDate(isBlindDateMatch(response.match));
                setMatchVisible(true);
                if (!hasTriggeredMatchPromotionRef.current) {
                  hasTriggeredMatchPromotionRef.current = true;
                  handleTryShowPromotion();
                }
              }
            }}
            onRewind={() => {}}
            canRewind={checkCanRewind(entitlements)}
            likeVariants={likeVariants}
            onSuperMessage={handleOpenSuperMessage}
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
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        ) : (
        <>
        <Animated.ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: TOTAL_TAB + 8 - 50 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
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
                  <Image
                    source={loaderIconForGender(profileDto?.gender)}
                    style={{ width: 112, height: 112 }}
                    resizeMode="contain"
                  />
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
                {/* Rewind — restores the last passed/liked card back into the
                    empty queue via the existing handleRewind flow. */}
                <TouchableOpacity
                  style={[styles.emptyBtnSecondary, { borderColor: th.border }]}
                  activeOpacity={0.85}
                  onPress={handleRewind}
                  disabled={isRewinding}
                >
                  {isRewinding ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="arrow-undo-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.emptyBtnSecondaryText, { color: th.text }]}>
                    {t('discovery.rewindLastAction')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : isError && errorInfo && displayQueue.length === 0 ? (
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
                scrollY={scrollY}
                topActions={
                  <TopLeftActionButtons
                    onPass={handlePass}
                    onRewind={handleRewind}
                    onSuperMessage={() => {
                      const top = displayQueue[0];
                      if (top) handleOpenSuperMessage(top.user_id, top.display_name, top.photos?.[0]?.image_url ?? null);
                    }}
                  />
                }
                topRightActions={
                  <ActionRail variants={likeVariants} onSelect={handleLikeVariant} />
                }
              />
            )}


            {/* Rewind loading overlay */}
            {isRewinding && (
              <View style={styles.rewindOverlay} pointerEvents="none">
                <View style={[styles.rewindSpinnerWrap, { backgroundColor: isDark ? th.backgroundElement : th.surface }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.rewindSpinnerText, { color: th.textSecondary }]}>{t('discovery.gettingItBack')}</Text>
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
        </Animated.ScrollView>

        </>
        )}

        {/* Promo entry icon — pinned to the top-left corner of the card
            area. Stays visible whenever the user has backend-entitled
            promos, even after the banner auto-dismisses. */}
        {entryPromos.length > 0 && (
          <TouchableOpacity
            style={styles.promoFab}
            onPress={handlePromoEntryTap}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('promotion.giftA11y', 'View your promotions')}
          >
            <LinearGradient
              colors={isDark ? ['#5B18D6', '#3B0FA0'] : gradients.romantic}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoFabCircle}
            >
              <Ionicons name="gift" size={19} color="#FFFFFF" />
            </LinearGradient>
            {entryPromos.length > 1 && (
              <View style={styles.promoFabBadge} pointerEvents="none">
                <Text style={styles.promoFabBadgeText}>{entryPromos.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Mode switching overlay ── */}
      {modeSwitching && (
        <View style={styles.modeSwitchOverlay} pointerEvents="none">
          <View style={[styles.rewindSpinnerWrap, { backgroundColor: isDark ? th.backgroundElement : th.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.rewindSpinnerText, { color: th.textSecondary }]}>{t('discovery.switching')}</Text>
          </View>
        </View>
      )}

      {/* ── Overlays ───────────────────────────────── */}
      <MatchCelebrationOverlay
        visible={matchVisible}
        name={matchName}
        photoUrl={matchPhoto}
        myPhotoUrl={profileDto?.primary_photo_url ?? undefined}
        isBlindDate={matchIsBlindDate}
        onSendMessage={() => {
          setMatchVisible(false);
          onReviewMatch();
          if (matchId) {
            router.push({
              pathname: '/(app)/chat' as any,
              params: {
                matchId,
                displayName: matchName,
                ...(matchIsBlindDate ? { matchSource: 'BLIND_DATE' } : {}),
              },
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

      {/* ── Promo list — pick among multiple entitled promotions ── */}
      <PromoListSheet
        visible={promoListOpen}
        promotions={entryPromos}
        onSelect={handlePromoListSelect}
        onClose={() => setPromoListOpen(false)}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blindDateCenterWrap: {
    flex: 1,
    alignItems: 'center',
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
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modeToggleBtn: {
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  featurePillFill: {
    flex: 1,
    justifyContent: 'center',
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  blindDateBtn: {
    borderWidth: 0,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bdIconChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  blindDateIcon: {
    width: 40,
    height: 24,
  },
  blindDateIconCompact: {
    width: 30,
    height: 18,
  },
  featurePillText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
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
    // The card's floating action buttons counter-translate over the profile
    // details below — keep this subtree painted (and hit-tested) above them.
    zIndex: 2,
  },
  // ── Promo entry icon ──────────────────────────────────────────────────────
  promoFab: {
    position: 'absolute',
    // Mirrors the card's photo-thumbnail row (top/right: spacing.md) so the
    // icon lands on the card's top-left corner.
    top: spacing.md + 4,
    left: spacing.md,
    zIndex: 30,
  },
  promoFabCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  promoFabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  promoFabBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
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
  emptyBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  emptyBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
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
