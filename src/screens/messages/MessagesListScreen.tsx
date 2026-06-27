import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { InboxFilter } from '@/api/chat/chatApi';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useInbox } from '@/hooks/messages/useInbox';
import { useInboxChannel } from '@/hooks/messages/useInboxChannel';
import { useTheme } from '@/hooks/use-theme';
import type { InboxItem } from '@/types/chat';

// ---------------------------------------------------------------------------
// Theme helper
// ---------------------------------------------------------------------------

function useScreenTheme() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return {
    bg: th.background,
    surface: th.surface,
    text: th.text,
    textSecondary: th.textSecondary,
    textMuted: th.textMuted,
    border: th.border,
    segBg: isDark ? th.backgroundElement : '#EEE8FF',
    segBorder: isDark ? '#3D2A6E' : '#DDD5F5',
    segActiveBg: isDark ? th.backgroundSelected : '#FFFFFF',
    purple: colors.primary,
    isDark,
  };
}

// ---------------------------------------------------------------------------
// SegmentedControl (All / Unread)
// ---------------------------------------------------------------------------

type MessageFilter = 'ALL' | 'UNREAD';

interface SegmentedControlProps {
  active: MessageFilter;
  onChange: (f: MessageFilter) => void;
}

function SegmentedControl({ active, onChange }: SegmentedControlProps) {
  const th = useScreenTheme();

  return (
    <View
      style={[
        segStyles.container,
        { backgroundColor: th.segBg, borderColor: th.segBorder },
      ]}
      accessibilityRole="tablist"
    >
      {(['ALL', 'UNREAD'] as MessageFilter[]).map((key) => {
        const isActive = active === key;
        const label = key === 'ALL' ? 'All' : 'Unread';
        return (
          <TouchableOpacity
            key={key}
            style={[
              segStyles.tab,
              isActive && [segStyles.tabActive, { backgroundColor: th.segActiveBg }],
            ]}
            onPress={() => onChange(key)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
          >
            <Text
              style={[
                segStyles.tabText,
                { color: isActive ? th.purple : th.textMuted },
                isActive && segStyles.tabTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.full,
    borderWidth: 1.5,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: radius.full,
  },
  tabActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#8A2CFF',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ filter }: { filter: MessageFilter }) {
  const th = useScreenTheme();
  const isUnread = filter === 'UNREAD';
  return (
    <View style={emptyStyles.wrap}>
      <View style={[emptyStyles.iconCircle, { backgroundColor: th.isDark ? th.surface : '#F2E7FF' }]}>
        <Ionicons
          name={isUnread ? 'checkmark-done-circle-outline' : 'chatbubbles-outline'}
          size={48}
          color={th.purple}
        />
      </View>
      <Text style={[emptyStyles.title, { color: th.text }]}>
        {isUnread ? 'All caught up!' : 'No conversations yet'}
      </Text>
      <Text style={[emptyStyles.subtitle, { color: th.textSecondary }]}>
        {isUnread
          ? "You have no unread messages. You're all caught up!"
          : "Start liking profiles and when you match, your conversations will appear here."}
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
    gap: 14,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const th = useScreenTheme();
  return (
    <View style={errorStyles.wrap}>
      <Ionicons name="alert-circle-outline" size={48} color={th.purple} />
      <Text style={[errorStyles.title, { color: th.text }]}>
        Something went wrong
      </Text>
      <Text style={[errorStyles.subtitle, { color: th.textSecondary }]}>
        We couldn't load your conversations.
      </Text>
      <TouchableOpacity
        style={[errorStyles.retryBtn, { backgroundColor: th.purple }]}
        onPress={onRetry}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Retry loading conversations"
      >
        <Text style={errorStyles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 60,
    gap: 12,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: radius.full,
  },
  retryText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// MessagesListScreen
// ---------------------------------------------------------------------------

export default function MessagesListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const th = useScreenTheme();
  const currentUserId = useCurrentUserId();

  const [filter, setFilter] = useState<MessageFilter>('ALL');
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const { getStatus } = useActivityStatuses(visibleIds);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 0 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: InboxItem }> }) => {
      setVisibleIds(viewableItems.map((v) => v.item.participant.userId));
    },
  );
  const {
    items,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInbox(filter as InboxFilter);

  useInboxChannel(currentUserId, filter as InboxFilter);

  const handleRowPress = useCallback(
    (item: InboxItem) => {
      router.push({
        pathname: '/(app)/chat' as any,
        params: {
          matchId: item.matchId,
          displayName: item.participant.displayName,
          avatarUrl: item.participant.avatarUrl ?? '',
          isVerified: item.participant.isVerified ? '1' : '0',
        },
      });
    },
    [router],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: InboxItem; index: number }) => (
      <ConversationRow
        item={item}
        onPress={handleRowPress}
        isLast={index === items.length - 1}
        activityStatus={getStatus(item.participant.userId, item.participant.activityStatus)}
      />
    ),
    [handleRowPress, items.length, getStatus],
  );

  const keyExtractor = useCallback((item: InboxItem) => item.matchId, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: th.bg, paddingTop: insets.top }]}>
        <Header filter={filter} onFilterChange={setFilter} th={th} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={th.purple} />
        </View>
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <View style={[styles.screen, { backgroundColor: th.bg, paddingTop: insets.top }]}>
        <Header filter={filter} onFilterChange={setFilter} th={th} />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  // ── Content ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: th.bg }]}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <Header filter={filter} onFilterChange={setFilter} th={th} />
        }
        ListEmptyComponent={<EmptyState filter={filter} />}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={th.purple} />
            </View>
          ) : null
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, spacing.md) + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header (extracted so it can be used in loading/error states too)
// ---------------------------------------------------------------------------

interface HeaderProps {
  filter: MessageFilter;
  onFilterChange: (f: MessageFilter) => void;
  th: ReturnType<typeof useScreenTheme>;
}

function Header({ filter, onFilterChange, th }: HeaderProps) {
  return (
    <View style={styles.header}>
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: th.text }]}>
          Your Conversations
        </Text>
      </View>

      {/* Segmented filter */}
      <View style={styles.segWrap}>
        <SegmentedControl active={filter} onChange={onFilterChange} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleRow: {
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.md,
  },
  title: {
    fontSize:      24,
    fontWeight:    '800',
    letterSpacing: -0.8,
    textAlign:     'center',
  },
  segWrap: {
    // full-width segmented control
  },
});
