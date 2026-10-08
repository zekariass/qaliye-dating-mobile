import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQueryClient } from '@tanstack/react-query';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { BlindDateBadge } from '@/components/common/BlindDateBadge';
import { bdGradients } from '@/constants/blindDateTheme';
import { colors, radius, spacing } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useMatches } from '@/hooks/discovery/useMatches';
import { inboxQueryKey } from '@/hooks/messages/useInbox';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type { ActivityStatus } from '@/types/activity';
import type { InboxItem } from '@/types/chat';
import type { MatchItemDto } from '@/types/discovery';
import { formatDistance } from '@/utils/formatDistance';
import { isBlindDateMatch } from '@/utils/matchSource';
import { rs, useTabletScale } from '@/utils/responsive';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLocation(item: MatchItemDto, myCountry: string): string | null {
  if (myCountry && item.country_name === myCountry) {
    return item.city ?? null;
  }
  return item.country_name ?? null;
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return i18n.t('matches.recently');
  const date = new Date(iso);
  if (isNaN(date.getTime())) return i18n.t('matches.recently');
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return i18n.t('matches.justNow');
  if (diffMin < 60) return i18n.t('matches.minutesAgo', { minutes: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return i18n.t('matches.hoursAgo', { hours: diffH });
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return i18n.t('matches.daysAgo', { days: diffD });
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const RAW_SCREEN_W = Dimensions.get('window').width;
const IS_TABLET = RAW_SCREEN_W >= 500;
const CONTENT_W = IS_TABLET ? Math.round(RAW_SCREEN_W * 0.9) : RAW_SCREEN_W;
const OUTER_PAD = 16;
const COL_GAP   = 12;
const CARD_W    = Math.floor((CONTENT_W - OUTER_PAD * 2 - COL_GAP) / 2);
const IMG_H     = Math.round(CARD_W * 1.15);
const ROW_GAP   = 14;

// ─── Platform shadows ────────────────────────────────────────────────────────

function getCardShadow(isDark: boolean) {
  return Platform.select({
    ios: {
      shadowColor: isDark ? '#000' : colors.primary,
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: isDark ? 6 : 4 },
    default: {},
  });
}

const MSG_BTN_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 8 },
  default: {},
});

// ─── MatchesHeader ──────────────────────────────────────────────────────────

function MatchesHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const scale = useTabletScale();

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={headerStyles.container}>
      <View style={headerStyles.titleRow}>
        <View style={headerStyles.titleGroup}>
          <Ionicons name="heart-circle" size={rs(26, scale)} color={colors.primary} />
          <View>
            <View style={headerStyles.titleInner}>
              <Text style={[headerStyles.title, { color: colors.primary, fontSize: rs(20, scale) }]}>{t('matches.title')}</Text>
            </View>
            {/* Active-tab indicator — marks Matches as the current screen */}
            <View style={headerStyles.activeIndicator} />
          </View>
        </View>
        <View style={headerStyles.blindDateWrap}>
          <TouchableOpacity
            style={[headerStyles.blindDateBtn, { height: rs(38, scale), borderRadius: rs(12, scale), paddingHorizontal: rs(10, scale), gap: rs(6, scale) }]}
            onPress={() => router.push('/(app)/blind-date' as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('discovery.blindDate', { defaultValue: 'Try Blind Dating' })}
          >
            <LinearGradient
              colors={bdGradients.hero as unknown as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: rs(12, scale) }]}
            />
            <View style={[headerStyles.bdIconChip, { borderRadius: rs(10, scale), paddingHorizontal: rs(4, scale), paddingVertical: rs(2, scale) }]}>
              <Image
                source={require('@/assets/images/blind-date-icon.png')}
                style={[headerStyles.blindDateIcon, { width: rs(34, scale), height: rs(20, scale) }]}
                contentFit="contain"
              />
            </View>
            <Text style={[headerStyles.blindDateText, { fontSize: rs(13, scale) }]}>
              {t('discovery.blindDate', { defaultValue: 'Try Blind Dating' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  titleInner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  activeIndicator: {
    height:          3,
    borderRadius:    2,
    backgroundColor: colors.primary,
    marginTop:       3,
  },
  blindDateWrap: {
    flex:       1,
    alignItems: 'flex-end',
  },
  blindDateBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    height:            38,
    paddingHorizontal: 10,
    borderRadius:      12,
    shadowColor:       colors.primary,
    shadowOpacity:     0.3,
    shadowRadius:      8,
    shadowOffset:      { width: 0, height: 3 },
    elevation:         4,
  },
  bdIconChip: {
    backgroundColor:   '#FFFFFF',
    borderRadius:      10,
    paddingHorizontal: 4,
    paddingVertical:   2,
  },
  blindDateIcon: {
    width:  34,
    height: 20,
  },
  blindDateText: {
    fontSize:   13,
    fontWeight: '700',
    color:      '#FFFFFF',
  },
  title: {
    fontSize:      20,
    fontWeight:    '800',
    letterSpacing: -0.3,
  },
});

// ─── MatchCard ──────────────────────────────────────────────────────────────

interface MatchCardProps {
  item:           MatchItemDto;
  index:          number;
  onPress:        () => void;
  onMessagePress: () => void;
  activityStatus?: ActivityStatus | null;
  unreadCount?:   number;
  myCountry:      string;
}

const MatchCard = React.memo(function MatchCard({
  item,
  index,
  onPress,
  onMessagePress,
  activityStatus,
  unreadCount,
  myCountry,
}: MatchCardProps) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark    = mode === 'dark';
  const chipBg    = isDark ? '#2E1F50' : colors.backgroundLavender;
  const enterDelay = Math.min(index * 60, 360);
  const location   = formatLocation(item, myCountry);
  const scale      = useTabletScale();

  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: th.surface }, getCardShadow(isDark)]}
        onPress={onPress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={t('matches.viewProfileA11y', { name: item.display_name })}
      >
        {/* ── Portrait image ── */}
        <View style={styles.imageWrap}>
          {item.primary_photo_url ? (
            <Image
              source={{ uri: item.primary_photo_url }}
              style={styles.cardImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.cardImage, styles.photoPlaceholder]}>
              <Ionicons name="person" size={40} color="#999" />
            </View>
          )}

          {/* Floating message button */}
          <TouchableOpacity
            style={[styles.msgBtn, MSG_BTN_SHADOW]}
            onPress={onMessagePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('matches.messageA11y', { name: item.display_name })}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color="#FFF" />
          </TouchableOpacity>

          {/* Unread message count badge */}
          {!!unreadCount && unreadCount > 0 && (
            <View style={styles.msgCountBadge} pointerEvents="none">
              <Text style={styles.msgCountText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* ── Info section ── */}
        <View style={styles.cardInfo}>

          {/* Name + verified badge */}
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.nameText,
                { color: th.text, fontSize: rs(16, scale) },
                item.is_unread && styles.nameTextBold,
              ]}
              numberOfLines={1}
            >
              {item.display_name}, {item.age}
            </Text>
            {item.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={rs(16, scale)}
                color={colors.verifiedBlue}
                style={styles.verifiedIcon}
              />
            )}
            {isBlindDateMatch(item) && (
              <BlindDateBadge size={rs(14, scale)} style={styles.blindDateIcon} />
            )}
          </View>

          {/* Location + distance */}
          {(location || item.distance_km !== null) && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={rs(13, scale)} color={colors.primary} />
              <Text style={[styles.locationText, { color: th.textSecondary, fontSize: rs(12, scale) }]} numberOfLines={1}>
                {location ?? t('matches.locationUnknown')}
              </Text>
              {item.distance_km !== null && (
                <View
                  style={[
                    styles.distancePill,
                    { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender },
                  ]}
                >
                  <Text style={[styles.distanceText, { color: colors.primary }]}>
                    {formatDistance(item.distance_km)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Status chip: New Match! / last message time / activity status */}
          {item.has_conversation && item.last_message_at ? (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <Ionicons
                name={item.is_unread ? 'chatbubble' : 'chatbubble-outline'}
                size={11}
                color={colors.primary}
              />
              <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
                {formatRelativeTime(item.last_message_at)}
              </Text>
            </View>
          ) : item.is_new ? (
            <View style={[styles.chip, { backgroundColor: isDark ? '#1F3020' : '#E8F5E9' }]}>
              <Ionicons name="heart" size={11} color="#4CAF50" />
              <Text style={[styles.chipText, { color: '#4CAF50' }]} numberOfLines={1}>
                {t('matches.newMatch')}
              </Text>
            </View>
          ) : activityStatus && activityStatus !== 'HIDDEN' ? (
            <ActivityStatusIndicator
              status={activityStatus}
              showLabel
              size={8}
              labelFontSize={11}
            />
          ) : (
            <Text style={[styles.chipText, { color: th.textSecondary, fontSize: 11 }]} numberOfLines={1}>
              {t('matches.offlineNow')}
            </Text>
          )}

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={emptyStyles.wrap}>
      <View
        style={[
          emptyStyles.iconCircle,
          { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender },
        ]}
      >
        <Ionicons name="heart-dislike-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[emptyStyles.title, { color: th.text }]}>{t('matches.emptyTitle')}</Text>
      <Text style={[emptyStyles.subtitle, { color: th.textSecondary }]}>
        {t('matches.emptySubtitle')}
      </Text>
      <TouchableOpacity style={emptyStyles.refreshBtn} onPress={onRefresh} activeOpacity={0.8}>
        <Ionicons name="refresh-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
        <Text style={emptyStyles.refreshText}>{t('likes.refresh')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xxxl,
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
    borderRadius:      radius.full,
    backgroundColor:   colors.primary,
  },
  refreshText: {
    color:      '#FFF',
    fontSize:   14,
    fontWeight: '700',
  },
});

// ─── ErrorState ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={errorStyles.wrap}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
      <Text style={[errorStyles.title, { color: th.text }]}>{t('likes.errorTitle')}</Text>
      <Text style={[errorStyles.subtitle, { color: th.textSecondary }]}>
        {t('matches.errorBody')}
      </Text>
      <TouchableOpacity style={errorStyles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={errorStyles.retryText}>{t('likes.retry')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const errorStyles = StyleSheet.create({
  wrap: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xxxl,
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
    borderRadius:      radius.full,
    backgroundColor:   colors.primary,
  },
  retryText: {
    color:      '#FFF',
    fontSize:   14,
    fontWeight: '700',
  },
});

// ─── MatchesListScreen ────────────────────────────────────────────────────────

export default function MatchesListScreen() {
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: myProfile } = useCurrentProfile();
  const myCountry = myProfile?.address?.country_name ?? '';

  const [isUserRefreshing, setIsUserRefreshing] = useState(false);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const { getStatus } = useActivityStatuses(visibleIds);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 0 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: { item: MatchItemDto }[] }) => {
      setVisibleIds(viewableItems.map((v) => v.item.user_id));
    },
  );

  const {
    items, totalElements,
    isLoading, isError, isFetching,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch,
  } = useMatches();

  const inboxUnreadMap = useMemo<Record<string, number>>(() => {
    const data = qc.getQueryData<{ pages: { items: InboxItem[] }[] }>(
      inboxQueryKey('ALL'),
    );
    if (!data) return {};
    const map: Record<string, number> = {};
    for (const page of data.pages) {
      for (const inboxItem of page.items) {
        if (inboxItem.unreadCount > 0) map[inboxItem.matchId] = inboxItem.unreadCount;
      }
    }
    return map;
  }, [qc, items]);

  const handleCardPress = useCallback(
    (userId: string, matchId?: string) => {
      router.push({ pathname: '/(app)/user-profile', params: { userId, matchId } } as any);
    },
    [router],
  );

  const handleMessagePress = useCallback(
    (item: MatchItemDto) => {
      router.push({
        pathname: '/(app)/chat' as any,
        params: {
          matchId:     item.match_id,
          displayName: item.display_name,
          avatarUrl:   item.primary_photo_url ?? '',
          isVerified:  item.is_verified ? '1' : '0',
          ...(isBlindDateMatch(item) ? { matchSource: 'BLIND_DATE' } : {}),
        },
      });
    },
    [router],
  );

  // Stop the user-initiated refresh spinner once fetching completes
  useEffect(() => {
    if (!isFetching) setIsUserRefreshing(false);
  }, [isFetching]);

  const handleRefresh = useCallback(() => {
    setIsUserRefreshing(true);
    refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: MatchItemDto; index: number }) => (
      <MatchCard
        key={item.match_id}
        item={item}
        index={index}
        onPress={() => handleCardPress(item.user_id, item.match_id)}
        onMessagePress={() => handleMessagePress(item)}
        activityStatus={getStatus(item.user_id, item.activity_status)}
        unreadCount={inboxUnreadMap[item.match_id]}
        myCountry={myCountry}
      />
    ),
    [handleCardPress, handleMessagePress, getStatus, inboxUnreadMap, myCountry],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const listHeader = <MatchesHeader />;

  // Initial loading
  if (isLoading && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: th.background }]}>
        <View style={[styles.listContent, { paddingTop: insets.top + 16 }]}>
          {listHeader}
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  // Error (no cached data)
  if (isError && items.length === 0) {
    return (
      <View style={[styles.screen, { backgroundColor: th.background }]}>
        <View style={[styles.listContent, { paddingTop: insets.top + 16 }]}>
          {listHeader}
        </View>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.match_id}
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
        ListEmptyComponent={<EmptyState onRefresh={handleRefresh} />}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: OUTER_PAD,
    alignSelf: 'center',
    width: CONTENT_W,
  },

  columnWrapper: {
    gap:          COL_GAP,
    marginBottom: ROW_GAP,
  },

  // ── Card shell ──────────────────────────────────────────────────────────────
  card: {
    width:        CARD_W,
    borderRadius: radius.md,
  },

  imageWrap: {
    width:                CARD_W,
    height:               IMG_H,
    borderTopLeftRadius:  radius.md,
    borderTopRightRadius: radius.md,
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

  msgBtn: {
    position:        'absolute',
    top:             10,
    right:           10,
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: colors.primary,
    borderWidth:     2.5,
    borderColor:     '#FFF',
    alignItems:      'center',
    justifyContent:  'center',
  },

  // ── Card info ───────────────────────────────────────────────────────────────
  cardInfo: {
    paddingHorizontal: 12,
    paddingTop:        10,
    paddingBottom:     13,
    gap:               6,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  nameText: {
    fontSize:   16,
    fontWeight: '700',
    flexShrink: 1,
  },

  verifiedIcon: {
    marginLeft: 4,
    flexShrink: 0,
  },

  blindDateIcon: {
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

  distancePill: {
    borderRadius:      radius.full,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },

  distanceText: {
    fontSize:   11,
    fontWeight: '600',
    flexShrink: 0,
  },

  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    borderRadius:      radius.full,
    paddingHorizontal: 9,
    paddingVertical:   5,
    gap:               4,
    maxWidth:          '100%',
  },

  chipText: {
    fontSize:   11,
    fontWeight: '600',
    flexShrink: 1,
  },

  nameTextBold: {
    fontWeight: '800',
  },

  photoPlaceholder: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#E5E5E5',
  },

  msgCountBadge: {
    position:          'absolute',
    top:               2,
    right:             2,
    minWidth:          18,
    height:            18,
    borderRadius:      9,
    backgroundColor:   '#E53935',
    borderWidth:       1.5,
    borderColor:       '#FFF',
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: 3,
  },

  msgCountText: {
    color:      '#FFF',
    fontSize:   10,
    fontWeight: '800',
    lineHeight: 13,
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
