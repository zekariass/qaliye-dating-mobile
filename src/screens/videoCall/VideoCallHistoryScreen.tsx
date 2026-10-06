/**
 * VideoCallHistoryScreen — Full paginated history for a match.
 * GET /api/v1/matches/{matchId}/video-call-requests
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVideoCallRequests } from '@/hooks/videoCall/useVideoCallRequests';
import type { VideoCallRequest, VideoCallRequestStatus } from '@/types/videoCall';

// ── Meta ───────────────────────────────────────────────────────────────────────

type StatusMeta = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  label: string;
  sub: (r: VideoCallRequest) => string;
};

const META: Record<VideoCallRequestStatus, StatusMeta> = {
  PENDING:   { icon: 'hourglass-outline', color: colors.warning,  label: 'Pending',   sub: (r) => r.is_requester ? 'You requested' : 'They requested' },
  ACCEPTED:  { icon: 'checkmark-circle',  color: colors.success,  label: 'Accepted',  sub: () => 'Call accepted' },
  COMPLETED: { icon: 'checkmark-circle',  color: colors.success,  label: 'Call completed', sub: (r) => r.is_requester ? 'You requested' : 'They requested' },
  DECLINED:  { icon: 'close-circle',      color: colors.danger,   label: 'Request declined', sub: (r) => r.is_requester ? 'They declined your request' : 'You declined the request' },
  CANCELLED: { icon: 'ban',               color: colors.textMuted, label: 'Request cancelled', sub: (r) => r.is_requester ? 'You cancelled the request' : 'They cancelled the request' },
  EXPIRED:   { icon: 'time-outline',      color: colors.textMuted, label: 'Request expired', sub: () => 'No response' },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VideoCallHistoryScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { matchId, displayName } = useLocalSearchParams<{
    matchId: string;
    displayName: string;
  }>();

  const { data: requests, isLoading, isFetching, refetch } = useVideoCallRequests(matchId ?? '');

  // Pull-to-refresh is user-initiated only — the 15s background poll must
  // stay silent, so the spinner is driven by a local flag, not isRefetching.
  const [userRefreshing, setUserRefreshing] = useState(false);
  useEffect(() => {
    if (!isFetching) setUserRefreshing(false);
  }, [isFetching]);
  const handleRefresh = useCallback(() => {
    setUserRefreshing(true);
    void refetch();
  }, [refetch]);

  // Show all terminal statuses as history
  const history = (requests ?? []).filter(
    (r) => !['PENDING', 'ACCEPTED'].includes(r.status),
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="call" size={15} color={th.textMuted} />
          <Ionicons name="videocam" size={15} color={th.textMuted} />
          <Text style={[styles.headerTitle, { color: th.text }]}>Call History</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={userRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          <Text style={[styles.sectionLabel, { color: th.textMuted }]}>HISTORY</Text>

          {history.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="videocam-outline" size={40} color={th.textMuted} />
              <Text style={[styles.emptyText, { color: th.textSecondary }]}>No history yet</Text>
            </View>
          ) : (
            history.map((req) => {
              const meta = META[req.status];
              return (
                <TouchableOpacity
                  key={req.id}
                  style={[styles.item, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border }]}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/video-call-history-detail' as never,
                      params: { requestId: req.id, matchId, displayName, callType: req.call_type },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.itemIcon, { backgroundColor: meta.color + '15' }]}>
                    <Ionicons name={req.call_type === 'AUDIO' ? 'call' : 'videocam'} size={20} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLabel, { color: th.text }]}>
                      {req.call_type === 'AUDIO' ? 'Audio call' : 'Video call'} · {meta.label}
                    </Text>
                    <Text style={[styles.itemSub, { color: th.textSecondary }]}>{meta.sub(req)}</Text>
                    <Text style={[styles.itemDate, { color: th.textMuted }]}>{fmtDate(req.created_at)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={th.textMuted} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, gap: spacing.sm },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl * 2 },
  emptyText: { fontSize: 15 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 2 },
  itemDate: { fontSize: 11, marginTop: 3 },
});
