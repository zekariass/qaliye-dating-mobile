import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
  const openRound = session.rounds?.find((r) => r.status === 'OPEN') ?? null;
  const hasAnyRound = (session.rounds?.length ?? 0) > 0;
  const round = session.current_round_number;
  const isFinalRound = hasAnyRound && maxRounds != null && round >= maxRounds;

  return (
    <LinearGradient
      colors={bdGradients.hero as unknown as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroTopRow}>
        <View>
          <Text style={styles.heroKicker}>BLIND DATE</Text>
          <Text style={styles.heroTitle}>
            {!hasAnyRound
              ? 'Not started'
              : isFinalRound
                ? 'Final Round'
                : `Round ${round}`}
            {openRound ? ' is live' : hasAnyRound && session.status === 'OPEN' ? ' closed' : ''}
          </Text>
          <Text style={styles.heroSub}>
            {session.status === 'REVEAL'
              ? 'Awaiting final decisions'
              : session.status === 'OPEN'
                ? hasAnyRound
                  ? 'Review answers, select who advances'
                  : 'Pick questions to start Round 1'
                : `Session ${session.status.toLowerCase()}`}
          </Text>
        </View>
        {isFinalRound && session.status === 'OPEN' && (
          <View style={styles.finalBadge}>
            <Ionicons name="star" size={14} color="#FFF" />
            <Text style={styles.finalBadgeText}>Final</Text>
          </View>
        )}
      </View>

      <View style={styles.heroStats}>
        {[
          { icon: 'people' as const,      value: maxParticipants != null ? `${participantsCount}/${maxParticipants}` : `${participantsCount}`, label: 'joined' },
          { icon: 'albums-outline' as const, value: maxRounds != null ? `${round}/${maxRounds}` : `${round}`,                label: 'rounds' },
          { icon: 'time-outline' as const,   value: session.expires_at ? formatTimeLeft(session.expires_at) : 'No expiry', label: session.expires_at ? 'remaining' : 'closing' },
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
  const { colors: th } = useTheme();

  if (participants.length === 0) {
    return (
      <View style={[styles.emptyCard, { borderColor: th.border, backgroundColor: th.surface }]}>
        <Ionicons name="people-outline" size={36} color={bdColors.primary} />
        <Text style={[styles.emptyTitle, { color: th.text }]}>No participants yet</Text>
        <Text style={[styles.emptySub, { color: th.textSecondary }]}>
          Your Blind Date is live — participants appear here once they join and answer.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.rosterHead}>
        <Text style={[styles.rosterTitle, { color: th.text }]}>
          Who moves forward?
        </Text>
        <Text style={[styles.rosterCount, { color: th.textSecondary }]}>
          {participants.filter((p) => p.status === 'ACTIVE' || p.status === 'ADVANCED').length} active
          {(() => {
            const marked = participants.filter((p) => p.decision === 'ADVANCE').length;
            return marked > 0 ? `  ·  ${marked} selected` : '';
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
  const { colors: th } = useTheme();
  const fd = session.final_decision;
  const deadline = formatDecisionDeadline(fd?.decision_deadline_at);
  const decided = fd?.other_party_decided;

  return (
    <View style={[styles.revealBanner, { backgroundColor: `${bdColors.primary}12`, borderColor: `${bdColors.primary}40` }]}>
      <Ionicons name="eye" size={20} color={bdColors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.revealBannerTitle, { color: th.text }]}>Reveal stage</Text>
        <Text style={[styles.revealBannerSub, { color: th.textSecondary }]}>
          {deadline ?? 'Both sides are deciding…'}
          {decided ? ' · They have decided' : ''}
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
  const { colors: th } = useTheme();
  const fd = session.final_decision;
  if (!fd) return null;

  if (fd.outcome === 'MATCHED' || fd.outcome === 'ALREADY_MATCHED') {
    return (
      <View style={[styles.outcomeCard, { backgroundColor: `${colors.success}10`, borderColor: colors.success }]}>
        <Ionicons name="heart" size={24} color={colors.success} />
        <Text style={[styles.outcomeTitle, { color: colors.success }]}>It&rsquo;s a Match!</Text>
        <Text style={[styles.outcomeSub, { color: th.textSecondary }]}>
          {fd.outcome === 'MATCHED'
            ? "You're both interested — say hello."
            : "You're already connected."}
        </Text>
      </View>
    );
  }

  if (fd.outcome === 'NO_MATCH' || fd.outcome === 'EXPIRED') {
    return (
      <View style={[styles.outcomeCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        <Ionicons name="heart-dislike-outline" size={24} color={bdColors.slate} />
        <Text style={[styles.outcomeTitle, { color: th.text }]}>
          {fd.outcome === 'EXPIRED' ? 'Window expired' : 'No match this time'}
        </Text>
        <Text style={[styles.outcomeSub, { color: th.textSecondary }]}>
          {fd.outcome === 'EXPIRED'
            ? 'The decision window closed before both sides responded.'
            : 'The final reveal ended without a match.'}
        </Text>
      </View>
    );
  }

  if (fd.my_decision !== 'PENDING' && fd.my_decision != null) {
    return (
      <View style={[styles.outcomeCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }]}>
        <Ionicons name="hourglass-outline" size={22} color={colors.primary} />
        <Text style={[styles.outcomeTitle, { color: th.text }]}>Waiting for their decision</Text>
        <Text style={[styles.outcomeSub, { color: th.textSecondary }]}>
          You chose &ldquo;{fd.my_decision === 'INTERESTED' ? 'Interested' : 'Not Interested'}&rdquo;
          {fd.other_party_decided ? ' — they have decided' : ' — waiting for them'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.decisionCard, { backgroundColor: th.surface, borderColor: th.border }]}>
      <Text style={[styles.decisionTitle, { color: th.text }]}>Your final decision</Text>
      <Text style={[styles.decisionSub, { color: th.textSecondary }]}>
        Would you like to get to know this person?
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
              <Text style={styles.decisionBtnText}>I&rsquo;m Interested</Text>
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
          <Text style={[styles.decisionBtnText, { color: th.textSecondary }]}>Not for me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

export default function SessionManageScreen() {
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
        onError: (e) => themedError('Selection failed', friendlyError(e)),
        onSuccess: () => {
          if (decision === 'SELECT_FINALIST') {
            themedSuccess('Finalist chosen', 'The session moved to the reveal stage.');
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
        title: 'Pass on this participant?',
        message: 'They will be removed from this Blind Date and notified. This cannot be undone.',
        icon: 'person-remove-outline',
        iconColor: colors.danger,
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pass', style: 'destructive', onPress: () => doSelect(p, decision) },
        ],
      });
      return;
    }
    themedAlert({
      title: 'Select as finalist?',
      message:
        'This ends the selection stage — the session moves to reveal and everyone else is eliminated.',
      icon: 'star',
      iconColor: bdColors.gold,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select Finalist', onPress: () => doSelect(p, decision) },
      ],
    });
  };

  const handleAdvanceToNextRound = () => {
    const selectedCount = participants.filter((p) => p.decision === 'ADVANCE').length;
    themedAlert({
      title: `Start Round ${currentRound + 1}?`,
      message:
        selectedCount === 0
          ? 'You haven\'t selected anyone — every participant will be eliminated.'
          : `Your ${selectedCount} selected participant${selectedCount === 1 ? '' : 's'} move${selectedCount === 1 ? 's' : ''} on — everyone else is eliminated. Pick the next round's questions right after.`,
      icon: 'arrow-forward-circle-outline',
      iconColor: bdColors.primary,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () =>
            closeRound.mutate(undefined, {
              onSuccess: () => setRoundPickerOpen(true),
              onError: (e) => themedError('Could not close round', friendlyError(e)),
            }),
        },
      ],
    });
  };

  const handleCloseSession = () =>
    themedAlert({
      title: 'End this Blind Date?',
      message:
        'The session closes permanently. Open rounds end and remaining participants are eliminated. No refunds are issued.',
      icon: 'power',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Blind Date',
          style: 'destructive',
          onPress: () =>
            closeSession.mutate(undefined, {
              onSuccess: () => {
                themedSuccess('Blind Date closed');
                router.back();
              },
              onError: (e) => themedError('Could not close', friendlyError(e)),
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
          themedSuccess('Next round started', 'Advanced participants get the new questions.');
        },
        onError: (e) => themedError('Could not start round', friendlyError(e, maxRoundQuestions)),
      },
    );

  const handleFinalDecision = (decision: 'INTERESTED' | 'NOT_INTERESTED') => {
    if (!sessionId || deciding) return;
    setDeciding(true);
    submitFinalDecision(sessionId, decision)
      .then(() => refetch())
      .catch((e: unknown) => themedError('Could not submit', friendlyError(e)))
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
      onProfile={() => router.push('/(app)/(tabs)/profile' as never)}
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
          <Text style={[styles.emptyTitle, { color: th.text, marginTop: 12 }]}>Couldn&rsquo;t load the session</Text>
          <TouchableOpacity onPress={refetch} accessibilityRole="button">
            <Text style={{ color: bdColors.primary, fontWeight: '700', marginTop: 8 }}>Retry</Text>
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
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>Manage Blind Date</Text>
        <View style={[styles.statusPill, { backgroundColor: `${bdColors.primary}1F` }]}>
          <Text style={[styles.statusPillText, { color: bdColors.primary }]}>
            {{
              OPEN: 'LIVE',
              REVEAL: 'REVEAL',
              COMPLETED: 'ENDED',
              CLOSED: 'CLOSED',
              CANCELLED: 'CLOSED',
              EXPIRED: 'EXPIRED',
            }[session.status] ?? session.status}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={bdColors.primary} />
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
            participants={participants}
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
                    !anyCurrentRoundAnswers && { opacity: 0.45 },
                  ]}
                  onPress={handleAdvanceToNextRound}
                  disabled={closeRound.isPending || !anyCurrentRoundAnswers}
                  accessibilityRole="button"
                >
                  {closeRound.isPending ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="arrow-forward" size={17} color="#FFF" />
                      <Text style={[styles.footerBtnText, { color: '#FFF' }]}>
                        Advance selected to Round {currentRound + 1}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <Text style={[styles.footerHintSmall, { color: th.textSecondary }]}>
                {isFinalRound
                  ? 'Final round — tap Finalist on a card to start the reveal.'
                  : anyCurrentRoundAnswers
                    ? 'Found the one already? Tap Finalist on their card — it ends the rounds and starts the reveal.'
                    : 'No answers this round yet — you can still pick a finalist from earlier-round answers.'}
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
                Start Round {nextRoundNumber}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.footerHint, { color: th.textSecondary }]}>
              No open round — pick your finalist’s card above, or end this Blind Date.
            </Text>
          )}
          <TouchableOpacity
            onPress={handleCloseSession}
            disabled={closeSession.isPending}
            style={styles.dangerLink}
            accessibilityRole="button"
          >
            <Text style={[styles.dangerLinkText, { color: colors.danger }]}>
              End this Blind Date
            </Text>
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
              Round {nextRoundNumber} questions
            </Text>
            <Text style={[styles.sheetSub, { color: th.textSecondary }]}>
              Questions already asked in earlier rounds can&rsquo;t be reused.
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
                    Start round{pickedCount > 0 ? ` (${pickedCount}${maxRoundQuestions != null ? `/${maxRoundQuestions}` : ''})` : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={() => setRoundPickerOpen(false)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
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
