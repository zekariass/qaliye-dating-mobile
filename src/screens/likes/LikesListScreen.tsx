import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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

import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { colors } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useLikes } from '@/hooks/discovery/useLikes';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityStatus } from '@/types/activity';
import type { LikeDirection, LikeItemDto } from '@/types/discovery';

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

function formatLocation(item: LikeItemDto): string | null {
  const parts: string[] = [];
  if (item.city) parts.push(item.city);
  if (item.region) parts.push(item.region);
  if (item.country_name) parts.push(item.country_name);
  return parts.length > 0 ? parts.join(', ') : null;
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
}

function SegmentedControl({ active, onChange }: SegmentedControlProps) {
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
});

// ─── LikeCard ─────────────────────────────────────────────────────────────────
// Mirrors MatchCard from MatchesListScreen; adds heart-back btn + dislike btn.

interface LikeCardProps {
  item:           LikeItemDto;
  isReceived:     boolean;
  onPress:        () => void;
  activityStatus?: ActivityStatus | null;
}

function LikeCard({ item, isReceived, onPress, activityStatus }: LikeCardProps) {
  const { card, textPrimary, textMuted, purple, chipBg } = useLikesTheme();
  const location = formatLocation(item);

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

        {/* Activity status dot */}
        {(activityStatus === 'ONLINE' || activityStatus === 'RECENTLY_ACTIVE') && (
          <ActivityStatusIndicator
            status={activityStatus}
            size={11}
            style={styles.statusDot}
          />
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
            onPress={() => console.log(`Like back: ${item.action_id} (${item.display_name})`)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Like back ${item.display_name}`}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            <Ionicons name="heart" size={17} color={purple} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Info section ── */}
      <View style={styles.cardInfo}>

        {/* Name + verified badge + dislike button */}
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
          <TouchableOpacity
            onPress={() => console.log(`Dislike: ${item.action_id} (${item.display_name})`)}
            activeOpacity={0.7}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Dislike ${item.display_name}`}
          >
            <Ionicons name="heart-dislike-outline" size={17} color={textMuted} />
          </TouchableOpacity>
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
                {item.distance_km} km
              </Text>
            )}
          </View>
        ) : null}

        {/* Action type chip */}
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <Ionicons
            name={item.action_type === 'SUPERLIKE' ? 'star' : 'heart'}
            size={11}
            color={purple}
          />
          <Text style={[styles.chipText, { color: purple }]} numberOfLines={2}>
            {item.action_type === 'SUPERLIKE' ? 'Super Like' : 'Like'}
          </Text>
        </View>

      </View>
    </TouchableOpacity>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
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

  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const { getStatus } = useActivityStatuses(visibleIds);

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

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCardPress = useCallback(
    (userId: string) => {
      router.push({ pathname: '/(app)/user-profile', params: { userId } } as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: LikeItemDto }) => (
      <LikeCard
        item={item}
        isReceived={activeTab === 'received'}
        onPress={() => handleCardPress(item.user_id)}
        activityStatus={getStatus(item.user_id, item.activity_status)}
      />
    ),
    [activeTab, handleCardPress, getStatus],
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
      <SegmentedControl active={activeTab} onChange={setActiveTab} />
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
        ListEmptyComponent={<EmptyState tab={activeTab} />}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    padding: 2,
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
