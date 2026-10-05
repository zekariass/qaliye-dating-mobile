import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlindDateBottomNav from '@/components/blind-date/BlindDateBottomNav';
import { FlowBackdrop } from '@/components/blind-date/FlowBackdrop';
import { bdColors, bdGradients } from '@/constants/blindDateTheme';
import { useSessionResults } from '@/hooks/blindDate/useSessionResults';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type {
    BlindDateFinalOutcome,
    BlindDateSessionWinnerDto,
    BlindDateWinnerRoundDto
} from '@/types/blindDate';
import { formatDate, formatDateRange } from '@/utils/blindDateFormat';
import {
    RELATIONSHIP_API_TO_LABEL,
    RELIGION_API_TO_LABEL,
} from '@/utils/profileMappers';
import { translateProfileOption } from '@/utils/profileOptions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(v: string) {
  return v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Header status-pill tone — mirrors the color language used on the My
 *  Blind Dates cards so the same status always reads the same color. */
function statusPillTone(
  status: string | undefined,
  outcome: BlindDateFinalOutcome | null,
): { fg: string; bg: string } {
  if (outcome === 'MATCHED' || outcome === 'ALREADY_MATCHED') {
    return { fg: '#D92C85', bg: 'rgba(255,79,163,0.15)' };
  }
  switch (status) {
    case 'OPEN':
      return { fg: '#16A34A', bg: 'rgba(34,197,94,0.14)' };
    case 'REVEAL':
      return { fg: '#B45309', bg: 'rgba(245,158,11,0.16)' };
    case 'CANCELLED':
      return { fg: '#DC2626', bg: 'rgba(239,68,68,0.13)' };
    case 'EXPIRED':
      return { fg: '#B45309', bg: 'rgba(245,158,11,0.15)' };
    default:
      // COMPLETED without a match, or CLOSED.
      return { fg: '#6B7280', bg: 'rgba(107,114,128,0.15)' };
  }
}

/** Copy for the "no finalist" card — tailored per terminal status so a
 *  cancelled session doesn't read the same as an expired or closed one. */
function noFinalistCopy(status: string | undefined): string {
  switch (status) {
    case 'CANCELLED':
      return i18n.t('blindDate.results.noFinalist.cancelled');
    case 'CLOSED':
      return i18n.t('blindDate.results.noFinalist.closed');
    case 'EXPIRED':
      return i18n.t('blindDate.results.noFinalist.expired');
    default:
      return i18n.t('blindDate.results.noFinalist.ended');
  }
}

function outcomeMeta(outcome: BlindDateFinalOutcome | null | undefined, status: string | undefined): {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  matched: boolean;
} {
  switch (outcome) {
    case 'MATCHED':
      return {
        icon: 'heart',
        title: i18n.t('blindDate.results.outcome.matched.title'),
        sub: i18n.t('blindDate.results.outcome.matched.sub'),
        matched: true,
      };
    case 'ALREADY_MATCHED':
      return {
        icon: 'heart',
        title: i18n.t('blindDate.results.outcome.alreadyMatched.title'),
        sub: i18n.t('blindDate.results.outcome.alreadyMatched.sub'),
        matched: true,
      };
    case 'NO_MATCH':
      return {
        icon: 'heart-dislike-outline',
        title: i18n.t('blindDate.results.outcome.noMatch.title'),
        sub: i18n.t('blindDate.results.outcome.noMatch.sub'),
        matched: false,
      };
    case 'EXPIRED':
      return {
        icon: 'time-outline',
        title: i18n.t('blindDate.results.outcome.expired.title'),
        sub: i18n.t('blindDate.results.outcome.expired.sub'),
        matched: false,
      };
    default:
      // No final outcome — the session ended before a finalist was ever
      // chosen. Give each terminal status its own, accurate copy instead of
      // a single generic "ended" message.
      switch (status) {
        case 'REVEAL':
          return {
            icon: 'hourglass-outline',
            title: i18n.t('blindDate.results.outcome.awaiting.title'),
            sub: i18n.t('blindDate.results.outcome.awaiting.sub'),
            matched: false,
          };
        case 'CLOSED':
          return {
            icon: 'power-outline',
            title: i18n.t('blindDate.results.outcome.closed.title'),
            sub: i18n.t('blindDate.results.outcome.closed.sub'),
            matched: false,
          };
        case 'CANCELLED':
          return {
            icon: 'close-circle-outline',
            title: i18n.t('blindDate.results.outcome.cancelled.title'),
            sub: i18n.t('blindDate.results.outcome.cancelled.sub'),
            matched: false,
          };
        case 'EXPIRED':
          return {
            icon: 'time-outline',
            title: i18n.t('blindDate.results.outcome.expiredSession.title'),
            sub: i18n.t('blindDate.results.outcome.expiredSession.sub'),
            matched: false,
          };
        case 'OPEN':
          return {
            icon: 'flash-outline',
            title: i18n.t('blindDate.results.outcome.inProgress.title'),
            sub: i18n.t('blindDate.results.outcome.inProgress.sub'),
            matched: false,
          };
        default:
          return {
            icon: 'flag-outline',
            title: i18n.t('blindDate.results.outcome.ended.title'),
            sub: i18n.t('blindDate.results.outcome.ended.sub'),
            matched: false,
          };
      }
  }
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

/** Outcome hero — match gradient on a match, neutral card otherwise. */
function OutcomeHero({
  outcome,
  status,
  winnerName,
}: {
  outcome: BlindDateFinalOutcome | null | undefined;
  status: string | undefined;
  winnerName: string | null;
}) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const meta = outcomeMeta(outcome, status);
  const sub = winnerName && meta.matched ? `${meta.sub} ${t('blindDate.results.itsName', { name: winnerName })}` : meta.sub;

  if (!meta.matched) {
    return (
      <View style={[styles.outcomeCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        <View style={[styles.outcomeIconCircle, { backgroundColor: `${bdColors.slate}1F` }]}>
          <Ionicons name={meta.icon} size={26} color={bdColors.slate} />
        </View>
        <Text style={[styles.outcomeCardTitle, { color: th.text }]}>{meta.title}</Text>
        <Text style={[styles.outcomeCardSub, { color: th.textSecondary }]}>{sub}</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={bdGradients.match as unknown as [string, string, string]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.heroIconCircle}>
        <Ionicons name={meta.icon} size={30} color="#FFF" />
      </View>
      <Text style={styles.heroTitle}>{meta.title}</Text>
      <Text style={styles.heroSub}>{sub}</Text>
    </LinearGradient>
  );
}

/** Small stat chip — participants / rounds / date. */
function StatChip({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const { colors: th } = useTheme();
  return (
    <View style={[styles.statChip, { backgroundColor: th.surface, borderColor: th.border }]}>
      <Ionicons name={icon} size={14} color={bdColors.primary} />
      <Text style={[styles.statValue, { color: th.text }, value.length > 14 && { fontSize: 12 }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: th.textSecondary }]}>{label}</Text>
    </View>
  );
}

/** Profile chip pill. */
function InfoChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <View style={[styles.infoChip, { backgroundColor: isDark ? '#2E1F50' : '#EFE7FF' }]}>
      <Ionicons name={icon} size={11} color={bdColors.primary} />
      <Text style={[styles.infoChipText, { color: th.text }]}>{label}</Text>
    </View>
  );
}

/** Winner card — revealed finalist identity. */
function WinnerCard({ winner, onPress }: { winner: BlindDateSessionWinnerDto; onPress?: () => void }) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const profile = winner.profile;
  const photo = profile?.primary_photo?.signed_url;
  const name = profile?.display_name ?? t('blindDate.results.yourWinner');
  const location = [profile?.city, profile?.country].filter(Boolean).join(', ');

  const inner = (
    <>
      <View style={styles.winnerPhotoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={bdGradients.hero as unknown as [string, string, string]}
            style={StyleSheet.absoluteFill}
          >
            <Ionicons name="person" size={44} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        )}
        <View style={styles.winnerCrown}>
          <Ionicons name="star" size={11} color="#FFF" />
        </View>
      </View>

      <View style={styles.winnerBody}>
        <View style={styles.winnerNameRow}>
          <Text style={[styles.winnerName, { color: th.text }]} numberOfLines={1}>
            {name}
            {profile?.age != null ? `, ${profile.age}` : ''}
          </Text>
          <View style={[styles.winnerPill, { backgroundColor: `${bdColors.gold}22`, borderColor: `${bdColors.gold}66` }]}>
            <Ionicons name="trophy" size={10} color={bdColors.gold} />
            <Text style={[styles.winnerPillText, { color: '#B45309' }]}>{t('blindDate.results.winnerPill')}</Text>
          </View>
        </View>
        {location ? (
          <Text style={[styles.winnerMeta, { color: th.textSecondary }]}>{location}</Text>
        ) : null}

        {(profile?.relationship_intention || profile?.religion || profile?.gender) && (
          <View style={styles.chipRow}>
            {profile.relationship_intention && (
              <InfoChip
                icon="heart-outline"
                label={translateProfileOption(
                  RELATIONSHIP_API_TO_LABEL[profile.relationship_intention] ??
                    toTitleCase(profile.relationship_intention),
                  t,
                )}
              />
            )}
            {profile.religion && (
              <InfoChip
                icon="flower-outline"
                label={translateProfileOption(RELIGION_API_TO_LABEL[profile.religion] ?? toTitleCase(profile.religion), t)}
              />
            )}
            {profile.gender && <InfoChip icon="person-outline" label={translateProfileOption(toTitleCase(profile.gender), t)} />}
          </View>
        )}
      </View>

      {onPress && (
        <Ionicons name="chevron-forward" size={18} color={th.textSecondary} style={{ marginRight: 14 }} />
      )}
    </>
  );

  return (
    <TouchableOpacity
      style={[styles.winnerCard, { backgroundColor: th.surface, borderColor: `${bdColors.gold}55` }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.85 : 1}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {inner}
    </TouchableOpacity>
  );
}

/** One round's Q&A list for the winner. */
function WinnerRoundSection({ round }: { round: BlindDateWinnerRoundDto }) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const answered = round.answers.filter((a) => a.submitted_at != null);

  return (
    <View style={[styles.roundCard, { backgroundColor: th.surface, borderColor: th.border }]}>
      <View style={styles.roundHead}>
        <LinearGradient
          colors={bdGradients.hero as unknown as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.roundBadge}
        >
          <Ionicons name="albums-outline" size={12} color="#FFF" />
          <Text style={styles.roundBadgeText}>{t('blindDate.results.roundBadge', { round: round.round_number })}</Text>
        </LinearGradient>
        <Text style={[styles.roundCount, { color: th.textSecondary }]}>
          {t('blindDate.results.answeredCount', { answered: answered.length, total: round.answers.length })}
        </Text>
      </View>

      {round.answers.length === 0 ? (
        <Text style={[styles.answerEmpty, { color: th.textSecondary }]}>
          {t('blindDate.results.noAnswersInRound')}
        </Text>
      ) : (
        round.answers.map((a, i) => (
          <View key={a.session_question_id ?? i} style={styles.answerRow}>
            <View style={styles.answerQRow}>
              <LinearGradient
                colors={bdGradients.hero as unknown as [string, string, string]}
                style={styles.answerQBadge}
              >
                <Text style={styles.answerQBadgeText}>Q{i + 1}</Text>
              </LinearGradient>
              <Text style={[styles.answerQ, { color: th.text }]}>{a.question}</Text>
            </View>
            <View
              style={[
                styles.answerBubble,
                { backgroundColor: isDark ? 'rgba(138,44,255,0.14)' : `${bdColors.primary}0D` },
              ]}
            >
              <Text
                style={[
                  styles.answerA,
                  { color: a.submitted_at ? th.text : th.textSecondary },
                  !a.submitted_at && styles.answerPending,
                ]}
              >
                {a.submitted_at ? a.answer : t('blindDate.results.notAnswered')}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

export default function SessionResultsScreen() {
  const { t } = useTranslation();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const { session, results, isCreator, isLoading, isError, resultsFailed, refetch, refetchResults, isRefetching } =
    useSessionResults(sessionId ?? null);

  // Creator-only screen — participants land on the participant flow instead.
  useEffect(() => {
    if (isCreator === false && sessionId) {
      router.replace({
        pathname: '/(app)/blind-date-participant' as never,
        params: { sessionId },
      });
    }
  }, [isCreator, sessionId, router]);

  const outcome: BlindDateFinalOutcome | null =
    results?.outcome ?? session?.final_decision?.outcome ?? null;
  const matchId = results?.match_id ?? session?.final_decision?.match_id ?? null;
  const winner = results?.winner ?? null;
  const winnerName = winner?.profile?.display_name ?? null;

  const statusLabel = session
    ? (({
        OPEN: t('blindDate.status.live'),
        REVEAL: t('blindDate.status.reveal'),
        COMPLETED: t('blindDate.status.ended'),
        CLOSED: t('blindDate.status.closed'),
        CANCELLED: t('blindDate.status.cancelled'),
        EXPIRED: t('blindDate.status.expired'),
      } as Record<string, string>)[session.status] ?? session.status).toUpperCase()
    : '';
  const pillTone = statusPillTone(session?.status, outcome);

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
          <Text style={[styles.emptyTitle, { color: th.text, marginTop: 12 }]}>
            {t('blindDate.results.loadError')}
          </Text>
          <TouchableOpacity onPress={refetch} accessibilityRole="button">
            <Text style={{ color: bdColors.primary, fontWeight: '700', marginTop: 8 }}>{t('blindDate.common.retry')}</Text>
          </TouchableOpacity>
        </View>
        {bottomNav}
      </View>
    );
  }

  const roundCount = results?.round_count ?? session.rounds?.length ?? 0;
  const participantCount = results?.participant_count ?? session.participant_count ?? 0;
  // The session payload has no ended_at — the last round's completion is the
  // real end of the game (reveal + decisions follow), with revealed_at as a
  // fallback for sessions whose round rows lack completed_at.
  const endedAt =
    (session.rounds ?? []).reduce<string | null>(
      (latest, r) =>
        r.completed_at != null && (latest == null || r.completed_at > latest)
          ? r.completed_at
          : latest,
      null,
    ) ?? session.final_decision?.revealed_at ?? null;
  const dateIsRange =
    endedAt != null && formatDate(endedAt) !== formatDate(session.created_at);
  const dateLabel = formatDateRange(session.created_at, endedAt);

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
        <Text style={[styles.headerTitle, { color: th.text }]}>
          {session.status === 'COMPLETED' ? t('blindDate.results.titleResults') : t('blindDate.results.title')}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: pillTone.bg }]}>
          <Text style={[styles.statusPillText, { color: pillTone.fg }]}>{statusLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={bdColors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Outcome */}
        <OutcomeHero outcome={outcome} status={session.status} winnerName={winnerName} />

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatChip icon="people" value={`${participantCount}`} label={t('blindDate.manage.statJoined')} />
          <StatChip icon="albums-outline" value={`${roundCount}`} label={roundCount === 1 ? t('blindDate.results.statRound') : t('blindDate.manage.statRounds')} />
          {dateLabel && (
            <StatChip
              icon="calendar-outline"
              value={dateLabel}
              label={t(dateIsRange ? 'blindDate.results.statDates' : 'blindDate.results.statStarted')}
            />
          )}
        </View>

        {/* Winner — only headed "The winner" when there's actually one to
            show (or a load failure to retry); a plain "no finalist" card
            speaks for itself otherwise. */}
        {(winner || resultsFailed) && (
          <Text style={[styles.sectionTitle, { color: th.text }]}>{t('blindDate.results.theWinner')}</Text>
        )}
        {resultsFailed ? (
          <View style={[styles.emptyCard, { borderColor: th.border, backgroundColor: th.surface }]}>
            <Ionicons name="cloud-offline-outline" size={30} color={bdColors.primary} />
            <Text style={[styles.emptySub, { color: th.textSecondary }]}>
              {t('blindDate.results.winnerUnavailable')}
            </Text>
            <TouchableOpacity onPress={refetchResults} accessibilityRole="button">
              <Text style={{ color: bdColors.primary, fontWeight: '700' }}>{t('blindDate.common.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : winner ? (
          <WinnerCard
            winner={winner}
            onPress={
              winner.user_id
                ? () =>
                    router.push({
                      pathname: '/(app)/user-profile' as never,
                      params: {
                        userId: winner.user_id,
                        ...(matchId ? { matchId } : {}),
                      },
                    })
                : undefined
            }
          />
        ) : (
          <View style={[styles.emptyCard, { borderColor: th.border, backgroundColor: th.surface }]}>
            <Ionicons name="star-outline" size={30} color={bdColors.gold} />
            <Text style={[styles.emptyTitle, { color: th.text }]}>{t('blindDate.results.noFinalistTitle')}</Text>
            <Text style={[styles.emptySub, { color: th.textSecondary }]}>
              {noFinalistCopy(session.status)}
            </Text>
          </View>
        )}

        {/* Winning answers */}
        {winner && (winner.rounds?.length ?? 0) > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: th.text }]}>
              {winnerName ? t('blindDate.results.winnerAnswers', { name: winnerName }) : t('blindDate.results.winningAnswers')}
            </Text>
            {winner.rounds.map((r) => (
              <WinnerRoundSection key={r.round_id} round={r} />
            ))}
          </>
        )}
        {winner && (winner.rounds?.length ?? 0) === 0 && !resultsFailed && (
          <View style={[styles.emptyCard, { borderColor: th.border, backgroundColor: th.surface }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={bdColors.primary} />
            <Text style={[styles.emptySub, { color: th.textSecondary }]}>
              {t('blindDate.results.winnerNoAnswers')}
            </Text>
          </View>
        )}

        {/* Match CTA */}
        {matchId && (
          <TouchableOpacity
            style={[styles.chatBtn, { backgroundColor: bdColors.primary }]}
            onPress={() =>
              router.push({ pathname: '/(app)/chat' as never, params: { matchId, matchSource: 'BLIND_DATE' } })
            }
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
            <Text style={styles.chatBtnText}>{t('blindDate.results.openChat')}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

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
  content: { padding: 8, paddingTop: 14 },

  // Match hero
  hero: {
    borderRadius: 20,
    padding: 22,
    marginHorizontal: 8,
    marginBottom: 14,
    alignItems: 'center',
    gap: 8,
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Non-match outcome card
  outcomeCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 8,
    marginBottom: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  outcomeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeCardTitle: { fontSize: 19, fontWeight: '800' },
  outcomeCardSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 8, marginBottom: 18 },
  statChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 9,
  },
  statValue: { fontSize: 14.5, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600' },

  // Sections
  sectionTitle: { fontSize: 17, fontWeight: '800', marginHorizontal: 8, marginBottom: 10 },

  // Winner card
  winnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    marginHorizontal: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  winnerPhotoWrap: { width: 92, height: 92, margin: 12, borderRadius: 16, overflow: 'hidden' },
  winnerCrown: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: bdColors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  winnerBody: { flex: 1, paddingVertical: 12, paddingRight: 8 },
  winnerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  winnerName: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  winnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  winnerPillText: { fontSize: 10.5, fontWeight: '800' },
  winnerMeta: { fontSize: 13, marginTop: 3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoChipText: { fontSize: 11.5, fontWeight: '700' },

  // Rounds / answers
  roundCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 8,
    marginBottom: 12,
    padding: 14,
    gap: 14,
  },
  roundHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  roundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  roundBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  roundCount: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  answerEmpty: { fontSize: 13.5, fontStyle: 'italic', textAlign: 'center' },
  answerRow: { gap: 7 },
  answerQRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  answerQBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 1 },
  answerQBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  answerQ: { flex: 1, fontSize: 14.5, fontWeight: '700', lineHeight: 20 },
  answerBubble: {
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 4,
  },
  answerA: { fontSize: 15, lineHeight: 21 },
  answerPending: { fontStyle: 'italic' },

  // Empty / error cards
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 8,
    marginBottom: 14,
    padding: 22,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Chat CTA
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 8,
    marginTop: 6,
  },
  chatBtnText: { color: '#FFF', fontSize: 15.5, fontWeight: '800' },
});
