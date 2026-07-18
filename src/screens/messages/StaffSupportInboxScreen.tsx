import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    AppState,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getStaffConversations } from '@/api/support/staffSupportApi';
import { colors, spacing } from '@/constants/theme';
import { useStaffConversations } from '@/hooks/support/useStaffConversations';
import { useTheme } from '@/hooks/use-theme';
import type { StaffConversationListParams, StaffConversationSummaryDto, SupportConversationStatus } from '@/types/support';

const POLL_INTERVAL = Number(process.env.EXPO_PUBLIC_SUPPORT_POLL_INTERVAL_MS) || 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return '';
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 60) return `${Math.max(diffMinutes, 1)}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

const STATUS_COLORS: Record<SupportConversationStatus, string> = {
  IDLE: '#6B7280',
  WAITING_FOR_STAFF: '#F59E0B',
  WAITING_STAFF: '#F59E0B',
  ACTIVE: '#10B981',
  WAITING_USER: '#3B82F6',
  CLOSED: '#9CA3AF',
};

const STATUS_ICONS: Record<SupportConversationStatus, keyof typeof Ionicons.glyphMap> = {
  IDLE: 'ellipse-outline',
  WAITING_FOR_STAFF: 'time-outline',
  WAITING_STAFF: 'time-outline',
  ACTIVE: 'chatbubble-ellipses',
  WAITING_USER: 'person-outline',
  CLOSED: 'checkmark-done-outline',
};

const STATUS_LABELS: Record<SupportConversationStatus, string> = {
  IDLE: 'Idle',
  WAITING_FOR_STAFF: 'Waiting for staff reply',
  WAITING_STAFF: 'Waiting for staff reply',
  ACTIVE: 'Active',
  WAITING_USER: 'Waiting for user reply',
  CLOSED: 'Closed',
};

// ---------------------------------------------------------------------------
// Conversation row
// ---------------------------------------------------------------------------

function ConversationRow({
  item,
  onPress,
}: {
  item: StaffConversationSummaryDto;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const unreadCount = Math.max(0, item.next_public_sequence - 1 - item.staff_last_read_sequence);
  const statusColor = STATUS_COLORS[item.status];

  const displayName = item.user_display_name || `User ${item.user_id.slice(0, 8)}`;

  const accessibilityLabel = [
    displayName,
    STATUS_LABELS[item.status],
    item.assigned_staff_user_id ? 'Assigned' : 'Unassigned',
    `Priority ${item.priority}`,
    item.last_public_message_at ? formatTimestamp(item.last_public_message_at) : null,
    unreadCount > 0 ? `${unreadCount} unread` : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity
      style={[rowStyles.row, { backgroundColor: th.surface, borderBottomColor: th.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Status dot */}
      <View style={[rowStyles.statusDot, { backgroundColor: statusColor }]} />

      <View style={rowStyles.body}>
        {/* Top row */}
        <View style={rowStyles.topRow}>
          <Text style={[rowStyles.userId, { color: th.text }]} numberOfLines={1}>
            {displayName}
          </Text>
          {item.last_public_message_at && (
            <Text style={[rowStyles.timestamp, { color: isDark ? '#7C6EA0' : '#9CA3AF' }]}>
              {formatTimestamp(item.last_public_message_at)}
            </Text>
          )}
        </View>

        {/* Bottom row */}
        <View style={rowStyles.bottomRow}>
          <View style={rowStyles.statusBadge}>
            <Ionicons name={STATUS_ICONS[item.status]} size={12} color={statusColor} />
            <Text style={[rowStyles.statusText, { color: statusColor }]}>{STATUS_LABELS[item.status]}</Text>
          </View>
          {!item.assigned_staff_user_id && (
            <View style={[rowStyles.unassignedBadge, { backgroundColor: isDark ? '#3A2A1A' : '#FEF3C7' }]}>
              <Ionicons name="person-add-outline" size={10} color="#F59E0B" />
              <Text style={rowStyles.unassignedText}>Unassigned</Text>
            </View>
          )}
          {item.priority >= 4 && (
            <View style={[rowStyles.priorityBadge, { backgroundColor: isDark ? '#3A1A1A' : '#FEE2E2' }]}>
              <Ionicons name="alert-outline" size={10} color="#EF4444" />
              <Text style={rowStyles.priorityText}>P{item.priority}</Text>
            </View>
          )}
          <View style={rowStyles.spacer} />
          {unreadCount > 0 && (
            <View style={[rowStyles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={rowStyles.unreadText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
    flexShrink: 0,
  },
  body: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userId: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  unassignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  unassignedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  spacer: { flex: 1 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const STATUS_FILTER_OPTIONS: { label: string; value: SupportConversationStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Waiting Staff', value: 'WAITING_STAFF' },
  { label: 'Waiting User', value: 'WAITING_USER' },
  { label: 'Closed', value: 'CLOSED' },
];

const PAGE_LIMIT = 25;

export default function StaffSupportInboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [isActive, setIsActive] = useState(true);
  const [isFocused, setIsFocused] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<SupportConversationStatus | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);

  // Pagination
  const [extraPages, setExtraPages] = useState<StaffConversationSummaryDto[][]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pollInterval = isActive && isFocused ? POLL_INTERVAL : (false as const);

  const baseParams: StaffConversationListParams = useMemo(() => ({
    status: statusFilter ?? undefined,
    priority: priorityFilter ?? undefined,
    limit: PAGE_LIMIT,
    offset: 0,
  }), [statusFilter, priorityFilter]);

  const { conversations, isLoading, isError, refetch } = useStaffConversations(baseParams, {
    refetchInterval: pollInterval,
  });

  // Reset extra pages when filters change
  useEffect(() => {
    setExtraPages([]);
  }, [statusFilter, priorityFilter]);

  const allConversations = useMemo(
    () => [...conversations, ...extraPages.flat()],
    [conversations, extraPages],
  );

  const canLoadMore =
    conversations.length === PAGE_LIMIT ||
    (extraPages.length > 0 && (extraPages.at(-1)?.length ?? 0) === PAGE_LIMIT);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      refetch();
      return () => setIsFocused(false);
    }, [refetch]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      setIsActive(state === 'active');
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setExtraPages([]);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !canLoadMore) return;
    setIsLoadingMore(true);
    try {
      const nextOffset = PAGE_LIMIT + extraPages.flat().length;
      const more = await getStaffConversations({ ...baseParams, offset: nextOffset });
      setExtraPages((prev) => [...prev, more]);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, canLoadMore, extraPages, baseParams]);

  const handlePress = useCallback(
    (conversationId: string) => {
      router.push({
        pathname: '/(app)/staff-support-chat',
        params: { conversationId },
      } as any);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: StaffConversationSummaryDto }) => (
      <ConversationRow item={item} onPress={() => handlePress(item.id)} />
    ),
    [handlePress],
  );

  const filterBar = (
    <View style={[filterStyles.container, { backgroundColor: th.background, borderBottomColor: th.border }]}>
      {/* Status chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={filterStyles.row}
      >
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const isActive = statusFilter === opt.value;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[
                filterStyles.chip,
                isActive
                  ? { backgroundColor: colors.primary }
                  : { backgroundColor: isDark ? '#1E1E2E' : '#F3F4F6', borderColor: th.border },
              ]}
              onPress={() => setStatusFilter(opt.value)}
            >
              <Text
                style={[
                  filterStyles.chipText,
                  { color: isActive ? '#FFF' : th.textSecondary },
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Priority filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={filterStyles.row}
      >
        {[null, 1, 2, 3, 4, 5].map((p) => {
          const isSelected = priorityFilter === p;
          return (
            <TouchableOpacity
              key={String(p)}
              style={[
                filterStyles.chip,
                isSelected
                  ? { backgroundColor: p != null && p >= 4 ? '#EF4444' : colors.primary }
                  : { backgroundColor: isDark ? '#1E1E2E' : '#F3F4F6', borderColor: th.border },
              ]}
              onPress={() => setPriorityFilter(p)}
            >
              <Text
                style={[
                  filterStyles.chipText,
                  { color: isSelected ? '#FFF' : th.textSecondary },
                ]}
              >
                {p == null ? 'All P' : `P${p}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View style={[screenStyles.screen, { backgroundColor: th.background }]}>
      {/* Header */}
      <View
        style={[
          screenStyles.header,
          { paddingTop: insets.top, backgroundColor: th.background, borderBottomColor: th.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={screenStyles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <View style={screenStyles.headerCenter}>
          <Ionicons name="headset" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[screenStyles.headerTitle, { color: th.text }]} numberOfLines={1}>
            {t('support.staffInboxTitle')}
          </Text>
        </View>
        <View style={screenStyles.backBtn} />
      </View>

      {filterBar}

      {/* Content */}
      {isLoading && allConversations.length === 0 ? (
        <View style={screenStyles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError && allConversations.length === 0 ? (
        <View style={screenStyles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={th.textMuted} />
          <Text style={[screenStyles.errorText, { color: th.text }]}>
            {t('support.loadError')}
          </Text>
          <TouchableOpacity
            style={[screenStyles.retryBtn, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
            accessibilityRole="button"
          >
            <Text style={screenStyles.retryBtnText}>{t('support.retryLoad')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={allConversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={screenStyles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={screenStyles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color={th.textMuted} />
                <Text style={[screenStyles.emptyTitle, { color: th.text }]}>
                  {t('support.staffInboxEmpty')}
                </Text>
                <Text style={[screenStyles.emptySub, { color: th.textSecondary }]}>
                  {t('support.staffInboxEmptyBody')}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            canLoadMore ? (
              <TouchableOpacity
                style={[screenStyles.loadMoreBtn, { borderTopColor: th.border }]}
                onPress={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[screenStyles.loadMoreText, { color: colors.primary }]}>
                    Load more
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const screenStyles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  errorText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999, marginTop: 4 },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  listContent: { paddingBottom: 20 },
  emptyState: { padding: 40, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  loadMoreBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});

const filterStyles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
});
