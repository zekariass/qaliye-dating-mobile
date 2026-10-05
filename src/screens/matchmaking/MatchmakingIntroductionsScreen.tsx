/**
 * Intros tab — Introduction history list.
 *
 * Bound to GET /api/v1/matchmaking/introductions (caller's own intros,
 * REQUESTER or CANDIDATE, newest first).
 *
 * - PROPOSED  → "Awaiting your decision" / "Waiting for them" — tap to review
 * - MATCHED   → mutual interest — tap to open the match
 * - DECLINED / CANCELLED / EXPIRED → ended introductions
 *
 * Note: `partner_decision` is server-masked to PENDING while the caller hasn't
 * decided — the UI never renders it as a distinct state.
 */
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
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
import { useMatchmakingIntroductions } from '@/hooks/matchmaking/useMatchmakingIntroduction';
import { useTheme } from '@/hooks/use-theme';
import type { IntroductionStatus, IntroductionSummary } from '@/types/matchmaking';

// ─── Status badges ────────────────────────────────────────────────────────────

const STATUS_META: Record<
  IntroductionStatus,
  { label: string; color: string }
> = {
  PROPOSED: { label: 'Awaiting decision', color: colors.warning },
  MATCHED: { label: "It's a match", color: colors.success },
  DECLINED: { label: 'Declined', color: colors.danger },
  CANCELLED: { label: 'Cancelled', color: colors.textMuted },
  EXPIRED: { label: 'Expired', color: colors.textMuted },
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function IntroductionRow({ intro }: { intro: IntroductionSummary }) {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const partner = intro.partner;
  const statusMeta = STATUS_META[intro.status];
  // Finer label for PROPOSED once the caller has already decided.
  const statusLabel =
    intro.status === 'PROPOSED' && intro.your_decision !== 'PENDING'
      ? 'Waiting for them'
      : statusMeta.label;

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border },
      ]}
      onPress={() =>
        router.push({
          pathname: '/(app)/shimgilina-introduction' as never,
          params: { introductionId: intro.id },
        })
      }
      activeOpacity={0.75}
      accessibilityRole="button"
    >
      {/* Avatar */}
      {partner?.primary_photo_url ? (
        <Image source={{ uri: partner.primary_photo_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary + '14' }]}>
          <Ionicons name="person" size={22} color={colors.primary + '80'} />
        </View>
      )}

      {/* Info */}
      <View style={styles.rowInfo}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, { color: th.text }]} numberOfLines={1}>
            {`${partner?.display_name ?? 'Match'}${partner?.age != null ? `, ${partner.age}` : ''}`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusMeta.color + '14' }]}>
            <Text style={[styles.statusText, { color: statusMeta.color }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={[styles.rowSub, { color: th.textSecondary }]} numberOfLines={1}>
          {`${fmtDate(intro.proposed_at ?? intro.created_at)} · ${intro.overall_percentage}% match`}
        </Text>
      </View>

      {intro.status === 'PROPOSED' && intro.your_decision === 'PENDING' && (
        <View style={[styles.pendingDot, { backgroundColor: colors.secondary }]} />
      )}

      <Ionicons name="chevron-forward" size={18} color={th.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MatchmakingIntroductionsScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();

  const { data: intros, isLoading, isError, refetch, isFetching } =
    useMatchmakingIntroductions(0, 50);

  const isEmpty = !isLoading && !isError && intros.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: th.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={th.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: th.text }]}>Introductions</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
        ) : isError ? (
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.danger + '14' }]}>
              <Ionicons name="cloud-offline-outline" size={44} color={colors.danger} />
            </View>
            <Text style={[styles.emptyTitle, { color: th.text }]}>Couldn't load introductions</Text>
            <Text style={[styles.emptySub, { color: th.textSecondary }]}>
              Check your connection and try again.
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { borderColor: colors.primary }]}
              onPress={() => refetch()}
              activeOpacity={0.7}
            >
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : isEmpty ? (
          <ScrollView
            contentContainerStyle={styles.emptyWrap}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={() => refetch()}
                tintColor={colors.primary}
              />
            }
          >
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '14' }]}>
              <Ionicons name="heart-outline" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: th.text }]}>No introductions yet</Text>
            <Text style={[styles.emptySub, { color: th.textSecondary }]}>
              You'll be notified when your matchmaker finds someone for you.
            </Text>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching}
                onRefresh={() => refetch()}
                tintColor={colors.primary}
              />
            }
          >
            {intros.map((intro) => (
              <IntroductionRow key={intro.id} intro={intro} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
      <MatchmakingTabBar activeTab="introductions" />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retryBtn: {
    borderWidth: 1.5,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xs,
  },
  retryText: { fontSize: 15, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  rowSub: { fontSize: 13 },
  pendingDot: { width: 9, height: 9, borderRadius: 5 },
});
