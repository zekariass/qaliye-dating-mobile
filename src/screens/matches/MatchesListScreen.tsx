import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { colors, radius, spacing } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useMatches } from '@/hooks/discovery/useMatches';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityStatus } from '@/types/activity';
import type { MatchItemDto } from '@/types/discovery';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLocation(item: MatchItemDto): string | null {
  const parts: string[] = [];
  if (item.city) parts.push(item.city);
  if (item.region) parts.push(item.region);
  if (item.country_name) parts.push(item.country_name);
  return parts.length > 0 ? parts.join(', ') : null;
}

function formatRelativeTime(iso: string): string {
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Layout ──────────────────────────────────────────────────────────────────

const SCREEN_W  = Dimensions.get('window').width;
const OUTER_PAD = 16;
const COL_GAP   = 12;
const CARD_W    = Math.floor((SCREEN_W - OUTER_PAD * 2 - COL_GAP) / 2);
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

function MatchesHeader({ count }: { count: number; }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={headerStyles.container}>
      <View style={headerStyles.titleRow}>
        <Ionicons name="heart-circle" size={30} color={colors.primary} />
        <Text style={[headerStyles.title, { color: th.text }]}>Your Matches</Text>
        <View
          style={[
            headerStyles.badge,
            { backgroundColor: isDark ? '#2E1F50' : colors.backgroundLavender },
          ]}
        >
          <Text style={[headerStyles.badgeText, { color: colors.primary }]}>
            {count}
          </Text>
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
    justifyContent: 'center',
    gap:            8,
  },
  title: {
    fontSize:      26,
    fontWeight:    '800',
    letterSpacing: -0.5,
  },
  badge: {
    borderRadius:      radius.full,
    paddingHorizontal: 10,
    paddingVertical:   3,
  },
  badgeText: {
    fontSize:   13,
    fontWeight: '700',
  },
});

// ─── MatchCard ──────────────────────────────────────────────────────────────

interface MatchCardProps {
  item:           MatchItemDto;
  index:          number;
  onPress:        () => void;
  onMessagePress: () => void;
  activityStatus?: ActivityStatus | null;
}

const MatchCard = React.memo(function MatchCard({
  item,
  index,
  onPress,
  onMessagePress,
  activityStatus,
}: MatchCardProps) {
  const { colors: th, mode } = useTheme();
  const isDark    = mode === 'dark';
  const chipBg    = isDark ? '#2E1F50' : colors.backgroundLavender;
  const enterDelay = Math.min(index * 60, 360);
  const location   = formatLocation(item);

  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: th.surface }, getCardShadow(isDark)]}
        onPress={onPress}
        activeOpacity={0.92}
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
              <Ionicons name="person" size={40} color="#999" />
            </View>
          )}

          {/* Activity status dot */}
          {(activityStatus === 'ONLINE' || activityStatus === 'RECENTLY_ACTIVE') && (
            <ActivityStatusIndicator
              status={activityStatus}
              size={11}
              style={styles.statusDot}
            />
          )}

          {/* Unread dot */}
          {item.is_unread && <View style={styles.unreadDot} />}

          {/* Floating message button */}
          <TouchableOpacity
            style={[styles.msgBtn, MSG_BTN_SHADOW]}
            onPress={onMessagePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Message ${item.display_name}`}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Info section ── */}
        <View style={styles.cardInfo}>

          {/* Name + verified badge */}
          <View style={styles.nameRow}>
            <Text
              style={[
                styles.nameText,
                { color: th.text },
                item.is_unread && styles.nameTextBold,
              ]}
              numberOfLines={1}
            >
              {item.display_name}, {item.age}
            </Text>
            {item.is_verified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.verifiedBlue}
                style={styles.verifiedIcon}
              />
            )}
          </View>

          {/* Location + distance */}
          {(location || item.distance_km !== null) && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={13} color={colors.primary} />
              <Text style={[styles.locationText, { color: th.textSecondary }]} numberOfLines={1}>
                {location ?? 'Location unknown'}
              </Text>
              {item.distance_km !== null && (
                <View
                  style={[
                    styles.distancePill,
                    { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender },
                  ]}
                >
                  <Text style={[styles.distanceText, { color: colors.primary }]}>
                    {item.distance_km} km
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Status chip: New Match! / last message time */}
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
          ) : (
            <View style={[styles.chip, { backgroundColor: isDark ? '#1F3020' : '#E8F5E9' }]}>
              <Ionicons name="heart" size={11} color="#4CAF50" />
              <Text style={[styles.chipText, { color: '#4CAF50' }]} numberOfLines={1}>
                New Match!
              </Text>
            </View>
          )}

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState() {
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
      <Text style={[emptyStyles.title, { color: th.text }]}>No matches yet</Text>
      <Text style={[emptyStyles.subtitle, { color: th.textSecondary }]}>
        Keep swiping to find your perfect match.{'\n'}We'll notify you when
        someone likes you back!
      </Text>
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
});

// ─── ErrorState ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { colors: th } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={errorStyles.wrap}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
      <Text style={[errorStyles.title, { color: th.text }]}>Something went wrong</Text>
      <Text style={[errorStyles.subtitle, { color: th.textSecondary }]}>
        We couldn't load your matches. Pull down to retry.
      </Text>
      <TouchableOpacity style={errorStyles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <Text style={errorStyles.retryText}>Retry</Text>
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

  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const { getStatus } = useActivityStatuses(visibleIds);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 0 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: MatchItemDto }> }) => {
      setVisibleIds(viewableItems.map((v) => v.item.user_id));
    },
  );

  const {
    items, totalElements,
    isLoading, isError, isFetching,
    fetchNextPage, hasNextPage, isFetchingNextPage, refetch,
  } = useMatches();

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
        },
      });
    },
    [router],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: MatchItemDto; index: number }) => (
      <MatchCard
        item={item}
        index={index}
        onPress={() => handleCardPress(item.user_id, item.match_id)}
        onMessagePress={() => handleMessagePress(item)}
        activityStatus={getStatus(item.user_id, item.activity_status)}
      />
    ),
    [handleCardPress, handleMessagePress, getStatus],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [isFetchingNextPage]);

  const listHeader = <MatchesHeader count={totalElements} />;

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
        ListEmptyComponent={<EmptyState />}
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
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={refetch}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    padding: 2,
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

  unreadDot: {
    position:        'absolute',
    top:             8,
    left:            8,
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: colors.primary,
    borderWidth:     2,
    borderColor:     '#FFF',
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
