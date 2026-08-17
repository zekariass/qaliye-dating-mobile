import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { revealLike } from '@/api/discovery/discoveryApi';
import { InsufficientCreditModal } from '@/components/billing/InsufficientCreditModal';
import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { themedAlert, themedError } from '@/components/common/ThemedAlert';
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
import { isInsufficientCreditsError, isLimitExceededError } from '@/utils/entitlements';
import { formatDistance } from '@/utils/formatDistance';
import { showActionErrorAlert } from '@/utils/limitExceededAlert';

// ─── Layout constants (identical to MatchesListScreen) ────────────────────────
// NOTE: useWindowDimensions causes a runtime error in this RN version.

const SCREEN_W  = Dimensions.get('window').width;
const OUTER_PAD = 10;
const COL_GAP   = 16;
const CARD_W    = Math.floor((SCREEN_W - OUTER_PAD * 2 - COL_GAP) / 2);
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
              <ActivityIndicator size="small" color={purple} />
            ) : (
              <Ionicons name="heart" size={17} color={purple} />
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
          <View style={[styles.chip, { backgroundColor: chipBg }]}>
            <Ionicons
              name={item.action_type === 'SUPERLIKE' ? 'star' : 'heart'}
              size={11}
              color={purple}
            />
            <Text style={[styles.chipText, { color: purple }]} numberOfLines={2}>
              {item.action_type === 'SUPERLIKE' ? 'Super Liked' : 'Liked'}
            </Text>
          </View>

          {/* Unsend like button — sent likes only */}
          {!isReceived && (
            <TouchableOpacity
              style={[styles.unsendBtn, { backgroundColor: chipBg }]}
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
          <View style={[blurStyles.lockCircle, { backgroundColor: purple }]}>
            <Ionicons name="lock-closed" size={22} color="#FFF" />
          </View>
          <Text style={[blurStyles.overlayText, { color: isDark ? '#FFF' : '#FFF' }]}>Someone likes you</Text>
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

        {/* View / Reveal button */}
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
    alignSelf: 'flex-start',
    marginTop: 4,
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

// ─── LikesListScreen ──────────────────────────────────────────────────────────

export default function LikesListScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const direction = tabToDirection(activeTab);
  const insets    = useSafeAreaInsets();
  const { bg }    = useLikesTheme();
  const router    = useRouter();
  const [isUserRefreshing, setIsUserRefreshing] = useState(false);
  const { entitlements } = useEntitlements();
  const canSeeWhoLikedYou = entitlements?.features?.see_who_liked_you ?? false;
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const { getStatus } = useActivityStatuses(visibleIds);
  const { data: myProfile } = useCurrentProfile();
  const myCountry = myProfile?.address?.country_name ?? '';

  const { data: discoveryCounts } = useDiscoveryCounts();
  const receivedLikesCount = discoveryCounts?.received_likes_count ?? 0;
  const sentLikesCount = discoveryCounts?.sent_likes_count ?? 0;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 0 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: LikeItemDto }> }) => {
      setVisibleIds(viewableItems.map((v) => v.item.user_id));
    },
  );

  const {
    items, totalElements,
    isLoading, isError, isFetching,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch,
  } = useLikes(direction);

  // Stop the user-initiated refresh spinner once fetching completes
  useEffect(() => {
    if (!isFetching) setIsUserRefreshing(false);
  }, [isFetching]);

  const handleRefresh = useCallback(() => {
    setIsUserRefreshing(true);
    refetch();
  }, [refetch]);

  const { mutateAsync: swipeAction, isPending: isSwiping } = useSwipeAction();
  const [unsendingId, setUnsendingId] = useState<string | null>(null);
  const [likingBackId, setLikingBackId] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [showInsufficientCredit, setShowInsufficientCredit] = useState(false);
  const [revealedItems, setRevealedItems] = useState<Record<string, LikeItemDto>>({});
  const { refreshEntitlements } = useEntitlements();

  const handleLikeBack = useCallback(
    async (item: LikeItemDto) => {
      setLikingBackId(item.action_id);
      try {
        const response = await swipeAction({ type: 'LIKE', targetUserId: item.user_id });
        if (response.is_match && response.match) {
          themedAlert({
            title: "It's a Match!",
            message: `You and ${item.display_name} are now matched.`,
            icon: 'heart',
            iconColor: colors.secondary,
            buttons: [
              {
                text: 'Send Message',
                onPress: () => {
                  router.push({
                    pathname: '/(app)/chat' as any,
                    params: {
                      matchId: response.match!.match_id,
                      displayName: item.display_name,
                      avatarUrl: item.primary_photo_url ?? '',
                      isVerified: item.is_verified ? '1' : '0',
                    },
                  });
                },
              },
              { text: 'Keep Swiping', style: 'cancel' },
            ],
          });
        } else {
          themedAlert({
            title: 'Like sent',
            message: `Your like has been sent to ${item.display_name}.`,
            icon: 'heart-outline',
            iconColor: colors.primary,
            buttons: [{ text: 'OK' }],
          });
        }
        refetch();
      } catch (err: any) {
        if (isInsufficientCreditsError(err)) return;
        themedError('Error', err?.response?.data?.message ?? err?.message ?? 'Could not complete action.');
      } finally {
        setLikingBackId(null);
      }
    },
    [swipeAction, refetch, router],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleReveal = useCallback(
    async (item: LikeItemDto) => {
      setRevealingId(item.action_id);
      try {
        const response = await revealLike(item.action_id);

        // Update the local item with revealed data
        const revealedItem: LikeItemDto = {
          ...item,
          display_name: response.actor_display_name,
          age: response.actor_age,
          user_id: response.actor_user_id,
          primary_photo_url: response.actor_primary_photo_url,
        };
        setRevealedItems((prev) => ({ ...prev, [item.action_id]: revealedItem }));

        // Refresh entitlements to update credit balance
        refreshEntitlements();

        if (response.idempotent) {
          themedAlert({
            title: 'Already revealed',
            message: `This profile was already revealed previously.`,
            icon: 'eye-outline',
            iconColor: colors.primary,
            buttons: [{ text: 'OK' }],
          });
        }
      } catch (err: any) {
        if (isInsufficientCreditsError(err)) {
          return;
        } else if (isLimitExceededError(err)) {
          showActionErrorAlert(err, router, {
            subscriptionEnabled: entitlements?.country_settings?.subscription_enabled ?? true,
            creditsEnabled: entitlements?.country_settings?.credits_enabled ?? true,
            actionTypeOverride: 'SEE_WHO_LIKED_YOU',
          });
        } else {
          themedError('Error', err?.response?.data?.message ?? err?.message ?? 'Could not reveal this profile.');
        }
      } finally {
        setRevealingId(null);
      }
    },
    [refreshEntitlements, router],
  );

  const handleCardPress = useCallback(
    (userId: string) => {
      router.push({ pathname: '/(app)/user-profile', params: { userId } } as any);
    },
    [router],
  );

  const handleBlurredCardPress = useCallback(() => {
    themedAlert({
      title: 'See Who Likes You',
      message: 'Reveal this profile to see who liked you. Uses credits or your plan allowance.',
      icon: 'eye-outline',
      iconColor: colors.primary,
      buttons: [
        {
          text: 'Go Premium',
          onPress: () => {
            router.push('/(app)/premium' as any);
          },
        },
        { text: 'Not now', style: 'cancel' },
      ],
    });
  }, [router]);

  const handleUnsend = useCallback(
    (item: LikeItemDto) => {
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
                refetch();
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
    },
    [swipeAction, refetch],
  );

  const renderItem = useCallback(
    ({ item }: { item: LikeItemDto }) => {
      // If this item has been revealed, use the revealed data
      const effectiveItem = revealedItems[item.action_id] ?? item;

      if (activeTab === 'received' && !canSeeWhoLikedYou && !revealedItems[item.action_id]) {
        return (
          <BlurredLikeCard
            item={item}
            onPress={handleBlurredCardPress}
            onReveal={() => handleReveal(item)}
            isRevealing={revealingId === item.action_id}
          />
        );
      }
      return (
        <LikeCard
          key={effectiveItem.action_id}
          item={effectiveItem}
          isReceived={activeTab === 'received'}
          onPress={() => handleCardPress(effectiveItem.user_id)}
          onUnsend={() => handleUnsend(effectiveItem)}
          isUnsending={unsendingId === effectiveItem.action_id}
          onLikeBack={() => handleLikeBack(effectiveItem)}
          isLikingBack={likingBackId === effectiveItem.action_id}
          activityStatus={getStatus(effectiveItem.user_id, effectiveItem.activity_status)}
          myCountry={myCountry}
        />
      );
    },
    [activeTab, canSeeWhoLikedYou, revealedItems, handleCardPress, handleBlurredCardPress, handleReveal, handleUnsend, handleLikeBack, revealingId, unsendingId, likingBackId, getStatus, myCountry],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const listHeader = (
    <View style={styles.segHeader}>
      <SegmentedControl active={activeTab} onChange={setActiveTab} receivedCount={receivedLikesCount} sentCount={sentLikesCount} />
    </View>
  );

  // Initial loading state
  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: bg, paddingTop: insets.top + 16, paddingHorizontal: OUTER_PAD }]}>
        {listHeader}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Error state (no cached data)
  if (isError && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: bg, paddingTop: insets.top + 16, paddingHorizontal: OUTER_PAD }]}>
        {listHeader}
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <FlatList
        key={activeTab}
        data={items}
        keyExtractor={(item) => item.action_id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop:    insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 16) + 120,
          },
        ]}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<EmptyState tab={activeTab} onRefresh={handleRefresh} />}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshing={isUserRefreshing}
        onRefresh={handleRefresh}
      />

      <InsufficientCreditModal
        visible={showInsufficientCredit}
        onClose={() => setShowInsufficientCredit(false)}
        action={{ icon: 'eye', actionName: 'Reveal' }}
        creditBalance={entitlements?.credits.credit_balance ?? 0}
        creditsEnabled={entitlements?.country_settings?.credits_enabled ?? true}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // paddingHorizontal on listContent (not columnWrapper) — matches MatchesListScreen
  listContent: {
    paddingHorizontal: OUTER_PAD,
  },

  columnWrapper: {
    gap:          COL_GAP,
    marginBottom: ROW_GAP,
  },

  segHeader: {
    paddingBottom: 20,
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

  unsendBtn: {
    width:          36,
    height:         28,
    borderRadius:   14,
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
