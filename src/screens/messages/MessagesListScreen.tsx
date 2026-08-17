import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import SuperMessageDetailModal from '@/components/messages/SuperMessageDetailModal';
import { SuperMessageRow } from '@/components/messages/SuperMessageRow';
import { SupportConversationListItem } from '@/components/messages/SupportConversationListItem';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useCurrentUserId } from '@/hooks/auth/useCurrentUserId';
import { useSuperMessages } from '@/hooks/discovery/useSuperMessages';
import { useInbox } from '@/hooks/messages/useInbox';
import { useInboxChannel } from '@/hooks/messages/useInboxChannel';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useStaffConversations } from '@/hooks/support/useStaffConversations';
import { useSupportConversation } from '@/hooks/support/useSupportConversation';
import { useTheme } from '@/hooks/use-theme';
import type { InboxItem } from '@/types/chat';
import type { SuperMessageDto } from '@/types/superMessage';
import type { SupportConversationStatus } from '@/types/support';

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

  // ── Unified item type ───────────────────────────────────────────────────
  type UnifiedItem =
    | { kind: 'conversation'; item: InboxItem }
    | { kind: 'super_message'; item: SuperMessageDto; direction: 'sent' | 'received' };

  const [filter, setFilter] = useState<MessageFilter>('ALL');
  const [visibleIds, setVisibleIds] = useState<string[]>([]);
  const [detailModal, setDetailModal] = useState<{
    item: SuperMessageDto;
    direction: 'sent' | 'received';
  } | null>(null);
  const { getStatus } = useActivityStatuses(visibleIds);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 10, minimumViewTime: 0 });
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: UnifiedItem }> }) => {
      setVisibleIds(
        viewableItems
          .filter((v) => v.item.kind === 'conversation')
          .map((v) => (v.item as Extract<UnifiedItem, { kind: 'conversation' }>).item.participant.userId),
      );
    },
  );
  const {
    items: inboxItems,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInbox(filter as InboxFilter);

  useInboxChannel(currentUserId, filter as InboxFilter);

  const { data: sentSuperMessages = [] } = useSuperMessages('sent');
  const { data: receivedSuperMessages = [] } = useSuperMessages('received');

  // ── Build combined + sorted list ──────────────────────────────────────────
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const parseTs = (iso: string | null | undefined): number => {
      if (!iso) return 0;
      const t = new Date(iso).getTime();
      return isNaN(t) ? 0 : t;
    };
    const getTimestamp = (u: UnifiedItem): number => {
      if (u.kind === 'conversation') {
        return parseTs(u.item.lastMessageAt ?? u.item.matchedAt);
      }
      return parseTs(u.item.responded_at ?? u.item.created_at);
    };

    // Filter: for UNREAD, only include unread conversations and unviewed received super messages
    const conversations: UnifiedItem[] = inboxItems.map((item) => ({ kind: 'conversation', item }));

    // Exclude super messages that already have a matchId — they'll appear as regular conversations
    const pendingSent: UnifiedItem[] = sentSuperMessages
      .filter((sm) => !sm.match_id)
      .map((item) => ({ kind: 'super_message', item, direction: 'sent' as const }));
    // Also exclude PASSED received messages — receiver dismissed them
    const pendingReceived: UnifiedItem[] = receivedSuperMessages
      .filter((sm) => !sm.match_id && sm.status !== 'PASSED')
      .map((item) => ({ kind: 'super_message', item, direction: 'received' as const }));

    const all: UnifiedItem[] = [...conversations, ...pendingSent, ...pendingReceived];

    if (filter === 'UNREAD') {
      return all
        .filter((u) => {
          if (u.kind === 'conversation') return u.item.unreadCount > 0;
          if (u.kind === 'super_message') return u.direction === 'received' && !u.item.viewed_at;
          return false;
        })
        .sort((a, b) => getTimestamp(b) - getTimestamp(a));
    }

    return all.sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }, [inboxItems, sentSuperMessages, receivedSuperMessages, filter]);

  const { data: profile } = useCurrentProfile();
  const isStaff = profile?.role === 'ADMIN' || profile?.role === 'MODERATOR';

  const {
    conversation: supportConversation,
    isLoading: supportLoading,
    isError: supportError,
    unreadCount: supportUnread,
    refetch: supportRefetch,
  } = useSupportConversation();

  const {
    conversations: staffConversations,
    isLoading: staffLoading,
    isError: staffError,
    refetch: staffRefetch,
  } = useStaffConversations();

  const staffUnreadCount = useMemo(
    () => staffConversations.reduce(
      (sum, c) => sum + Math.max(0, c.next_public_sequence - 1 - c.staff_last_read_sequence),
      0,
    ),
    [staffConversations],
  );

  const handleSupportPress = useCallback(() => {
    router.push('/(app)/support-conversation' as any);
  }, [router]);

  const handleStaffSupportPress = useCallback(() => {
    router.push('/(app)/staff-support-inbox' as any);
  }, [router]);

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

  const handleSuperMessagePress = useCallback(
    (item: SuperMessageDto, direction: 'sent' | 'received') => {
      const isSent = direction === 'sent';
      const otherParty = isSent ? item.receiver : item.sender;
      if (item.match_id) {
        router.push({
          pathname: '/(app)/chat' as any,
          params: {
            matchId: item.match_id,
            displayName: otherParty?.display_name ?? '',
            avatarUrl: otherParty?.photo_url ?? '',
          },
        });
        return;
      }
      setDetailModal({ item, direction });
    },
    [router],
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item, index }: { item: UnifiedItem; index: number }) => {
      const isLast = index === unifiedItems.length - 1;
      if (item.kind === 'conversation') {
        return (
          <ConversationRow
            item={item.item}
            onPress={handleRowPress}
            isLast={isLast}
            activityStatus={getStatus(item.item.participant.userId, item.item.participant.activityStatus)}
          />
        );
      }
      return (
        <SuperMessageRow
          item={item.item}
          direction={item.direction}
          isLast={isLast}
          onPress={handleSuperMessagePress}
        />
      );
    },
    [handleRowPress, handleSuperMessagePress, unifiedItems.length, getStatus],
  );

  const keyExtractor = useCallback((item: UnifiedItem) =>
    item.kind === 'conversation' ? `conv-${item.item.matchId}` : `sm-${item.item.id}`,
  []);

  const supportProps: SupportHeaderProps = isStaff
    ? {
        isStaff: true,
        supportStatus: 'IDLE',
        supportLastMessageAt: null,
        supportUnreadCount: staffUnreadCount,
        supportLoading: staffLoading,
        supportError: staffError,
        onSupportPress: handleStaffSupportPress,
        onSupportRetry: () => staffRefetch(),
      }
    : {
        isStaff: false,
        supportStatus: supportConversation?.status ?? 'IDLE',
        supportLastMessageAt: supportConversation?.last_public_message_at ?? null,
        supportUnreadCount: supportUnread,
        supportLoading,
        supportError,
        onSupportPress: handleSupportPress,
        onSupportRetry: () => supportRefetch(),
      };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: th.bg, paddingTop: insets.top }]}>
        <Header filter={filter} onFilterChange={setFilter} th={th} {...supportProps} />
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
        <Header filter={filter} onFilterChange={setFilter} th={th} {...supportProps} />
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  // ── Content ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: th.bg }]}>
      <FlatList
        data={unifiedItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <Header filter={filter} onFilterChange={setFilter} th={th} {...supportProps} />
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
      <SuperMessageDetailModal
        visible={!!detailModal}
        item={detailModal?.item ?? null}
        direction={detailModal?.direction ?? null}
        onClose={() => setDetailModal(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header (extracted so it can be used in loading/error states too)
// ---------------------------------------------------------------------------

interface SupportHeaderProps {
  isStaff: boolean;
  supportStatus: SupportConversationStatus;
  supportLastMessageAt: string | null;
  supportUnreadCount: number;
  supportLoading: boolean;
  supportError: boolean;
  onSupportPress: () => void;
  onSupportRetry: () => void;
}

interface HeaderProps extends SupportHeaderProps {
  filter: MessageFilter;
  onFilterChange: (f: MessageFilter) => void;
  th: ReturnType<typeof useScreenTheme>;
}

function Header({
  filter,
  onFilterChange,
  th,
  isStaff,
  supportStatus,
  supportLastMessageAt,
  supportUnreadCount,
  supportLoading,
  supportError,
  onSupportPress,
  onSupportRetry,
}: HeaderProps) {
  const { t } = useTranslation();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <>
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

      {/* Support conversation — always first, always visible, full-width */}
      {isStaff ? (
        <StaffSupportItem
          unreadCount={supportUnreadCount}
          isLoading={supportLoading}
          isError={supportError}
          onPress={onSupportPress}
          onRetry={onSupportRetry}
          isDark={isDark}
          textColor={th.text}
          textSecondary={th.textSecondary}
          label={t('support.staffInboxTitle')}
          accessLabel={t('support.staffInboxAccess')}
        />
      ) : (
        <SupportConversationListItem
          status={supportStatus}
          lastPublicMessageAt={supportLastMessageAt}
          unreadCount={supportUnreadCount}
          isLoading={supportLoading}
          isError={supportError}
          onPress={onSupportPress}
          onRetry={onSupportRetry}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// StaffSupportItem — simple row for staff that navigates to the inbox
// ---------------------------------------------------------------------------

function StaffSupportItem({
  unreadCount,
  isLoading,
  isError,
  onPress,
  onRetry,
  isDark,
  textColor,
  textSecondary,
  label,
  accessLabel,
}: {
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  onPress: () => void;
  onRetry: () => void;
  isDark: boolean;
  textColor: string;
  textSecondary: string;
  label: string;
  accessLabel: string;
}) {
  const { t } = useTranslation();
  const rowBg = isDark ? '#1E1438' : '#F5F0FF';
  const borderColor = isDark ? '#4B2D8A' : '#DDD0F8';

  return (
    <TouchableOpacity
      style={[staffItemStyles.row, { backgroundColor: rowBg, borderColor }]}
      onPress={isError ? onRetry : onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={accessLabel}
    >
      <View style={[staffItemStyles.avatar, { backgroundColor: isDark ? '#2E1A5A' : '#EDE0FF' }]}>
        <Ionicons name="headset" size={26} color={colors.primary} />
      </View>
      <View style={staffItemStyles.body}>
        <View style={staffItemStyles.topRow}>
          <Text style={[staffItemStyles.title, { color: textColor }]} numberOfLines={1}>
            {label}
          </Text>
          {unreadCount > 0 && !isError && (
            <View style={[staffItemStyles.badge, { backgroundColor: colors.primary }]}>
              <Text style={staffItemStyles.badgeText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          )}
          {isError && (
            <Ionicons name="refresh" size={16} color={colors.danger} />
          )}
        </View>
        <Text style={[staffItemStyles.subtitle, { color: textSecondary }]} numberOfLines={1}>
          {isLoading ? '...' : isError ? 'Tap to retry' : t('support.staffInboxSubtitle')}
        </Text>
        <View style={[staffItemStyles.divider, { backgroundColor: isDark ? '#3D2A6E' : '#F0EAF9' }]} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={isDark ? '#7C6EA0' : '#C4AEF0'} style={{ marginRight: 4 }} />
    </TouchableOpacity>
  );
}

const staffItemStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderLeftWidth: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
  },
});

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
