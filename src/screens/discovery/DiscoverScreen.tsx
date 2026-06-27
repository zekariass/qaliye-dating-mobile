import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import QaliyeLogo from '@/components/common/QaliyeLogo';
import CardActionButtons from '@/components/discovery/CardActionButtons';
import CardStack, { CardStackHandle } from '@/components/discovery/CardStack';
import LocationFilterDropdown, { LocationFilter, locationFilterLabel } from '@/components/discovery/LocationFilterDropdown';
import MatchCelebrationOverlay from '@/components/discovery/MatchCelebrationOverlay';
import MorePhotosSection from '@/components/discovery/MorePhotosSection';
import { CardDto } from '@/components/discovery/ProfileCard';
import ProfileDetailsSection from '@/components/discovery/ProfileDetailsSection';
import { colors, radius, spacing } from '@/constants/theme';
import { mapProfileToCard, useDiscoveryProfiles } from '@/hooks/discovery/useDiscoveryProfiles';
import { useRewind } from '@/hooks/discovery/useRewind';
import { useSwipeAction } from '@/hooks/discovery/useSwipeAction';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const { height: SCREEN_H } = Dimensions.get('window');
const HEADER_H = 56;
const TAB_BAR_PADDING = 18;
const TAB_BAR_H = 68;

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

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { bottom: safeBottom } = useSafeAreaInsets();

  const cardStackRef        = useRef<CardStackHandle>(null);
  const scrollRef            = useRef<ScrollView>(null);
  const scrollY              = useRef(0);
  const isRewindingRef       = useRef(false);
  const pendingSuperLikeRef  = useRef(false);
  const shownIdsRef          = useRef<Set<string>>(new Set());
  const lastSwipedCardRef    = useRef<CardDto | null>(null);
  const lastSwipedDirRef     = useRef<'LIKE' | 'PASS'>('LIKE');

  const [displayQueue, setDisplayQueue] = useState<CardDto[]>([]);
  const [rewindIncoming, setRewindIncoming] = useState<'LIKE' | 'PASS' | false>(false);
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [modeVisible, setModeVisible] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('ANYWHERE');

  const router = useRouter();

  // ── API hooks ──────────────────────────────────────────────────────────────
  const {
    cards: apiCards,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    cursorReset,
  } = useDiscoveryProfiles(locationFilter);

  const { mutate: swipe } = useSwipeAction();
  const { mutate: rewind } = useRewind();

  // ── Queue management ───────────────────────────────────────────────────────

  // Reset display queue when location filter changes
  useEffect(() => {
    setDisplayQueue([]);
    shownIdsRef.current = new Set();
  }, [locationFilter]);

  // If API signals cursor was reset, clear local state
  useEffect(() => {
    if (cursorReset) {
      shownIdsRef.current = new Set();
      setDisplayQueue([]);
    }
  }, [cursorReset]);

  // Append newly loaded cards (skip already-seen ids)
  useEffect(() => {
    const newCards = apiCards.filter((c) => !shownIdsRef.current.has(c.user_id));
    if (newCards.length > 0) {
      newCards.forEach((c) => shownIdsRef.current.add(c.user_id));
      setDisplayQueue((prev) => [...prev, ...newCards]);
    }
  }, [apiCards]);

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
      swipe(
        { type: isSuperLike ? 'SUPER_LIKE' : direction, targetUserId: card.user_id },
        {
          onSuccess: (response) => {
            if (response.isMatch && response.match) {
              setMatchName(response.match.otherUser.displayName);
              setMatchVisible(true);
            }
          },
        },
      );
    },
    [swipe],
  );

  // ── Rewind handler ──────────────────────────────────────────────────────────
  const handleRewind = useCallback(async () => {
    if (isRewindingRef.current) return;
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
      onError: () => {
        isRewindingRef.current = false;
      },
    });
  }, [rewind, scrollToTop]);

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
    pendingSuperLikeRef.current = true;
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('LIKE');
  }, [scrollToTop]);

  const isEmpty = !isLoading && !isError && displayQueue.length === 0;

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

        {/* Location filter pill */}
        <TouchableOpacity
          style={[styles.locationPill, { backgroundColor: isDark ? th.backgroundElement : 'transparent' }]}
          onPress={() => setModeVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel={t('discovery.openLocationFilter')}
        >
          <Ionicons name="location" size={15} color={colors.primary} />
          <Text style={[styles.locationLabel, { color: th.text }]}>
            {locationFilterLabel(locationFilter, t)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={th.textSecondary} />
        </TouchableOpacity>

        {/* Settings / Preferences */}
        <TouchableOpacity
          style={[styles.settingsBtn, { borderColor: th.border, backgroundColor: isDark ? th.backgroundElement : th.surface }]}
          onPress={() => router.push('/(app)/preferences')}
          activeOpacity={0.7}
          accessibilityLabel={t('discovery.openPreferences')}
        >
          <Ionicons name="options-outline" size={21} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Main content (scrollable + fixed buttons) ── */}
      <View style={styles.main}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: TOTAL_TAB + 8 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
          bounces
        >
          {/* Card zone — fixed height filling available space */}
          <View style={[styles.cardArea, { height: CARD_AREA_H }]}>
            {isLoading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
                  {t('discovery.loadingProfiles', { defaultValue: 'Finding great matches for you…' })}
                </Text>
              </View>
            ) : isError ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender }]}>
                  <Ionicons name="cloud-offline-outline" size={48} color={colors.danger} />
                </View>
                <Text style={[styles.emptyTitle, { color: th.text }]}>
                  {t('common.errorTitle', { defaultValue: 'Something went wrong' })}
                </Text>
                <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
                  {t('common.errorRetryHint', { defaultValue: 'Check your connection and try again.' })}
                </Text>
                <TouchableOpacity style={styles.emptyBtn} activeOpacity={0.85} onPress={() => refetch()}>
                  <Ionicons name="refresh-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyBtnText}>{t('common.retry', { defaultValue: 'Retry' })}</Text>
                </TouchableOpacity>
              </View>
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
            ) : (
              <CardStack
                ref={cardStackRef}
                cards={displayQueue}
                onSwipe={handleSwipe}
                animateTopCardIn={rewindIncoming}
              />
            )}
          </View>

          {/* Scroll-down hint */}
          {topCard && <ScrollHint color={th.textMuted} />}

          {/* Profile details — below card, visible when scrolling */}
          {topCard && (
            <>
              <ProfileDetailsSection card={topCard} />
              <MorePhotosSection photos={topCard.photos} />
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
        onSendMessage={() => setMatchVisible(false)}
        onKeepSwiping={() => setMatchVisible(false)}
      />
      <LocationFilterDropdown
        visible={modeVisible}
        current={locationFilter}
        onSelect={setLocationFilter}
        onClose={() => setModeVisible(false)}
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
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
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
