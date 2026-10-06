import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchRoundQuestions, submitFinalDecision } from '@/api/blindDate/blindDateApi';
import { AnonymousParticipantCard } from '@/components/blind-date/AnonymousParticipantCard';
import BlindDateBottomNav from '@/components/blind-date/BlindDateBottomNav';
import { FlowBackdrop } from '@/components/blind-date/FlowBackdrop';
import {
    normalizeQuestionText,
    QuestionSetPicker
} from '@/components/blind-date/QuestionSetPicker';
import { RoundProgressBar } from '@/components/blind-date/RoundProgressBar';
import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { bdColors, bdGradients } from '@/constants/blindDateTheme';
import { colors } from '@/constants/theme';
import { useBlindDateConfiguration } from '@/hooks/blindDate/useBlindDateConfiguration';
import {
    useSessionManage,
    useSessionManageMutations,
} from '@/hooks/blindDate/useSessionManage';
import { useTheme } from '@/hooks/use-theme';
import type {
    BlindDateRosterParticipantDto,
    BlindDateSelectionDecision
} from '@/types/blindDate';
import { isRetryableBlindDateError } from '@/utils/blindDateErrors';
import { formatDecisionDeadline, formatTimeLeft } from '@/utils/blindDateFormat';

// ─── Chapter model ────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Sub-views ────────────────────────────────────────────────────────────────

/** Session header hero — warm gradient banner. */
function SessionHero({
  session,
  maxRounds,
  maxParticipants,
  participantsCount,
}: {
  session: NonNullable<ReturnType<typeof useSessionManage>['session']>;
  maxRounds: number | null;
  maxParticipants: number | null;
  participantsCount: number;
}) {
  const { t } = useTranslation();
  const openRound = session.rounds?.find((r) => r.status === 'OPEN') ?? null;
  const hasAnyRound = (session.rounds?.length ?? 0) > 0;
  const round = session.current_round_number;
  const isFinalRound = hasAnyRound && maxRounds != null && round >= maxRounds;

  return (
    <LinearGradient
      // Final round swaps the violet hero for gold — an unmistakable visual
      // cue that the creator is now picking a finalist, not advancing a round.
      colors={
        (isFinalRound && session.status === 'OPEN'
          ? bdGradients.gold
          : bdGradients.hero) as unknown as [string, string, string]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroTopRow}>
        <View>
          <Text style={styles.heroKicker}>{t('blindDate.manage.heroKicker')}</Text>
          <Text style={styles.heroTitle}>
            {(!hasAnyRound
              ? t('blindDate.manage.heroNotStarted')
              : isFinalRound
                ? t('blindDate.manage.heroFinalRound')
                : t('blindDate.manage.heroRound', { round })) +
              (openRound
                ? t('blindDate.manage.heroLiveSuffix')
                : hasAnyRound && session.status === 'OPEN'
                  ? t('blindDate.manage.heroClosedSuffix')
                  : '')}
          </Text>
          <Text style={styles.heroSub}>
            {session.status === 'REVEAL'
              ? t('blindDate.manage.heroAwaitingDecisions')
              : session.status === 'OPEN'
                ? hasAnyRound
                  ? t('blindDate.manage.heroReview')
                  : t('blindDate.manage.heroPickQuestions')
                : t('blindDate.manage.heroStatusFallback', { status: session.status.toLowerCase() })}
          </Text>
        </View>
        {isFinalRound && session.status === 'OPEN' && (
          <View style={styles.finalBadge}>
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={styles.finalBadgeText}>{t('blindDate.manage.finalBadge')}</Text>
          </View>
        )}
      </View>

      <View style={styles.heroStats}>
        {[
          { icon: 'people' as const,      value: maxParticipants != null ? `${participantsCount}/${maxParticipants}` : `${participantsCount}`, label: t('blindDate.manage.statJoined') },
          { icon: 'albums-outline' as const, value: maxRounds != null ? `${round}/${maxRounds}` : `${round}`,                label: t('blindDate.manage.statRounds') },
          { icon: 'time-outline' as const,   value: session.expires_at ? formatTimeLeft(session.expires_at) : t('blindDate.manage.noExpiry'), label: session.expires_at ? t('blindDate.manage.statRemaining') : t('blindDate.manage.statClosing') },
        ].map((s) => (
          <View key={s.icon} style={styles.heroStat}>
            <Ionicons name={s.icon} size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroStatValue}>{s.value}</Text>
            <Text style={styles.heroStatLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

/** Participant roster for review phase. */
function ReviewRoster({
  participants,
  selectable,
  isFinalRound,
  pendingId,
  onSelect,
}: {
  participants: BlindDateRosterParticipantDto[];
  selectable: boolean;
  isFinalRound: boolean;
  pendingId: string | null;
  onSelect: (p: BlindDateRosterParticipantDto, d: BlindDateSelectionDecision) => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  if (participants.length === 0) {
    return (
      <View style={[styles.emptyCard, { borderColor: th.border, backgroundColor: th.surface }]}>
        <Ionicons name="people-outline" size={36} color={bdColors.primary} />
        <Text style={[styles.emptyTitle, { color: th.text }]}>{t('blindDate.manage.roster.emptyTitle')}</Text>
        <Text style={[styles.emptySub, { color: th.textSecondary }]}>
          {t('blindDate.manage.roster.emptySub')}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.rosterHead}>
        {isFinalRound && (
          <Ionicons name="star" size={16} color={bdColors.gold} />
        )}
        <Text style={[styles.rosterTitle, { color: isFinalRound ? (isDark ? bdColors.gold : '#B45309') : th.text }]}>
          {t('blindDate.manage.roster.title')}
        </Text>
        <Text style={[styles.rosterCount, { color: th.textSecondary }]}>
          {t('blindDate.manage.roster.activeCount', { count: participants.filter((p) => p.status === 'ACTIVE' || p.status === 'ADVANCED').length })}
          {(() => {
            const marked = participants.filter((p) => p.decision === 'ADVANCE').length;
            return marked > 0 ? `  ·  ${t('blindDate.manage.roster.selectedCount', { count: marked })}` : '';
          })()}
        </Text>
      </View>
      {participants.map((p, i) => (
        <AnonymousParticipantCard
          key={p.participant_id}
          participant={p}
          index={i}
          onSelect={(d) => onSelect(p, d)}
          pending={pendingId === p.participant_id}
          selectable={selectable}
          isFinalRound={isFinalRound}
          disabled={!selectable}
        />
      ))}
    </View>
  );
}

/** Reveal banner shown when session is in REVEAL state. */
function RevealBanner({ session }: { session: NonNullable<ReturnType<typeof useSessionManage>['session']> }) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const fd = session.final_decision;
  const deadline = formatDecisionDeadline(fd?.decision_deadline_at);
  const decided = fd?.other_party_decided;

  return (
    <View style={[styles.revealBanner, { backgroundColor: `${bdColors.primary}12`, borderColor: `${bdColors.primary}40` }]}>
      <Ionicons name="eye" size={20} color={bdColors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.revealBannerTitle, { color: th.text }]}>{t('blindDate.manage.reveal.title')}</Text>
        <Text style={[styles.revealBannerSub, { color: th.textSecondary }]}>
          {deadline ?? t('blindDate.manage.reveal.deciding')}
          {decided ? ` · ${t('blindDate.manage.reveal.theyDecided')}` : ''}
        </Text>
      </View>
    </View>
  );
}

/** Final decision buttons for creator. */
function CreatorDecisionPanel({
  session,
  onDecide,
  deciding,
}: {
  session: NonNullable<ReturnType<typeof useSessionManage>['session']>;
  onDecide: (d: 'INTERESTED' | 'NOT_INTERESTED') => void;
  deciding: boolean;
}) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const fd = session.final_decision;
  if (!fd) return null;

  if (fd.outcome === 'MATCHED' || fd.outcome === 'ALREADY_MATCHED') {
    return (
      <View style={[styles.outcomeCard, { backgroundColor: `${colors.success}10`, borderColor: colors.success }]}>
        <Ionicons name="heart" size={24} color={colors.success} />
        <Text style={[styles.outcomeTitle, { color: colors.success }]}>{t('blindDate.manage.decision.matchTitle')}</Text>
        <Text style={[styles.outcomeSub, { color: th.textSecondary }]}>
          {fd.outcome === 'MATCHED'
            ? t('blindDate.manage.decision.matchSub')
            : t('blindDate.manage.decision.alreadyConnectedSub')}
        </Text>
      </View>
    );
  }

  if (fd.outcome === 'NO_MATCH' || fd.outcome === 'EXPIRED') {
    return (
      <View style={[styles.outcomeCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        <Ionicons name="heart-dislike-outline" size={24} color={bdColors.slate} />
        <Text style={[styles.outcomeTitle, { color: th.text }]}>
          {fd.outcome === 'EXPIRED' ? t('blindDate.manage.decision.expiredTitle') : t('blindDate.manage.decision.noMatchTitle')}
        </Text>
        <Text style={[styles.outcomeSub, { color: th.textSecondary }]}>
          {fd.outcome === 'EXPIRED'
            ? t('blindDate.manage.decision.expiredSub')
            : t('blindDate.manage.decision.noMatchSub')}
        </Text>
      </View>
    );
  }

  if (fd.my_decision !== 'PENDING' && fd.my_decision != null) {
    return (
      <View style={[styles.outcomeCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }]}>
        <Ionicons name="hourglass-outline" size={22} color={colors.primary} />
        <Text style={[styles.outcomeTitle, { color: th.text }]}>{t('blindDate.manage.decision.waitingTitle')}</Text>
        <Text style={[styles.outcomeSub, { color: th.textSecondary }]}>
          {t('blindDate.manage.decision.youChose', {
            choice: fd.my_decision === 'INTERESTED' ? t('blindDate.manage.decision.choiceInterested') : t('blindDate.manage.decision.choiceNotInterested'),
          })}
          {fd.other_party_decided ? t('blindDate.manage.decision.suffixTheyDecided') : t('blindDate.manage.decision.suffixWaiting')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.decisionCard, { backgroundColor: th.surface, borderColor: th.border }]}>
      <Text style={[styles.decisionTitle, { color: th.text }]}>{t('blindDate.manage.decision.yourDecision')}</Text>
      <Text style={[styles.decisionSub, { color: th.textSecondary }]}>
        {t('blindDate.manage.decision.subtitle')}
      </Text>
      <View style={styles.decisionBtnRow}>
        <TouchableOpacity
          style={[styles.decisionBtn, { backgroundColor: bdColors.primary }]}
          onPress={() => onDecide('INTERESTED')}
          disabled={deciding}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {deciding ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="heart" size={18} color="#FFF" />
              <Text style={styles.decisionBtnText}>{t('blindDate.manage.decision.interested')}</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.decisionBtn, { backgroundColor: th.background, borderColor: th.border, borderWidth: 1.5 }]}
          onPress={() => onDecide('NOT_INTERESTED')}
          disabled={deciding}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Ionicons name="close" size={18} color={th.textSecondary} />
          <Text style={[styles.decisionBtnText, { color: th.textSecondary }]}>{t('blindDate.manage.decision.notForMe')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

export default function SessionManageScreen() {
  const { t } = useTranslation();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const { session, participants, isCreator, isLoading, isError, refetch, isRefetching } =
    useSessionManage(sessionId ?? null);
  const { configuration } = useBlindDateConfiguration();
  const { select, closeRound, nextRound, closeSession, friendlyError } =
    useSessionManageMutations(sessionId ?? null);

  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [pickedQ, setPickedQ] = useState<Set<string>>(new Set());
  const [pickedC, setPickedC] = useState<Set<string>>(new Set());
  const [roundPickerOpen, setRoundPickerOpen] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [userRefreshing, setUserRefreshing] = useState(false);

  // Clear the user-pull indicator once the background fetch settles so
  // mutation-triggered refetches (selections, round actions) never flash
  // the pull-to-refresh spinner.
  useEffect(() => {
    if (!isRefetching) setUserRefreshing(false);
  }, [isRefetching]);

  const handleManualRefresh = useCallback(() => {
    setUserRefreshing(true);
    refetch();
  }, [refetch]);

  // The manage screen is creator-only. If the session detail resolves and
  // the caller isn't the creator (e.g. deep link or stale nav from a joined
  // "My Sessions" row), send them to the participant flow — the roster
  // endpoint 403s for participants by design.
  useEffect(() => {
    if (isCreator === false && sessionId) {
      router.replace({
        pathname: '/(app)/blind-date-participant' as never,
        params: { sessionId },
      });
    }
  }, [isCreator, sessionId, router]);

  const openRound = useMemo(
    () => (session?.rounds ?? []).find((r) => r.status === 'OPEN') ?? null,
    [session],
  );
  const sessionOpen = session?.status === 'OPEN';
  // REVEAL waits on both final decisions; while the outcome is still pending
  // the creator may end the session early (e.g. an unresponsive finalist)
  // instead of waiting out the decision deadline.
  const revealPending =
    session?.status === 'REVEAL' && session.final_decision?.outcome == null;
  // null → limit not exposed (older backend); show uncapped UI and let the
  // server enforce (max_rounds_reached / session_full error codes).
  const maxRounds = configuration?.limits?.max_rounds ?? null;
  const maxParticipants = configuration?.limits?.max_participants ?? null;
  const maxRoundQuestions = configuration?.limits?.max_round_questions;
  const currentRound = session?.current_round_number ?? 1;
  const hasAnyRound = (session?.rounds?.length ?? 0) > 0;
  // A fresh session has no rounds yet — it isn't "final" until at least one
  // round exists, otherwise max_rounds=1 could never be started.
  const isFinalRound = hasAnyRound && maxRounds != null && currentRound >= maxRounds;
  // Next round is always derived from the round count, not current_round_number —
  // a fresh session (empty rounds) starts at 1, a closed-round session at N+1.
  const nextRoundNumber = (session?.rounds?.length ?? 0) + 1;
  const canStartNextRound = !!session && sessionOpen && !openRound && !isFinalRound;
  // Roster `answers` are the current open round's answers — empty until the
  // participant submits. Advancing with zero submissions is meaningless.
  const anyCurrentRoundAnswers = participants.some((p) =>
    (p.answers ?? []).some((a) => a.submitted_at != null),
  );
  // A recorded decision counts too — the API allows selecting before any
  // answers arrive (which locks that participant's answers), so requiring
  // submissions would deadlock the host once everyone is marked.
  const anySelection = participants.some((p) => p.decision != null);
  const canAdvanceRound = anyCurrentRoundAnswers || anySelection;

  // Eliminated participants belong to the round that eliminated them — the
  // backend leaves `current_round_id` pointing at it (only advancement moves
  // it). The roster shows the open round, or the latest round while a new
  // one hasn't started yet, so drop eliminations from earlier rounds.
  const rosterRoundId =
    openRound?.id ??
    (session?.rounds ?? []).reduce<{ id: string; round_number: number } | null>(
      (latest, r) => (latest == null || r.round_number > latest.round_number ? r : latest),
      null,
    )?.id ??
    null;
  const rosterParticipants = participants.filter(
    (p) =>
      p.status !== 'ELIMINATED' ||
      p.current_round_id == null ||
      rosterRoundId == null ||
      p.current_round_id === rosterRoundId,
  );

  // Collect question texts already snapshotted into earlier rounds (§12.1).
  const roundQuestionQueries = useQueries({
    queries: (session?.rounds ?? []).map((r) => ({
      queryKey: ['blindDate', 'roundQuestions', r.id],
      queryFn: () => fetchRoundQuestions(r.id),
      staleTime: 60_000,
    })),
  });
  const usedTexts = useMemo(() => {
    const set = new Set<string>();
    for (const q of roundQuestionQueries) {
      for (const sq of q.data ?? []) set.add(normalizeQuestionText(sq.question));
    }
    return set;
  }, [roundQuestionQueries]);

  const pickedCount = pickedQ.size + pickedC.size;

  // ── Selections ──────────────────────────────────────────────────────────────

  const doSelect = (p: BlindDateRosterParticipantDto, decision: BlindDateSelectionDecision) => {
    setPendingSelectId(p.participant_id);
    select.mutate(
      { participantId: p.participant_id, decision },
      {
        onSettled: () => setPendingSelectId(null),
        onError: (e) => themedError(t('blindDate.manage.errors.selectFailed'), friendlyError(e)),
        onSuccess: () => {
          if (decision === 'SELECT_FINALIST') {
            themedSuccess(t('blindDate.manage.success.finalistTitle'), t('blindDate.manage.success.finalistMessage'));
          }
        },
      },
    );
  };

  const handleSelect = (p: BlindDateRosterParticipantDto, decision: BlindDateSelectionDecision) => {
    if (decision === 'ADVANCE') {
      doSelect(p, decision);
      return;
    }
    if (decision === 'ELIMINATE') {
      themedAlert({
        title: t('blindDate.manage.alerts.passTitle'),
        message: t('blindDate.manage.alerts.passMessage'),
        icon: 'person-remove-outline',
        iconColor: colors.danger,
        buttons: [
          { text: t('blindDate.common.cancel'), style: 'cancel' },
          { text: t('blindDate.manage.alerts.passButton'), style: 'destructive', onPress: () => doSelect(p, decision) },
        ],
      });
      return;
    }
    themedAlert({
      title: t('blindDate.manage.alerts.finalistTitle'),
      message: t('blindDate.manage.alerts.finalistMessage'),
      icon: 'star',
      iconColor: bdColors.gold,
      buttons: [
        { text: t('blindDate.common.cancel'), style: 'cancel' },
        { text: t('blindDate.manage.alerts.finalistButton'), onPress: () => doSelect(p, decision) },
      ],
    });
  };

  const handleAdvanceToNextRound = () => {
    const selectedCount = participants.filter((p) => p.decision === 'ADVANCE').length;
    themedAlert({
      title: t('blindDate.manage.alerts.startRoundTitle', { round: currentRound + 1 }),
      message:
        selectedCount === 0
          ? t('blindDate.manage.alerts.startRoundMessageNone')
          : selectedCount === 1
            ? t('blindDate.manage.alerts.startRoundMessageOne')
            : t('blindDate.manage.alerts.startRoundMessageMany', { count: selectedCount }),
      icon: 'arrow-forward-circle-outline',
      iconColor: bdColors.primary,
      buttons: [
        { text: t('blindDate.common.cancel'), style: 'cancel' },
        {
          text: t('blindDate.common.continue'),
          onPress: () =>
            closeRound.mutate(undefined, {
              onSuccess: () => setRoundPickerOpen(true),
              onError: (e) => themedError(t('blindDate.manage.errors.closeRound'), friendlyError(e)),
            }),
        },
      ],
    });
  };

  const handleCloseSession = () =>
    themedAlert({
      title: t('blindDate.manage.alerts.endTitle'),
      message:
        session?.status === 'REVEAL'
          ? t('blindDate.manage.alerts.endRevealMessage')
          : t('blindDate.manage.alerts.endMessage'),
      icon: 'power',
      iconColor: colors.danger,
      buttons: [
        { text: t('blindDate.common.cancel'), style: 'cancel' },
        {
          text: t('blindDate.manage.alerts.endButton'),
          style: 'destructive',
          onPress: () =>
            closeSession.mutate(undefined, {
              onSuccess: () => {
                themedSuccess(t('blindDate.manage.success.closed'));
                router.back();
              },
              onError: (e) => themedError(t('blindDate.manage.errors.closeSession'), friendlyError(e)),
            }),
        },
      ],
    });

  const handleStartRound = () =>
    nextRound.mutate(
      { questionIds: [...pickedQ], customQuestionIds: [...pickedC] },
      {
        onSuccess: () => {
          setRoundPickerOpen(false);
          setPickedQ(new Set());
          setPickedC(new Set());
          themedSuccess(t('blindDate.manage.success.roundStartedTitle'), t('blindDate.manage.success.roundStartedMessage'));
        },
        onError: (e) => themedError(t('blindDate.manage.errors.startRound'), friendlyError(e, maxRoundQuestions)),
      },
    );

  const handleFinalDecision = (decision: 'INTERESTED' | 'NOT_INTERESTED') => {
    if (!sessionId || deciding) return;
    setDeciding(true);
    // match_conflict / like_conflict lost a concurrent race — the contract
    // says one retry is safe and resolves to the committed state.
    const submit = () => submitFinalDecision(sessionId, decision);
    submit()
      .catch((e) => (isRetryableBlindDateError(e) ? submit() : Promise.reject(e)))
      .then(() => refetch())
      .catch((e: unknown) => themedError(t('blindDate.manage.errors.submitDecision'), friendlyError(e)))
      .finally(() => setDeciding(false));
  };

  // ── Chapter derivation ─────────────────────────────────────────────────────

  // ── Loading / error states ─────────────────────────────────────────────────

  const bottomNav = (
    <BlindDateBottomNav
      activeTab="mine"
      onHome={() => router.replace('/(app)/(tabs)' as never)}
      onExplore={() => router.replace('/(app)/blind-date' as never)}
      onMine={() =>
        router.replace({
          pathname: '/(app)/blind-date' as never,
          params: { tab: 'mine' },
        })
      }
      onJoined={() =>
        router.replace({
          pathname: '/(app)/blind-date' as never,
          params: { tab: 'participating' },
        })
      }
      onMatches={() => router.push('/(app)/(tabs)/matches' as never)}
    />
  );

  // Non-creator — the effect above replaces to the participant flow; show a
  // spinner in the meantime so no creator UI flashes.
  if (isLoading || isCreator === false) {
    return (
      <View style={[styles.screen, { backgroundColor: th.background }]}>
        <View style={styles.centerFill}>
          <ActivityIndicator color={bdColors.primary} size="large" />
        </View>
        {bottomNav}
      </View>
    );
  }

  if (isError || !session) {
    return (
      <View style={[styles.screen, { backgroundColor: th.background }]}>
        <View style={styles.centerFill}>
          <Ionicons name="cloud-offline-outline" size={48} color={bdColors.primary} />
          <Text style={[styles.emptyTitle, { color: th.text, marginTop: 12 }]}>{t('blindDate.manage.loadError')}</Text>
          <TouchableOpacity onPress={refetch} accessibilityRole="button">
            <Text style={{ color: bdColors.primary, fontWeight: '700', marginTop: 8 }}>{t('blindDate.common.retry')}</Text>
          </TouchableOpacity>
        </View>
        {bottomNav}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <FlowBackdrop />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: th.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('blindDate.common.back')}
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>{t('blindDate.manage.title')}</Text>
        <View style={[styles.statusPill, { backgroundColor: `${bdColors.primary}1F` }]}>
          <Text style={[styles.statusPillText, { color: bdColors.primary }]}>
            {({
              OPEN: t('blindDate.status.live'),
              REVEAL: t('blindDate.status.reveal'),
              COMPLETED: t('blindDate.status.ended'),
              CLOSED: t('blindDate.status.closed'),
              CANCELLED: t('blindDate.status.cancelled'),
              EXPIRED: t('blindDate.status.expired'),
            }[session.status] ?? session.status).toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={userRefreshing} onRefresh={handleManualRefresh} tintColor={bdColors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <SessionHero
          session={session}
          maxRounds={maxRounds}
          maxParticipants={maxParticipants}
          participantsCount={participants.length}
        />

        {/* Round progress */}
        <View style={styles.progressWrap}>
          <RoundProgressBar
            currentRound={currentRound}
            isFinalRound={isFinalRound && session.status === 'OPEN'}
            compact={participants.length > 4}
          />
        </View>

        {/* Reveal banner */}
        {session.status === 'REVEAL' && <RevealBanner session={session} />}

        {/* Creator decision panel (REVEAL) */}
        {session.status === 'REVEAL' && (
          <CreatorDecisionPanel
            session={session}
            onDecide={handleFinalDecision}
            deciding={deciding}
          />
        )}

        {/* Participant roster */}
        {session.status === 'OPEN' && (
          <ReviewRoster
            participants={rosterParticipants}
            selectable={!!openRound}
            isFinalRound={isFinalRound}
            pendingId={pendingSelectId}
            onSelect={handleSelect}
          />
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer actions — the bottom nav below already absorbs the safe-area
          inset, so the footer only needs a small visual gap. */}
      {sessionOpen && (
        <View style={[styles.footer, { backgroundColor: th.background, borderTopColor: th.border }]}>
          {openRound ? (
            <>
              {!isFinalRound && (
                <TouchableOpacity
                  style={[
                    styles.footerBtn,
                    { backgroundColor: bdColors.primary },
                    !canAdvanceRound && { opacity: 0.45 },
                  ]}
                  onPress={handleAdvanceToNextRound}
                  disabled={closeRound.isPending || !canAdvanceRound}
                  accessibilityRole="button"
                >
                  {closeRound.isPending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="arrow-forward" size={17} color="#FFF" />
                      <Text style={[styles.footerBtnText, { color: '#FFF' }]}>
                        {t('blindDate.manage.advanceToRound', { round: currentRound + 1 })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <Text style={[styles.footerHintSmall, { color: th.textSecondary }]}>
                {isFinalRound
                  ? t('blindDate.manage.hintFinalRound')
                  : canAdvanceRound
                    ? t('blindDate.manage.hintPickFinalist')
                    : t('blindDate.manage.hintNoAnswers')}
              </Text>
            </>
          ) : canStartNextRound ? (
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: bdColors.primary }]}
              onPress={() => setRoundPickerOpen(true)}
              accessibilityRole="button"
            >
              <Ionicons name="play" size={16} color="#FFF" />
              <Text style={[styles.footerBtnText, { color: '#FFF' }]}>
                {t('blindDate.manage.startRound', { round: nextRoundNumber })}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.footerHint, { color: th.textSecondary }]}>
              {t('blindDate.manage.hintNoOpenRound')}
            </Text>
          )}
          <TouchableOpacity
            onPress={handleCloseSession}
            disabled={closeSession.isPending}
            style={styles.dangerLink}
            accessibilityRole="button"
          >
            <Text style={[styles.dangerLinkText, { color: colors.danger }]}>
              {t('blindDate.manage.endBlindDate')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reveal-phase footer — lets the creator end the session while the
          finalist's decision is still pending. */}
      {!sessionOpen && revealPending && (
        <View style={[styles.footer, { backgroundColor: th.background, borderTopColor: th.border }]}>
          <TouchableOpacity
            onPress={handleCloseSession}
            disabled={closeSession.isPending}
            style={styles.dangerLink}
            accessibilityRole="button"
          >
            {closeSession.isPending ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <Text style={[styles.dangerLinkText, { color: colors.danger }]}>
                {t('blindDate.manage.endBlindDate')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Next-round question picker */}
      <Modal
        visible={roundPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRoundPickerOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setRoundPickerOpen(false)}
          />
          <View
            style={[styles.sheet, { backgroundColor: th.surface, paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: th.text }]}>
              {t('blindDate.manage.roundQuestionsTitle', { round: nextRoundNumber })}
            </Text>
            <Text style={[styles.sheetSub, { color: th.textSecondary }]}>
              {t('blindDate.manage.roundQuestionsSub')}
            </Text>
            <QuestionSetPicker
              enabled={roundPickerOpen}
              pickedQ={pickedQ}
              pickedC={pickedC}
              pickedCount={pickedCount}
              maxQuestions={maxRoundQuestions}
              onToggleQ={(id) =>
                setPickedQ((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onToggleC={(id) =>
                setPickedC((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              usedTexts={usedTexts}
              onManageQuestions={() => {
                setRoundPickerOpen(false);
                router.push('/(app)/blind-date-questions' as never);
              }}
            />
            <TouchableOpacity
              style={[
                styles.footerBtn,
                {
                  backgroundColor: bdColors.primary,
                  opacity:
                    pickedCount < 1 || (maxRoundQuestions != null && pickedCount > maxRoundQuestions)
                      ? 0.45
                      : 1,
                },
              ]}
              disabled={
                nextRound.isPending ||
                pickedCount < 1 ||
                (maxRoundQuestions != null && pickedCount > maxRoundQuestions)
              }
              onPress={handleStartRound}
              accessibilityRole="button"
            >
              {nextRound.isPending ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="play" size={16} color="#FFF" />
                  <Text style={[styles.footerBtnText, { color: '#FFF' }]}>
                    {pickedCount > 0
                      ? t('blindDate.manage.startRoundCount', { picked: pickedCount, max: maxRoundQuestions != null ? `/${maxRoundQuestions}` : '' })
                      : t('blindDate.manage.startRoundNoCount')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={() => setRoundPickerOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('blindDate.common.close')}
            >
              <Ionicons name="close" size={20} color={th.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Round-complete confetti — overlays the whole screen once */}


      {bottomNav}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800' },
  statusPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  statusPillText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 8, paddingTop: 14 },

  // Hero
  hero: { borderRadius: 20, padding: 18, marginHorizontal: 8, marginBottom: 14 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroKicker: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 3 },
  heroTitle: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
  finalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245,158,11,0.35)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  finalBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  heroStats: { flexDirection: 'row', marginTop: 14, gap: 10 },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 12,
    paddingVertical: 9,
  },
  heroStatValue: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  heroStatLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },

  // Progress
  progressWrap: { marginHorizontal: 8, marginBottom: 14 },

  // Reveal banner
  revealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  revealBannerTitle: { fontSize: 15, fontWeight: '800' },
  revealBannerSub: { fontSize: 13, marginTop: 1 },

  // Roster
  rosterHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginHorizontal: 8,
    marginBottom: 10,
  },
  rosterTitle: { fontSize: 17, fontWeight: '800' },
  rosterCount: { fontSize: 13, fontWeight: '700' },

  // Empty
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 8,
    padding: 26,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    paddingVertical: 13,
  },
  footerBtnText: { fontSize: 15.5, fontWeight: '800' },
  footerHint: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  footerHintSmall: { fontSize: 12.5, textAlign: 'center', marginTop: 8 },
  dangerLink: { alignItems: 'center', paddingVertical: 6 },
  dangerLinkText: { fontSize: 13.5, fontWeight: '700' },

  // Outcome card (MATCH / NO_MATCH / waiting)
  outcomeCard: {
    marginHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  outcomeTitle: { fontSize: 18, fontWeight: '800' },
  outcomeSub: { fontSize: 14, textAlign: 'center' },

  // Decision card
  decisionCard: {
    marginHorizontal: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  decisionTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  decisionSub: { fontSize: 14, textAlign: 'center' },
  decisionBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  decisionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 14,
    paddingVertical: 13,
  },
  decisionBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

  // Sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, maxHeight: '80%' },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(140,140,160,0.4)',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  sheetSub: { fontSize: 13.5, marginTop: 3, marginBottom: 4 },
  sheetClose: { position: 'absolute', top: 16, right: 16 },
});
