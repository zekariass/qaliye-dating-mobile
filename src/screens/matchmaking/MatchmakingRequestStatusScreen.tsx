/**
 * Screen 7 — My Matchmaking Request
 *
 * Shows the current status of the user's active matchmaking request
 * with a journey timeline and status-specific messaging.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
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
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';

import { themedAlert } from '@/components/common/ThemedAlert';
import { colors, radius, spacing } from '@/constants/theme';
import {
    useActiveMatchmakingRequest,
    useCancelMatchmakingRequest,
    useMatchmakingRequest,
} from '@/hooks/matchmaking/useMatchmakingRequest';
import { useTheme } from '@/hooks/use-theme';
import type { MatchmakingRequestStatus } from '@/types/matchmaking';
import { extractApiError, getApiErrorMessage } from '@/utils/apiError';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MatchmakingRequestStatus, { label: string; color: string; description: string }> = {
  OPEN: {
    label: 'OPEN',
    color: colors.primary,
    description: 'Your matchmaker is carefully reviewing your request.',
  },
  ON_HOLD: {
    label: 'ON HOLD',
    color: colors.warning,
    description: 'An introduction is waiting for your decision.',
  },
  MATCHED: {
    label: 'MATCHED',
    color: colors.success,
    description: 'You have a match.',
  },
  COMPLETED: {
    label: 'COMPLETED',
    color: colors.success,
    description: 'This matchmaking request has finished.',
  },
  CANCELLED: {
    label: 'CANCELLED',
    color: colors.danger,
    description: 'This request was cancelled.',
  },
  EXPIRED: {
    label: 'EXPIRED',
    color: colors.textMuted,
    description: 'Your matchmaking request expired.',
  },
};

// ─── Journey steps ────────────────────────────────────────────────────────────

type JourneyStep = {
  label: string;
  sublabel?: string;
  done: boolean;
  active: boolean;
};

function getJourneySteps(status: MatchmakingRequestStatus): JourneyStep[] {
  const isSubmitted = true;
  const isUnderReview = ['OPEN', 'ON_HOLD', 'MATCHED', 'COMPLETED'].includes(status);
  const hasIntro = ['ON_HOLD', 'MATCHED', 'COMPLETED'].includes(status);
  const hasDecision = ['MATCHED', 'COMPLETED'].includes(status);

  return [
    {
      label: 'Request submitted',
      done: isSubmitted,
      active: false,
    },
    {
      label: 'Under review',
      sublabel: status === 'OPEN' ? 'Your matchmaker is reviewing your request.' : undefined,
      done: isUnderReview && status !== 'OPEN',
      active: status === 'OPEN',
    },
    {
      label: 'Introduction',
      sublabel: !hasIntro ? "You'll be notified when we find someone for you." : undefined,
      done: hasIntro,
      active: status === 'ON_HOLD',
    },
    {
      label: 'Your decision',
      done: hasDecision,
      active: false,
    },
  ];
}

// ─── Introductions count display ──────────────────────────────────────────────
function IntroCount({ request }: { request: any }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.introCountRow}>
      <Text style={[styles.introCountLabel, { color: th.textSecondary }]}>Introductions</Text>
      <Text style={[styles.introCountValue, { color: th.text }]}>
        {request.active_introduction_id ? '1 / 1' : '0 / 1'}
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MatchmakingRequestStatusScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();

  const activeQuery = useActiveMatchmakingRequest();
  const specificQuery = useMatchmakingRequest(requestId ?? null);
  const query = requestId ? specificQuery : activeQuery;
  const request = query.data;

  const cancelMutation = useCancelMatchmakingRequest();

  useFocusEffect(
    useCallback(() => {
      query.refetch();
    }, []),
  );

  const handleCancel = useCallback(() => {
    if (!request) return;
    themedAlert({
      title: 'Cancel Request',
      message: 'Are you sure you want to cancel your matchmaking request? This action cannot be undone.',
      buttons: [
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelMutation.mutate(request.id, {
              onSuccess: () => router.replace('/(app)/shimgilina' as never),
              onError: (err) => {
                const detail = extractApiError(err);
                themedAlert({ title: 'Could not cancel', message: getApiErrorMessage(detail) });
              },
            });
          },
        },
        { text: 'Keep Request', style: 'cancel' },
      ],
    });
  }, [request, cancelMutation, router]);

  if (query.isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: th.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
        </SafeAreaView>
        <MatchmakingTabBar activeTab="requests" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.root, { backgroundColor: th.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: th.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={th.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: th.text }]}>My Matchmaking</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={56} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: th.text }]}>No active request</Text>
            <Text style={[styles.emptySub, { color: th.textSecondary }]}>
              Start your matchmaking journey to find the right person.
            </Text>
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/(app)/shimgilina' as never)}
            >
              <Text style={styles.startBtnText}>Start Matchmaking</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <MatchmakingTabBar activeTab="requests" />
      </View>
    );
  }

  const config = STATUS_CONFIG[request.status];
  const journeySteps = getJourneySteps(request.status);
  const isTerminal = ['MATCHED', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(request.status);
  const canCancel = ['OPEN', 'ON_HOLD'].includes(request.status);
  const hasIntro = request.status === 'ON_HOLD' && !!request.active_introduction_id;

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>My Matchmaking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.sectionLabel, { color: th.textMuted }]}>CURRENT REQUEST</Text>

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: th.surface, borderColor: th.border }]}>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: config.color + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: config.color }]} />
            <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: th.border }]} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: th.textSecondary }]}>Submitted</Text>
              <Text style={[styles.metaValue, { color: th.text }]}>{fmtDate(request.created_at)}</Text>
            </View>
            {request.expires_at && (
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: th.textSecondary }]}>Expires</Text>
                <Text style={[styles.metaValue, { color: th.text }]}>{fmtDate(request.expires_at)}</Text>
              </View>
            )}
          </View>

          <IntroCount request={request} />
        </View>

        {/* ON_HOLD: Introduction CTA */}
        {hasIntro && (
          <TouchableOpacity
            style={[styles.introCta, { backgroundColor: colors.primary }]}
            onPress={() =>
              router.push({
                pathname: '/(app)/shimgilina-introduction' as never,
                params: { introductionId: request.active_introduction_id! },
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="person-add" size={20} color="#FFF" />
            <Text style={styles.introCtaText}>View Introduction</Text>
          </TouchableOpacity>
        )}

        {/* Journey timeline */}
        <Text style={[styles.sectionLabel, { color: th.textMuted }]}>YOUR JOURNEY</Text>

        <View style={[styles.timelineCard, { backgroundColor: th.surface, borderColor: th.border }]}>
          {journeySteps.map((step, i) => (
            <View key={i} style={styles.timelineStep}>
              <View style={styles.timelineLeft}>
                <View style={[
                  styles.timelineCircle,
                  step.done && { backgroundColor: colors.success },
                  step.active && { backgroundColor: colors.primary },
                  !step.done && !step.active && { backgroundColor: 'transparent', borderWidth: 2, borderColor: th.border },
                ]}>
                  {step.done && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  {step.active && !step.done && <View style={[styles.activeDot, { backgroundColor: '#FFF' }]} />}
                </View>
                {i < journeySteps.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: step.done ? colors.success : th.border }]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[
                  styles.timelineLabel,
                  { color: step.done || step.active ? th.text : th.textMuted },
                  step.active && { fontWeight: '700', color: colors.primary },
                ]}>
                  {step.label}
                </Text>
                {step.sublabel && (
                  <Text style={[styles.timelineSub, { color: th.textSecondary }]}>{step.sublabel}</Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* View Preferences */}
        <TouchableOpacity
          style={[styles.prefsBtn, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={() => router.push('/(app)/shimgilina-preferences' as never)}
          activeOpacity={0.7}
        >
          <Text style={[styles.prefsBtnText, { color: colors.primary }]}>View Preferences</Text>
        </TouchableOpacity>

        {/* Start new if terminal */}
        {isTerminal && (
          <TouchableOpacity
            style={[styles.startNewBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/(app)/shimgilina' as never)}
          >
            <Text style={styles.startNewText}>Start New Request</Text>
          </TouchableOpacity>
        )}

        {/* Cancel */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending
              ? <ActivityIndicator color={colors.danger} size="small" />
              : <Text style={[styles.cancelText, { color: colors.danger }]}>Cancel Request</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
      </SafeAreaView>
      <MatchmakingTabBar activeTab="requests" />
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
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  startBtn: { borderRadius: radius.xl, paddingVertical: 14, paddingHorizontal: spacing.xl },
  startBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  statusCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  cardDivider: { height: StyleSheet.hairlineWidth },
  metaGrid: { flexDirection: 'row', gap: spacing.lg },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  metaValue: { fontSize: 14, fontWeight: '600' },
  introCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  introCountLabel: { fontSize: 13 },
  introCountValue: { fontSize: 13, fontWeight: '700' },
  introCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    paddingVertical: 16,
  },
  introCtaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  timelineCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: 0,
  },
  timelineStep: { flexDirection: 'row', gap: spacing.md, minHeight: 52 },
  timelineLeft: { alignItems: 'center', width: 24 },
  timelineCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { flex: 1, width: 2, marginTop: 2 },
  timelineContent: { flex: 1, paddingTop: 2, paddingBottom: spacing.md },
  timelineLabel: { fontSize: 15, fontWeight: '500' },
  timelineSub: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  prefsBtn: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: 'center',
  },
  prefsBtnText: { fontSize: 16, fontWeight: '600' },
  startNewBtn: {
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startNewText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
