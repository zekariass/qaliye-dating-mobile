import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { revealLike } from '@/api/discovery/discoveryApi';
import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { themedAlert, themedError } from '@/components/common/ThemedAlert';
import MatchCelebrationOverlay from '@/components/discovery/MatchCelebrationOverlay';
import { colors } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useDiscoveryCounts } from '@/hooks/discovery/useDiscoveryCounts';
import { useLikes } from '@/hooks/discovery/useLikes';
import { useSwipeAction } from '@/hooks/discovery/useSwipeAction';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityStatus } from '@/types/activity';
import type { LikeDirection, LikeItemDto } from '@/types/discovery';
import { isInsufficientCreditsError } from '@/utils/entitlements';
import { formatDistance } from '@/utils/formatDistance';

// ─── Layout constants (identical to MatchesListScreen) ────────────────────────
// NOTE: useWindowDimensions causes a runtime error in this RN version.
// SCREEN_W is the full device width (used for pager mechanics).
// CONTENT_W is the capped list width used only on tablets (>= 500 px).

const RAW_SCREEN_W = Dimensions.get('window').width;
const SCREEN_W  = RAW_SCREEN_W; // pager track / snap always uses full width
const IS_TABLET = RAW_SCREEN_W >= 500;
const CONTENT_W = IS_TABLET ? Math.round(RAW_SCREEN_W * 0.9) : RAW_SCREEN_W;
const OUTER_PAD = 10;
const COL_GAP   = 16;
const CARD_W    = Math.floor((CONTENT_W - OUTER_PAD * 2 - COL_GAP) / 2);
const CARD_H    = Math.round(CARD_W * 1.70);
const IMG_H     = Math.round(CARD_H * 0.60);
const ROW_GAP   = 20;

type Tab = 'received' | 'sent';

function tabToDirection(tab: Tab): LikeDirection {
  return tab === 'received' ? 'RECEIVED' : 'SENT';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLocation(item: LikeItemDto, myCountry: string): string | null {
  if (myCountry && item.country_name === myCountry) {
    return item.city ?? null;
  }
  return item.country_name ?? null;
}

// ─── Theme helper (mirrors MatchesListScreen's useMatchesTheme) ───────────────

function useLikesTheme() {
  const { colors: th } = useTheme();
  const isDark = th.background === '#0D0712';
  return {
    bg:          th.background,
    card:        th.surface,
    textPrimary: th.text,
    textMuted:   th.textSecondary,
    purple:      colors.primary,           // '#8A2CFF'
    chipBg:      isDark ? '#2E1F50' : '#F2E7FF',
    segBg:       isDark ? th.backgroundElement : '#EEE6FF',
    segActiveBg: th.surface,
    segBorder:   isDark ? '#3D2A6E' : '#DDD0FA',
  };
}

// ─── Platform shadows (identical to MatchesListScreen) ────────────────────────

const cardShadow = Platform.select({
  ios: {
    shadowColor:   '#1B1C32',
    shadowOpacity: 0.09,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 5 },
  },
  android: { elevation: 4 },
  default: {},
});

const overlayBtnShadow = Platform.select({
  ios: {
    shadowColor:   '#000000',
    shadowOpacity: 0.16,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 2 },
  },
  android: { elevation: 6 },
  default: {},
});

// ─── SegmentedControl ─────────────────────────────────────────────────────────

interface SegmentedControlProps {
  active:   Tab;
  onChange: (tab: Tab) => void;
  receivedCount: number;
  sentCount: number;
}

function SegmentedControl({ active, onChange, receivedCount, sentCount }: SegmentedControlProps) {
  const { textMuted, purple, segBg, segActiveBg, segBorder } = useLikesTheme();

  const isReceived = active === 'received';
  const isSent     = active === 'sent';

  return (
    <View style={[segStyles.container, { backgroundColor: segBg, borderColor: segBorder }]}>

      {/* ── Received Likes ── */}
      <TouchableOpacity
        style={[segStyles.tab, isReceived && [segStyles.tabActive, { backgroundColor: segActiveBg }]]}
        onPress={() => onChange('received')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: isReceived }}
        accessibilityLabel="Received Likes"
      >
        <Ionicons
          name={isReceived ? 'heart' : 'heart-outline'}
          size={15}
          color={isReceived ? purple : textMuted}
        />
        <Text style={[segStyles.tabText, { color: isReceived ? purple : textMuted }, isReceived && segStyles.tabTextActive]}>
          Received Likes
        </Text>
        {receivedCount > 0 && (
          <View style={[segStyles.countBadge, { backgroundColor: isReceived ? purple : textMuted }]}>
            <Text style={segStyles.countBadgeText}>{receivedCount > 99 ? '99+' : receivedCount}</Text>
          </View>
        )}
        {isReceived && <View style={[segStyles.activeBar, { backgroundColor: purple }]} />}
      </TouchableOpacity>

      {/* ── Sent Likes ── */}
      <TouchableOpacity
        style={[segStyles.tab, isSent && [segStyles.tabActive, { backgroundColor: segActiveBg }]]}
        onPress={() => onChange('sent')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSent }}
        accessibilityLabel="Sent Likes"
      >
        <Ionicons
          name={isSent ? 'paper-plane' : 'paper-plane-outline'}
          size={15}
          color={isSent ? purple : textMuted}
        />
        <Text style={[segStyles.tabText, { color: isSent ? purple : textMuted }, isSent && segStyles.tabTextActive]}>
          Sent Likes
        </Text>
        {sentCount > 0 && (
          <View style={[segStyles.countBadge, { backgroundColor: isSent ? purple : textMuted }]}>
            <Text style={segStyles.countBadgeText}>{sentCount > 99 ? '99+' : sentCount}</Text>
          </View>
        )}
        {isSent && <View style={[segStyles.activeBar, { backgroundColor: purple }]} />}
      </TouchableOpacity>

    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius:  44,
    borderWidth:   1.5,
    padding:       4,
    gap:           4,
  },
  tab: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    paddingVertical:   12,
    paddingHorizontal: 8,
    borderRadius:      38,
    position:          'relative',
  },
  tabActive: {
    // backgroundColor set inline
  },
  tabText: {
    fontSize:   13,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  activeBar: {
    position:     'absolute',
    bottom:       4,
    alignSelf:    'center',
    width:        22,
    height:       3,
    borderRadius: 2,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

// ─── LikeCard ─────────────────────────────────────────────────────────────────
// Mirrors MatchCard from MatchesListScreen; adds heart-back btn + dislike btn.

interface LikeCardProps {
  item:           LikeItemDto;
  isReceived:     boolean;
  onPress:        () => void;
  onUnsend:       () => void;
  isUnsending:    boolean;
  onLikeBack:     () => void;
  isLikingBack:   boolean;
  activityStatus?: ActivityStatus | null;
  myCountry:      string;
}

function LikeCard({ item, isReceived, onPress, onUnsend, isUnsending, onLikeBack, isLikingBack, activityStatus, myCountry }: LikeCardProps) {
  const { card, textPrimary, textMuted, purple, chipBg } = useLikesTheme();
  const location = formatLocation(item, myCountry);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: card }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.display_name}'s profile`}
    >

      {/* ── Portrait image ── */}
      <View style={styles.imageWrap}>
        {item.primary_photo_url ? (
          <Image
            source={{ uri: item.primary_photo_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.photoPlaceholder]}>
            <Ionicons name="person" size={36} color="#999" />
          </View>
        )}

        {/* Super-like star badge */}
        {item.action_type === 'SUPERLIKE' && (
          <View style={[styles.superBadge, { backgroundColor: purple }]}>
            <Ionicons name="star" size={12} color="#FFF" />
          </View>
        )}

        {/* Heart (like-back) button — received likes only */}
        {isReceived && (
          <TouchableOpacity
            style={[styles.overlayBtn, overlayBtnShadow, { backgroundColor: card }]}
            onPress={onLikeBack}
            disabled={isLikingBack}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Like back ${item.display_name}`}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            {isLikingBack ? (
              <ActivityIndicator size="small" color="#FF2D55" />
            ) : (
              <Ionicons name="heart" size={17} color="#FF2D55" />
            )}
          </TouchableOpacity>
        )}

        {/* Unsend (cancel like) button — sent likes only, bottom-right of photo */}
        {!isReceived && (
          <TouchableOpacity
            style={[styles.unsendOverlayBtn, overlayBtnShadow, { backgroundColor: card }]}
            onPress={onUnsend}
            disabled={isUnsending}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Unsend like ${item.display_name}`}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            {isUnsending ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Ionicons name="heart-dislike" size={17} color={colors.danger} />
            )}
          </TouchableOpacity>
        )}

      </View>

      {/* ── Info section ── */}
      <View style={styles.cardInfo}>

        {/* Name + verified badge */}
        <View style={styles.nameRow}>
          <View style={styles.nameLeft}>
            <Text style={[styles.nameText, { color: textPrimary }]} numberOfLines={1}>
              {item.display_name}, {item.age}
            </Text>
            {item.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={purple}
                style={styles.verifiedIcon}
              />
            )}
          </View>
        </View>

        {/* Location + distance */}
        {(location || item.distance_km !== null) ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={purple} />
            <Text style={[styles.locationText, { color: textMuted }]} numberOfLines={1}>
              {location ?? 'Location unknown'}
            </Text>
            {item.distance_km !== null && (
              <Text style={[styles.distanceText, { color: textMuted }]} numberOfLines={1}>
                {formatDistance(item.distance_km)}
              </Text>
            )}
          </View>
        ) : null}

        {/* Action type chip + unsend like button */}
        <View style={styles.chipRow}>
          {item.action_type === 'SUPERLIKE' && (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <Ionicons name="star" size={11} color={purple} />
              <Text style={[styles.chipText, { color: purple }]} numberOfLines={2}>
                Super Liked
              </Text>
            </View>
          )}


        </View>

        {/* Activity status */}
        {activityStatus && activityStatus !== 'HIDDEN' ? (
          <ActivityStatusIndicator
            status={activityStatus}
            showLabel
            size={8}
            labelFontSize={11}
          />
        ) : (
          <Text style={[styles.chipText, { color: textMuted, fontSize: 11 }]} numberOfLines={1}>
            Offline now
          </Text>
        )}

      </View>
    </TouchableOpacity>
  );
}

// ─── BlurredLikeCard (see_who_liked_you = false) ──────────────────────────────

interface BlurredLikeCardProps {
  item: LikeItemDto;
  onPress: () => void;
  onReveal: () => void;
  isRevealing: boolean;
}

function BlurredLikeCard({ item, onPress, onReveal, isRevealing }: BlurredLikeCardProps) {
  const { card, textPrimary, textMuted, purple } = useLikesTheme();
  const { colors: th } = useTheme();
  const isDark = th.background === '#0D0712';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: card }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="View who liked you"
    >
      <View style={styles.imageWrap}>
        {item.primary_photo_url ? (
          <Image
            source={{ uri: item.primary_photo_url }}
            style={[styles.cardImage, { opacity: isDark ? 0.25 : 0.6 }]}
            resizeMode="cover"
            blurRadius={isDark ? 35 : 40}
          />
        ) : (
          <View style={[styles.cardImage, styles.photoPlaceholder]}>
            <Ionicons name="person" size={36} color="#999" />
          </View>
        )}

        <View style={[blurStyles.overlay, { backgroundColor: isDark ? 'rgba(13,7,18,0.55)' : 'rgba(0,0,0,0.25)' }]}>
          <TouchableOpacity
            style={[blurStyles.viewBtn, { backgroundColor: purple }]}
            onPress={onReveal}
            disabled={isRevealing}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="View who liked you"
          >
            {isRevealing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="eye-outline" size={15} color="#FFF" />
                <Text style={blurStyles.viewBtnText}>View</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <View style={styles.nameLeft}>
            <Text style={[styles.nameText, { color: textPrimary, fontSize: 14 }]} numberOfLines={1}>
              Someone likes you
            </Text>
          </View>
        </View>
        <Text style={[styles.locationText, { color: textMuted }]} numberOfLines={1}>
          Tap View to reveal
        </Text>

      </View>
    </TouchableOpacity>
  );
}

const blurStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  viewBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ tab, onRefresh }: { tab: Tab; onRefresh: () => void }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const title    = tab === 'received' ? 'No likes yet' : 'No sent likes';
  const subtitle = tab === 'received'
    ? "No one has liked you yet. Keep your profile active and we'll notify you when someone does!"
    : "You haven't liked anyone yet. Start exploring and find your match!";

  return (
    <View style={emptyStyles.wrap}>
      <View
        style={[
          emptyStyles.iconCircle,
          { backgroundColor: isDark ? th.backgroundElement : '#F2E7FF' },
        ]}
      >
        <Ionicons name="heart-dislike-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[emptyStyles.title, { color: th.text }]}>{title}</Text>
      <Text style={[emptyStyles.subtitle, { color: th.textSecondary }]}>{subtitle}</Text>
      <TouchableOpacity style={emptyStyles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
        <Ionicons name="refresh-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
        <Text style={emptyStyles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 28,
    paddingVertical:   60,
    gap:               14,
  },
  iconCircle: {
    width:          96,
    height:         96,
    borderRadius:   48,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   8,
  },
  title: {
    fontSize:      22,
    fontWeight:    '800',
    textAlign:     'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize:   14,
    textAlign:  'center',
    lineHeight: 20,
  },
  refreshBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    marginTop:         6,
    paddingHorizontal: 22,
    paddingVertical:   10,
    borderRadius:      24,
    backgroundColor:   colors.primary,
  },
  refreshText: {
    color:      '#FFF',
    fontSize:   14,
    fontWeight: '700',
  },
});

// ─── ErrorState ───────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors: th } = useTheme();
  return (
    <View style={errorStyles.wrap}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
      <Text style={[errorStyles.title, { color: th.text }]}>Something went wrong</Text>
      <Text style={[errorStyles.subtitle, { color: th.textSecondary }]}>
        We couldn't load your likes. Pull down to retry.
      </Text>
      <TouchableOpacity style={errorStyles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={errorStyles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  wrap: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 28,
    paddingVertical:   60,
    gap:               12,
  },
  title: {
    fontSize:   18,
    fontWeight: '700',
    textAlign:  'center',
  },
  subtitle: {
    fontSize:   14,
    textAlign:  'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop:         8,
    paddingHorizontal: 24,
    paddingVertical:   10,
    borderRadius:      24,
    backgroundColor:   colors.primary,
  },
  retryText: {
    color:      '#FFF',
    fontSize:   14,
    fontWeight: '700',
  },
});

// ─── Reveal upgrade modal ─────────────────────────────────────────────────────

function showRevealUpgradeModal(
  router: ReturnType<typeof useRouter>,
  creditsEnabled: boolean,
  subscriptionEnabled: boolean,
) {
  if (!creditsEnabled && !subscriptionEnabled) {
    themedAlert({
      title: 'Reveal Who Liked You',
      message: 'You have no available allowance to reveal this profile.',
      icon: 'eye-outline',
      iconColor: colors.primary,
      buttons: [{ text: 'OK', style: 'cancel' }],
    });
    return;
  }
  themedAlert({
    title: 'Reveal Who Liked You',
    message: 'You have no available allowance or credits.',
    icon: 'eye-outline',
    iconColor: colors.primary,
    buttons: [
      ...(subscriptionEnabled ? [{
        text: 'Go Premium',
        style: 'default' as const,
        icon: 'crown',
        iconFamily: 'material' as const,
        iconColor: '#FFD700',
        onPress: () => router.push('/(app)/premium' as any),
      }] : []),
      ...(creditsEnabled ? [{
        text: 'Buy Credits',
        style: 'default' as const,
        icon: 'hand-coin-outline',
        iconFamily: 'material' as const,
        iconColor: '#F59E0B',
        onPress: () => router.push('/(app)/credits-shop' as any),
      }] : []),
      { text: 'Not Now', style: 'cancel' as const },
    ],
  });
}

// ─── LikesListScreen ──────────────────────────────────────────────────────────

export default function LikesListScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const insets    = useSafeAreaInsets();
  const { bg }    = useLikesTheme();
  const router    = useRouter();
  const { entitlements, refreshEntitlements } = useEntitlements();

  // Activity status — merge visible ids from both pages
  const [visibleReceivedIds, setVisibleReceivedIds] = useState<string[]>([]);
  const [visibleSentIds,     setVisibleSentIds]     = useState<string[]>([]);
  const visibleIds = useMemo(
    () => [...visibleReceivedIds, ...visibleSentIds],
    [visibleReceivedIds, visibleSentIds],
  );
  const { getStatus } = useActivityStatuses(visibleIds);
  const { data: myProfile } = useCurrentProfile();
  const myCountry = myProfile?.address?.country_name ?? '';

  const { data: discoveryCounts } = useDiscoveryCounts();
  const receivedLikesCount = discoveryCounts?.received_likes_count ?? 0;
  const sentLikesCount     = discoveryCounts?.sent_likes_count ?? 0;

  // ─── Pager animation ────────────────────────────────────────────────────────
  // currentPageIndex is a shared value so it can be read inside worklets
  const currentPageIndex = useSharedValue(0); // 0 = received, 1 = sent
  const pageOffset       = useSharedValue(0); // translateX: 0 → received, -SCREEN_W → sent

  const snapToPage = useCallback((tab: Tab) => {
    const newPage = tab === 'received' ? 0 : 1;
    pageOffset.value = withTiming(-(newPage * SCREEN_W), {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    currentPageIndex.value = newPage;
    setActiveTab(tab);
  }, [pageOffset, currentPageIndex]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      'worklet';
      const base = -(currentPageIndex.value * SCREEN_W);
      const raw  = base + e.translationX;
      // Rubber-band when swiping past edge pages
      if (raw > 0) {
        pageOffset.value = raw * 0.2;
      } else if (raw < -SCREEN_W) {
        pageOffset.value = -SCREEN_W + (raw + SCREEN_W) * 0.2;
      } else {
        pageOffset.value = raw;
      }
    })
    .onEnd((e) => {
      'worklet';
      const base      = -(currentPageIndex.value * SCREEN_W);
      const projected = base + e.translationX + e.velocityX * 0.15;
      const newPage   = projected < -(SCREEN_W * 0.5) ? 1 : 0;
      pageOffset.value = withTiming(-(newPage * SCREEN_W), {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      currentPageIndex.value = newPage;
      runOnJS(setActiveTab)(newPage === 0 ? 'received' : 'sent');
    });

  const pagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pageOffset.value }],
  }));

  // ─── Received tab data ──────────────────────────────────────────────────────
  const {
    items: receivedItems,
    isLoading: receivedLoading,
    isError: receivedError,
    isFetching: receivedFetching,
    fetchNextPage: receivedFetchNextPage,
    hasNextPage: receivedHasNextPage,
    isFetchingNextPage: receivedFetchingNextPage,
    refetch: receivedRefetch,
  } = useLikes('RECEIVED');

  const [isReceivedRefreshing, setIsReceivedRefreshing] = useState(false);
  useEffect(() => { if (!receivedFetching) setIsReceivedRefreshing(false); }, [receivedFetching]);

  const [removedReceivedIds, setRemovedReceivedIds] = useState<Set<string>>(new Set());
  const [revealedItems,      setRevealedItems]      = useState<Record<string, LikeItemDto>>({});
  const [revealingId,        setRevealingId]        = useState<string | null>(null);
  const [likingBackId,       setLikingBackId]       = useState<string | null>(null);

  const filteredReceivedItems = useMemo(
    () => removedReceivedIds.size > 0
      ? receivedItems.filter((i) => !removedReceivedIds.has(i.action_id))
      : receivedItems,
    [receivedItems, removedReceivedIds],
  );

  // ─── Sent tab data ──────────────────────────────────────────────────────────
  const {
    items: sentItems,
    isLoading: sentLoading,
    isError: sentError,
    isFetching: sentFetching,
    fetchNextPage: sentFetchNextPage,
    hasNextPage: sentHasNextPage,
    isFetchingNextPage: sentFetchingNextPage,
    refetch: sentRefetch,
  } = useLikes('SENT');

  const [isSentRefreshing, setIsSentRefreshing] = useState(false);
  useEffect(() => { if (!sentFetching) setIsSentRefreshing(false); }, [sentFetching]);

  const [removedSentIds, setRemovedSentIds] = useState<Set<string>>(new Set());
  const [unsendingId,    setUnsendingId]    = useState<string | null>(null);

  // Match celebration overlay state
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchName,    setMatchName]    = useState('');
  const [matchPhoto,   setMatchPhoto]   = useState<string | undefined>(undefined);
  const [matchId,      setMatchId]      = useState<string | null>(null);

  const filteredSentItems = useMemo(
    () => removedSentIds.size > 0
      ? sentItems.filter((i) => !removedSentIds.has(i.action_id))
      : sentItems,
    [sentItems, removedSentIds],
  );

  // ─── Viewability refs ────────────────────────────────────────────────────────
  const receivedViewConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 0 });
  const sentViewConfig     = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 0 });
  const onReceivedViewChange = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: LikeItemDto }> }) => {
      setVisibleReceivedIds(viewableItems.map((v) => v.item.user_id));
    },
  );
  const onSentViewChange = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: LikeItemDto }> }) => {
      setVisibleSentIds(viewableItems.map((v) => v.item.user_id));
    },
  );

  // ─── Action handlers ─────────────────────────────────────────────────────────
  const { mutateAsync: swipeAction } = useSwipeAction();

  const handleReveal = useCallback(async (item: LikeItemDto) => {
    setRevealingId(item.action_id);
    try {
      const response = await revealLike(item.action_id);
      const revealedItem: LikeItemDto = {
        ...item,
        display_name:      response.actor_display_name,
        age:               response.actor_age,
        user_id:           response.actor_user_id,
        primary_photo_url: response.actor_primary_photo_url,
        revealed_at:       new Date().toISOString(),
      };
      setRevealedItems((prev) => ({ ...prev, [item.action_id]: revealedItem }));
      if (!response.idempotent) refreshEntitlements();
    } catch (err: any) {
      const status = err?.response?.status;
      if (isInsufficientCreditsError(err)) {
        // Global interceptor already showed the modal
      } else if (status === 403) {
        showRevealUpgradeModal(
          router,
          entitlements?.country_settings?.credits_enabled ?? true,
          entitlements?.country_settings?.subscription_enabled ?? true,
        );
      } else if (status === 404) {
        setRemovedReceivedIds((prev) => new Set(prev).add(item.action_id));
      } else {
        themedError('Error', err?.response?.data?.message ?? err?.message ?? 'Could not reveal this profile.');
      }
    } finally {
      setRevealingId(null);
    }
  }, [refreshEntitlements, router, entitlements]);

  const handleLikeBack = useCallback(async (item: LikeItemDto) => {
    setLikingBackId(item.action_id);
    try {
      const response = await swipeAction({ type: 'LIKE', targetUserId: item.user_id });
      if (response.is_match && response.match) {
        setMatchName(item.display_name);
        setMatchPhoto(item.primary_photo_url ?? undefined);
        setMatchId(response.match.match_id);
        setMatchVisible(true);
      } else {
        themedAlert({
          title: 'Like sent',
          message: `Your like has been sent to ${item.display_name}.`,
          icon: 'heart-outline',
          iconColor: colors.primary,
          buttons: [{ text: 'OK' }],
        });
      }
      receivedRefetch();
    } catch (err: any) {
      if (isInsufficientCreditsError(err)) return;
      themedError('Error', err?.response?.data?.message ?? err?.message ?? 'Could not complete action.');
    } finally {
      setLikingBackId(null);
    }
  }, [swipeAction, receivedRefetch, router]);

  const handleUnsend = useCallback((item: LikeItemDto) => {
    themedAlert({
      title: 'Unsend Like?',
      message: `Withdraw your like from ${item.display_name}?`,
      icon: 'heart-dislike-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsend Like',
          style: 'destructive',
          onPress: async () => {
            setUnsendingId(item.action_id);
            try {
              await swipeAction({ type: 'PASS', targetUserId: item.user_id });
              sentRefetch();
            } catch (err: any) {
              if (isInsufficientCreditsError(err)) return;
              themedError('Error', err?.response?.data?.message ?? err?.message ?? 'Could not unsend like.');
            } finally {
              setUnsendingId(null);
            }
          },
        },
      ],
    });
  }, [swipeAction, sentRefetch]);

  const handleCardPress = useCallback((userId: string) => {
    router.push({ pathname: '/(app)/user-profile', params: { userId } } as any);
  }, [router]);

  // ─── Per-page render functions ────────────────────────────────────────────────

  const renderReceivedItem = useCallback(({ item }: { item: LikeItemDto }) => {
    const effectiveItem = revealedItems[item.action_id] ?? item;
    // The backend controls whether profile data is included. If the item
    // hasn't been revealed (no revealed_at and not in revealedItems), show
    // the blurred card so the user can reveal it via credits.
    if (!item.revealed_at && !revealedItems[item.action_id]) {
      return (
        <BlurredLikeCard
          item={item}
          onPress={() => handleReveal(item)}
          onReveal={() => handleReveal(item)}
          isRevealing={revealingId === item.action_id}
        />
      );
    }
    return (
      <LikeCard
        item={effectiveItem}
        isReceived
        onPress={() => handleCardPress(effectiveItem.user_id)}
        onUnsend={() => {}}
        isUnsending={false}
        onLikeBack={() => handleLikeBack(effectiveItem)}
        isLikingBack={likingBackId === effectiveItem.action_id}
        activityStatus={getStatus(effectiveItem.user_id, effectiveItem.activity_status)}
        myCountry={myCountry}
      />
    );
  }, [revealedItems, handleReveal, handleCardPress, handleLikeBack, revealingId, likingBackId, getStatus, myCountry]);

  const renderSentItem = useCallback(({ item }: { item: LikeItemDto }) => (
    <LikeCard
      item={item}
      isReceived={false}
      onPress={() => handleCardPress(item.user_id)}
      onUnsend={() => handleUnsend(item)}
      isUnsending={unsendingId === item.action_id}
      onLikeBack={() => {}}
      isLikingBack={false}
      activityStatus={getStatus(item.user_id, item.activity_status)}
      myCountry={myCountry}
    />
  ), [handleCardPress, handleUnsend, unsendingId, getStatus, myCountry]);

  const renderReceivedFooter = useCallback(() => {
    if (!receivedFetchingNextPage) return null;
    return <View style={styles.footerLoader}><ActivityIndicator size="small" color={colors.primary} /></View>;
  }, [receivedFetchingNextPage]);

  const renderSentFooter = useCallback(() => {
    if (!sentFetchingNextPage) return null;
    return <View style={styles.footerLoader}><ActivityIndicator size="small" color={colors.primary} /></View>;
  }, [sentFetchingNextPage]);

  const handleReceivedEndReached = useCallback(() => {
    if (receivedHasNextPage && !receivedFetchingNextPage) receivedFetchNextPage();
  }, [receivedHasNextPage, receivedFetchingNextPage, receivedFetchNextPage]);

  const handleSentEndReached = useCallback(() => {
    if (sentHasNextPage && !sentFetchingNextPage) sentFetchNextPage();
  }, [sentHasNextPage, sentFetchingNextPage, sentFetchNextPage]);

  const handleReceivedRefresh = useCallback(() => {
    setIsReceivedRefreshing(true);
    receivedRefetch();
  }, [receivedRefetch]);

  const handleSentRefresh = useCallback(() => {
    setIsSentRefreshing(true);
    sentRefetch();
  }, [sentRefetch]);

  const listBottomPad = Math.max(insets.bottom, 16) + 120;

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>

      {/* ── Fixed segmented control — never scrolls or animates ──────────────── */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 16 }]}>
        <SegmentedControl
          active={activeTab}
          onChange={snapToPage}
          receivedCount={receivedLikesCount}
          sentCount={sentLikesCount}
        />
      </View>

      {/* ── Pager: both lists rendered side-by-side; track slides as a unit ─── */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.pagerClip}>
          <Animated.View style={[styles.pagerTrack, pagerStyle]}>

            {/* Page 0 — Received Likes */}
            <View style={styles.page}>
              {receivedLoading && filteredReceivedItems.length === 0 ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : receivedError && filteredReceivedItems.length === 0 ? (
                <ErrorState onRetry={receivedRefetch} />
              ) : (
                <FlatList
                  data={filteredReceivedItems}
                  keyExtractor={(item) => item.action_id}
                  numColumns={2}
                  columnWrapperStyle={styles.columnWrapper}
                  contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
                  ListEmptyComponent={<EmptyState tab="received" onRefresh={handleReceivedRefresh} />}
                  ListFooterComponent={renderReceivedFooter}
                  onEndReached={handleReceivedEndReached}
                  onEndReachedThreshold={0.5}
                  onViewableItemsChanged={onReceivedViewChange.current}
                  viewabilityConfig={receivedViewConfig.current}
                  showsVerticalScrollIndicator={false}
                  renderItem={renderReceivedItem}
                  initialNumToRender={8}
                  windowSize={7}
                  removeClippedSubviews={Platform.OS === 'android'}
                  refreshing={isReceivedRefreshing}
                  onRefresh={handleReceivedRefresh}
                />
              )}
            </View>

            {/* Page 1 — Sent Likes */}
            <View style={styles.page}>
              {sentLoading && filteredSentItems.length === 0 ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : sentError && filteredSentItems.length === 0 ? (
                <ErrorState onRetry={sentRefetch} />
              ) : (
                <FlatList
                  data={filteredSentItems}
                  keyExtractor={(item) => item.action_id}
                  numColumns={2}
                  columnWrapperStyle={styles.columnWrapper}
                  contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
                  ListEmptyComponent={<EmptyState tab="sent" onRefresh={handleSentRefresh} />}
                  ListFooterComponent={renderSentFooter}
                  onEndReached={handleSentEndReached}
                  onEndReachedThreshold={0.5}
                  onViewableItemsChanged={onSentViewChange.current}
                  viewabilityConfig={sentViewConfig.current}
                  showsVerticalScrollIndicator={false}
                  renderItem={renderSentItem}
                  initialNumToRender={8}
                  windowSize={7}
                  removeClippedSubviews={Platform.OS === 'android'}
                  refreshing={isSentRefreshing}
                  onRefresh={handleSentRefresh}
                />
              )}
            </View>

          </Animated.View>
        </View>
      </GestureDetector>

      {/* Match celebration overlay */}
      <MatchCelebrationOverlay
        visible={matchVisible}
        name={matchName}
        photoUrl={matchPhoto}
        myPhotoUrl={myProfile?.primary_photo_url ?? undefined}
        onSendMessage={() => {
          setMatchVisible(false);
          if (matchId) {
            router.push({
              pathname: '/(app)/chat' as any,
              params: {
                matchId,
                displayName: matchName,
                avatarUrl:   matchPhoto ?? '',
              },
            });
          }
        }}
        onKeepSwiping={() => {
          setMatchVisible(false);
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Fixed header: safe-area + segmented control, never animates
  fixedHeader: {
    paddingHorizontal: OUTER_PAD,
    paddingBottom:     16,
    zIndex:            10,
  },

  // Clips the pager track to screen width so the off-screen page is hidden
  pagerClip: {
    flex:     1,
    overflow: 'hidden',
  },

  // The sliding track — 2× actual screen width, rows side by side
  pagerTrack: {
    flex:          1,
    flexDirection: 'row',
    width:         RAW_SCREEN_W * 2,
  },

  // Each page occupies exactly one screen width
  page: {
    width:    RAW_SCREEN_W,
    overflow: 'hidden',
    alignItems: 'center',
  },

  // paddingHorizontal on listContent (not columnWrapper) — matches MatchesListScreen
  listContent: {
    paddingHorizontal: OUTER_PAD,
    width: CONTENT_W,
  },

  columnWrapper: {
    gap:          COL_GAP,
    marginBottom: ROW_GAP,
  },

  // ── Card shell (exact copy of MatchCard styles) ──────────────────────────────
  card: {
    width:        CARD_W,
    borderRadius: 16,
    ...cardShadow,
  },

  imageWrap: {
    width:                CARD_W,
    height:               IMG_H,
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
    overflow:             'hidden',
  },

  cardImage: {
    width:  CARD_W,
    height: IMG_H,
  },

  statusDot: {
    position: 'absolute',
    bottom:   8,
    left:     8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  overlayBtn: {
    position:       'absolute',
    top:            10,
    right:          10,
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },

  chipRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },

  unsendOverlayBtn: {
    position:       'absolute',
    bottom:         8,
    right:          8,
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Card info (exact copy of MatchCard styles) ───────────────────────────────
  cardInfo: {
    paddingHorizontal: 11,
    paddingTop:        10,
    paddingBottom:     12,
    gap:               6,
  },

  // Name row: [nameLeft (flex:1) = name + badge] [dislike btn]
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  nameLeft: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    overflow:      'hidden',
  },

  nameText: {
    fontSize:   17,
    fontWeight: '700',
    flexShrink: 1,
  },

  verifiedIcon: {
    marginLeft: 4,
    flexShrink: 0,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },

  locationText: {
    fontSize:   12,
    flex:       1,
    marginLeft: 2,
  },

  distanceText: {
    fontSize:   12,
    flexShrink: 0,
  },

  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    borderRadius:      20,
    paddingHorizontal: 9,
    paddingVertical:   5,
    gap:               5,
    maxWidth:          '100%',
  },

  chipText: {
    fontSize:   11,
    fontWeight: '500',
    flexShrink: 1,
  },

  photoPlaceholder: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#E5E5E5',
  },

  superBadge: {
    position:     'absolute',
    top:          8,
    left:         8,
    width:        24,
    height:       24,
    borderRadius: 12,
    alignItems:   'center',
    justifyContent: 'center',
  },

  footerLoader: {
    paddingVertical: 16,
    alignItems:      'center',
  },

  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
