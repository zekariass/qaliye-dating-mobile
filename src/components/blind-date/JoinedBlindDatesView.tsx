import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurredPortraitFallback } from '@/components/blind-date/SessionSwipeCard';
import { colors } from '@/constants/theme';
import { isParticipantAnswersLocked } from '@/hooks/blindDate/useParticipantFlow';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type {
    BlindDateParticipationDto,
    BlindDateSessionSummaryDto,
} from '@/types/blindDate';
import { formatDate, formatDecisionDeadline, formatTimeLeft } from '@/utils/blindDateFormat';
import { RELATIONSHIP_API_TO_LABEL, RELIGION_API_TO_LABEL } from '@/utils/profileMappers';
import { translateProfileOption } from '@/utils/profileOptions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}



function isSessionEnded(session: BlindDateSessionSummaryDto | null | undefined): boolean {
  const s = session?.status;
  return s === 'CLOSED' || s === 'EXPIRED' || s === 'CANCELLED' || s === 'COMPLETED';
}

/** hex color + alpha suffix, e.g. withAlpha('#22C55E', 0.12) */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

// ─── Card state derivation ────────────────────────────────────────────────────
// Participant status and session status are distinct concepts (spec §25) —
// the badge/heading/CTA derive from the participant state first, falling back
// to the session lifecycle for ended/reveal states.

type CardState = {
  badge: string;
  badgeColor: string;
  badgeIcon: keyof typeof Ionicons.glyphMap;
  heading: string;
  subtext: string;
  cta: string;
  primaryCta: boolean;
  /** Show the current-round pill (hidden on ended cards). */
  showRound: boolean;
  /** Quieter styling for ended participations. */
  ended: boolean;
  /** Ordering rank for the "Active first" sort. */
  rank: number;
};

const GREEN = '#22C55E';
const BLUE = '#3B82F6';
const GREY = '#8A93A6';
const PINK = '#FF4FA3';
const RED = '#EF4444';

/** Two-tone CTA gradient matched to the card's status color, so the whole
 *  card — border, badge, and primary action — tells one consistent story. */
const CTA_GRADIENTS: Record<string, readonly [string, string]> = {
  [GREEN]: ['#16A34A', '#22C55E'],
  [BLUE]: ['#2563EB', '#3B82F6'],
  [PINK]: ['#D92C85', '#FF4FA3'],
  [RED]: ['#DC2626', '#EF4444'],
};
function ctaGradientFor(badgeColor: string): readonly [string, string] {
  return CTA_GRADIENTS[badgeColor] ?? ['#6D35FF', '#A53FFF'];
}

function deriveCardState(item: BlindDateParticipationDto): CardState {
  const session = item.session;
  const fd = session?.final_decision ?? null;

  switch (item.status) {
    case 'ELIMINATED':
      return {
        badge: i18n.t('blindDate.joined.badgeNotSelected'),
        badgeColor: RED,
        badgeIcon: 'close-circle-outline',
        heading: i18n.t('blindDate.joined.notAdvancedHeading'),
        subtext: '',
        cta: i18n.t('blindDate.joined.viewDetails'),
        primaryCta: false,
        showRound: false,
        ended: true,
        rank: 4,
      };
    case 'WITHDRAWN':
      return {
        badge: i18n.t('blindDate.joined.badgeWithdrawn'),
        badgeColor: GREY,
        badgeIcon: 'exit-outline',
        heading: i18n.t('blindDate.joined.withdrawnHeading'),
        subtext: '',
        cta: i18n.t('blindDate.joined.viewDetails'),
        primaryCta: false,
        showRound: false,
        ended: true,
        rank: 4,
      };
    default:
      break;
  }

  // Reveal / final-decision states (FINALIST, REVEALED, or session REVEAL).
  const inReveal =
    item.status === 'FINALIST' || item.status === 'REVEALED' || session?.status === 'REVEAL';
  if (inReveal) {
    if (fd?.outcome === 'MATCHED' || fd?.outcome === 'ALREADY_MATCHED') {
      return {
        badge: i18n.t('blindDate.joined.badgeMatched'),
        badgeColor: PINK,
        badgeIcon: 'heart',
        heading: i18n.t('blindDate.joined.matchedHeading'),
        subtext:
          fd.outcome === 'MATCHED' ? i18n.t('blindDate.joined.matchedSayHello') : i18n.t('blindDate.joined.matchedContinue'),
        cta: i18n.t('blindDate.joined.viewMatch'),
        primaryCta: true,
        showRound: false,
        ended: false,
        rank: 1,
      };
    }
    if (fd?.outcome === 'NO_MATCH' || fd?.outcome === 'EXPIRED') {
      return {
        badge: fd.outcome === 'EXPIRED' ? i18n.t('blindDate.joined.badgeExpired') : i18n.t('blindDate.joined.badgeNoMatch'),
        badgeColor: GREY,
        badgeIcon: fd.outcome === 'EXPIRED' ? 'time-outline' : 'heart-dislike-outline',
        heading: i18n.t('blindDate.joined.noMatchHeading'),
        subtext: fd.outcome === 'EXPIRED' ? i18n.t('blindDate.joined.windowClosed') : '',
        cta: i18n.t('blindDate.joined.viewDetails'),
        primaryCta: false,
        showRound: false,
        ended: true,
        rank: 4,
      };
    }
    if (fd && (fd.my_decision === 'PENDING' || fd.my_decision == null)) {
      return {
        badge: i18n.t('blindDate.joined.badgeRevealed'),
        badgeColor: PINK,
        badgeIcon: 'eye',
        heading: i18n.t('blindDate.joined.timeToMeetHeading'),
        subtext:
          formatDecisionDeadline(fd.decision_deadline_at) ?? i18n.t('blindDate.joined.decideIfInterested'),
        cta: i18n.t('blindDate.joined.revealBlindDate'),
        primaryCta: true,
        showRound: true,
        ended: false,
        rank: 1,
      };
    }
    if (fd) {
      // Caller already decided; outcome not resolved yet.
      return {
        badge: i18n.t('blindDate.joined.badgeAwaiting'),
        badgeColor: BLUE,
        badgeIcon: 'hourglass-outline',
        heading: i18n.t('blindDate.joined.waitingDecisionHeading'),
        subtext: fd.other_party_decided ? i18n.t('blindDate.joined.resultFinalizing') : i18n.t('blindDate.joined.decisionIsIn'),
        cta: i18n.t('blindDate.joined.viewDetails'),
        primaryCta: false,
        showRound: true,
        ended: false,
        rank: 2,
      };
    }
    if (item.status === 'FINALIST') {
      return {
        badge: i18n.t('blindDate.joined.badgeFinalist'),
        badgeColor: PINK,
        badgeIcon: 'star',
        heading: i18n.t('blindDate.joined.selectedHeading'),
        subtext: '',
        cta: i18n.t('blindDate.common.continue'),
        primaryCta: true,
        showRound: true,
        ended: false,
        rank: 1,
      };
    }
    return {
      badge: i18n.t('blindDate.joined.badgeRevealed'),
      badgeColor: PINK,
      badgeIcon: 'eye',
      heading: i18n.t('blindDate.joined.timeToMeetHeading'),
      subtext: '',
      cta: i18n.t('blindDate.joined.revealBlindDate'),
      primaryCta: true,
      showRound: true,
      ended: false,
      rank: 1,
    };
  }

  if (isSessionEnded(session)) {
    return {
      badge: i18n.t('blindDate.joined.badgeCompleted'),
      badgeColor: GREY,
      badgeIcon: 'flag-outline',
      heading: i18n.t('blindDate.joined.completedHeading'),
      subtext: '',
      cta: i18n.t('blindDate.joined.viewDetails'),
      primaryCta: false,
      showRound: false,
      ended: true,
      rank: 4,
    };
  }

  // ACTIVE / ADVANCED in a still-running session. pending_question_count is
  // only populated for the caller's current open round — 0 either means all
  // answered (host is reviewing) or the round closed and the next one hasn't
  // started yet.
  const pending = item.pending_question_count;

  if (item.status === 'ADVANCED' && pending === 0) {
    return {
      badge: i18n.t('blindDate.joined.badgeAdvanced'),
      badgeColor: GREEN,
      badgeIcon: 'trending-up',
      heading: i18n.t('blindDate.joined.advancedHeading'),
      subtext: i18n.t('blindDate.joined.advancedSubtext'),
      cta: i18n.t('blindDate.joined.viewDetails'),
      primaryCta: false,
      showRound: true,
      ended: false,
      rank: 1,
    };
  }

  // A participant the host already decided on still reads ACTIVE with pending
  // questions — but their answers are locked, so "your turn" would invite a
  // submit that 409s. Show the same waiting state as a submitted round.
  const decidedByHost = item.status === 'ACTIVE' && isParticipantAnswersLocked(item.participant_id);

  if (item.answers_submitted === true || pending === 0 || decidedByHost) {
    return {
      badge: i18n.t('blindDate.joined.badgeAwaiting'),
      badgeColor: BLUE,
      badgeIcon: 'hourglass-outline',
      heading: i18n.t('blindDate.joined.waitingHostHeading'),
      subtext: i18n.t('blindDate.joined.waitingHostSubtext'),
      cta: i18n.t('blindDate.joined.viewDetails'),
      primaryCta: false,
      showRound: true,
      ended: false,
      rank: 2,
    };
  }

  return {
    badge: i18n.t('blindDate.joined.badgeActive'),
    badgeColor: GREEN,
    badgeIcon: 'create-outline',
    heading: i18n.t('blindDate.joined.yourTurnHeading'),
    subtext:
      pending != null && pending > 0
        ? i18n.t('blindDate.joined.questionsToAnswer', { count: pending })
        : '',
    cta: i18n.t('blindDate.joined.answerQuestions'),
    primaryCta: true,
    showRound: true,
    ended: false,
    rank: 0,
  };
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

type JoinedSort = 'active' | 'recent' | 'closing' | 'updated';

const SORT_OPTIONS: { key: JoinedSort; labelKey: string }[] = [
  { key: 'active', labelKey: 'blindDate.joined.sort.active' },
  { key: 'recent', labelKey: 'blindDate.joined.sort.recent' },
  { key: 'closing', labelKey: 'blindDate.joined.sort.closing' },
  { key: 'updated', labelKey: 'blindDate.joined.sort.updated' },
];

function latestActivity(item: BlindDateParticipationDto): number {
  const stamps = [item.joined_at, item.advanced_at, item.finalist_at, item.eliminated_at];
  let max = 0;
  for (const s of stamps) {
    const t = s ? new Date(s).getTime() : 0;
    if (t > max) max = t;
  }
  return max;
}

function expiryTime(item: BlindDateParticipationDto): number {
  const t = item.session?.expires_at ? new Date(item.session.expires_at).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function sortParticipations(
  items: BlindDateParticipationDto[],
  sort: JoinedSort,
  stateOf: (i: BlindDateParticipationDto) => CardState,
): BlindDateParticipationDto[] {
  const copy = [...items];
  switch (sort) {
    case 'recent':
      copy.sort(
        (a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime(),
      );
      break;
    case 'closing':
      copy.sort((a, b) => {
        const ea = stateOf(a).ended;
        const eb = stateOf(b).ended;
        if (ea !== eb) return ea ? 1 : -1;
        return expiryTime(a) - expiryTime(b);
      });
      break;
    case 'updated':
      copy.sort((a, b) => latestActivity(b) - latestActivity(a));
      break;
    case 'active':
    default:
      copy.sort((a, b) => stateOf(a).rank - stateOf(b).rank || expiryTime(a) - expiryTime(b));
      break;
  }
  return copy;
}

// ─── Sort dropdown ────────────────────────────────────────────────────────────

function SortControl({ value, onChange }: { value: JoinedSort; onChange: (s: JoinedSort) => void }) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.sortBtn,
          { backgroundColor: isDark ? th.backgroundElement : '#F4F0FA', borderColor: th.border },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={t('blindDate.joined.sortA11y', { current: t(current.labelKey) })}
      >
        <Ionicons name="swap-vertical-outline" size={12} color={th.textSecondary} />
        <Text style={[styles.sortBtnText, { color: th.textSecondary }]}>{t(current.labelKey)}</Text>
        <Ionicons name="chevron-down" size={12} color={th.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.sortBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sortMenu,
              {
                backgroundColor: isDark ? th.backgroundElement : th.surface,
                borderColor: th.border,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {SORT_OPTIONS.map((opt) => {
              const selected = opt.key === value;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.sortOption,
                    selected && { backgroundColor: withAlpha(colors.primary, 0.08) },
                  ]}
                  onPress={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      { color: selected ? colors.primary : th.text },
                      selected && { fontWeight: '700' },
                    ]}
                  >
                    {t(opt.labelKey)}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Joined card ──────────────────────────────────────────────────────────────

function JoinedSessionCard({
  item,
  index,
  languageName,
  onOpen,
}: {
  item: BlindDateParticipationDto;
  index: number;
  languageName: string | null;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const state = deriveCardState(item);
  const session = item.session;
  const creator = session?.creator ?? null;
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Identity rules: country is allowed; city/exact location is never shown
  // on this screen (spec §10/§27). These fields live in the details sheet
  // instead of card chips so the card stays uncluttered.
  const details: DetailRow[] = [];
  if (creator?.age != null) {
    details.push({ icon: 'person-outline', label: t('blindDate.joined.detailAge'), value: `${creator.age}` });
  }
  if (creator?.country) {
    details.push({ icon: 'location-outline', label: t('blindDate.joined.detailLocation'), value: creator.country });
  }
  if (creator?.relationship_intention) {
    details.push({
      icon: 'heart-outline',
      label: t('blindDate.joined.detailLookingFor'),
      value: translateProfileOption(
        RELATIONSHIP_API_TO_LABEL[creator.relationship_intention] ??
          toTitleCase(creator.relationship_intention),
        t,
      ),
    });
  }
  if (creator?.religion) {
    details.push({
      icon: 'flower-outline',
      label: t('blindDate.joined.detailReligion'),
      value: translateProfileOption(RELIGION_API_TO_LABEL[creator.religion] ?? toTitleCase(creator.religion), t),
    });
  }
  if (languageName) {
    details.push({ icon: 'globe-outline', label: t('blindDate.joined.detailLanguage'), value: languageName });
  }

  const ended = state.ended || isSessionEnded(session);
  const expiryDate = session?.expires_at ? formatDate(session.expires_at) : null;
  // Keep it short — the details column is narrow in the side-by-side layout.
  const expiryText = ended
    ? expiryDate
      ? t('blindDate.joined.endedOn', { date: expiryDate })
      : t('blindDate.joined.sessionEnded')
    : [formatTimeLeft(session?.expires_at), expiryDate].filter(Boolean).join(' · ');

  const reachedFinal = item.status === 'FINALIST' || item.status === 'REVEALED';

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(Math.min(index, 6) * 55)}>
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: th.surface,
            borderColor: withAlpha(state.badgeColor, isDark ? 0.5 : 0.35),
          },
          ended && styles.cardEnded,
        ]}
        onPress={onOpen}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={`${state.heading}. ${state.cta}`}
      >
        {/* ── Photo + details, side by side ── */}
        <View style={styles.cardRow}>
          {/* Photo thumb — blurred, identity stays hidden */}
          <View style={styles.photoThumb}>
            {creator?.primary_photo?.signed_url ? (
              <Image
                source={{ uri: creator.primary_photo.signed_url }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                blurRadius={100}
                cachePolicy="memory-disk"
              />
            ) : (
              <BlurredPortraitFallback seed={item.session_id || item.participant_id} />
            )}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,8,40,0.4)' }]} />
            <LinearGradient
              colors={['rgba(10,5,20,0)', 'rgba(10,5,20,0.38)']}
              locations={[0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.thumbLock} pointerEvents="none">
              <Ionicons name="lock-closed" size={10} color="rgba(255,255,255,0.9)" />
            </View>
          </View>

          {/* Right column — details + CTA; photo spans the full card height */}
          <View style={styles.cardBody}>
          {/* Details column */}
          <View style={styles.cardInfo}>
            {/* Status + current round + "about them" — one tidy row */}
            <View style={styles.infoTopRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: withAlpha(state.badgeColor, isDark ? 0.22 : 0.12) },
                ]}
              >
                <Ionicons name={state.badgeIcon} size={11} color={state.badgeColor} />
                <Text style={[styles.statusBadgeText, { color: state.badgeColor }]}>
                  {state.badge}
                </Text>
              </View>
              {state.showRound && (
                <Text style={[styles.roundMetaText, { color: th.textSecondary }]} numberOfLines={1}>
                  {reachedFinal ? t('blindDate.joined.finalRound') : t('blindDate.joined.roundN', { round: item.current_round_number ?? 1 })}
                </Text>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => setDetailsOpen(true)}
                activeOpacity={0.7}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('blindDate.joined.aboutA11y')}
              >
                <Ionicons name="information-circle-outline" size={24} color={BLUE} />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.heading, { color: ended ? th.textSecondary : th.text }]}
              numberOfLines={2}
            >
              {state.heading}
            </Text>
            {!!state.subtext && (
              <Text style={[styles.subtext, { color: th.textSecondary }]} numberOfLines={2}>
                {state.subtext}
              </Text>
            )}

            {/* Expiry — pinned to the bottom of the details column */}
            <View style={styles.expiryRow}>
              <Ionicons
                name={ended ? 'flag-outline' : 'time-outline'}
                size={12}
                color={ended ? th.textSecondary : state.badgeColor}
              />
              <Text
                style={[styles.expiryText, { color: th.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {expiryText}
              </Text>
            </View>
          </View>

        {/* ── Full-width CTA — color-matched to the card's status ── */}
        {state.primaryCta ? (
          <LinearGradient
            colors={ctaGradientFor(state.badgeColor) as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaFull}
          >
            <Text style={styles.ctaFullText}>{state.cta}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.ctaFull,
              styles.ctaFullMuted,
              { borderColor: withAlpha(state.badgeColor, isDark ? 0.4 : 0.3) },
            ]}
          >
            <Text style={[styles.ctaFullText, { color: state.badgeColor }]}>{state.cta}</Text>
            <Ionicons name="chevron-forward" size={16} color={state.badgeColor} />
          </View>
        )}
          </View>
        </View>
      </TouchableOpacity>

      <CreatorDetailsSheet
        visible={detailsOpen}
        rows={details}
        onClose={() => setDetailsOpen(false)}
      />
    </Animated.View>
  );
}

// ─── Creator details bottom sheet ─────────────────────────────────────────────

type DetailRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function CreatorDetailsSheet({
  visible,
  rows,
  onClose,
}: {
  visible: boolean;
  rows: DetailRow[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { bottom } = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? th.backgroundElement : th.surface,
              borderColor: th.border,
              paddingBottom: Math.max(bottom, 12) + 8,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[styles.sheetHandle, { backgroundColor: isDark ? th.border : '#DCD3EC' }]}
          />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: th.text }]}>{t('blindDate.joined.aboutTitle')}</Text>
            <TouchableOpacity
              style={[
                styles.sheetClose,
                { backgroundColor: isDark ? th.surface : '#F4F0FA' },
              ]}
              onPress={onClose}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t('blindDate.joined.closeDetailsA11y')}
            >
              <Ionicons name="close" size={17} color={th.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetNoteRow}>
            <Ionicons name="lock-closed" size={11} color={th.textSecondary} />
            <Text style={[styles.sheetNote, { color: th.textSecondary }]}>
              {t('blindDate.joined.identityHidden')}
            </Text>
          </View>

          {rows.length === 0 ? (
            <Text style={[styles.sheetEmpty, { color: th.textSecondary }]}>
              {t('blindDate.joined.noDetails')}
            </Text>
          ) : (
            rows.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.sheetRow,
                  i > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: th.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.sheetIcon,
                    { backgroundColor: withAlpha(colors.primary, isDark ? 0.22 : 0.1) },
                  ]}
                >
                  <Ionicons name={row.icon} size={15} color={colors.primary} />
                </View>
                <Text
                  style={[styles.sheetRowLabel, { color: th.textSecondary }]}
                  numberOfLines={1}
                >
                  {row.label}
                </Text>
                <Text style={[styles.sheetRowValue, { color: th.text }]} numberOfLines={1}>
                  {row.value}
                </Text>
              </View>
            ))
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Skeleton / empty / error ─────────────────────────────────────────────────

function JoinedSkeleton() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const skel = { backgroundColor: isDark ? th.backgroundElement : '#EAE4F5' };

  return (
    <Animated.View
      style={[styles.card, pulseStyle, { backgroundColor: th.surface, borderColor: th.border }]}
    >
      <View style={styles.cardRow}>
        <View style={[styles.photoThumb, skel]} />
        <View style={styles.cardBody}>
          <View style={styles.cardInfo}>
            <View style={[styles.skelLine, skel, { width: '48%', height: 16, marginTop: 0 }]} />
            <View style={[styles.skelLine, skel, { width: '82%', height: 18 }]} />
            <View style={[styles.skelLine, skel, { width: '64%', height: 12 }]} />
            <View style={[styles.skelLine, skel, { width: '72%', height: 12 }]} />
          </View>
          <View style={[styles.skelButton, skel]} />
        </View>
      </View>
    </Animated.View>
  );
}

function JoinedEmpty({ onExplore }: { onExplore: () => void }) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
      <View
        style={[
          styles.emptyIconCircle,
          {
            backgroundColor: isDark ? th.backgroundElement : '#F2E7FF',
            borderColor: isDark ? th.border : '#E2D2FA',
          },
        ]}
      >
        <Ionicons name="bookmark-outline" size={42} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: th.text }]}>{t('blindDate.joined.emptyTitle')}</Text>
      <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
        {t('blindDate.joined.emptySubtitle')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, styles.ctaBtnPrimary]}
        onPress={onExplore}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.emptyBtnText}>{t('blindDate.joined.exploreCta')}</Text>
        <Ionicons name="arrow-forward" size={15} color="#FFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

function JoinedError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyWrap}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
      <Text style={[styles.emptyTitle, { color: th.text }]}>{t('blindDate.joined.errorTitle')}</Text>
      <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
        {t('blindDate.joined.errorSubtitle')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, styles.ctaBtnPrimary]}
        onPress={onRetry}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <Text style={styles.emptyBtnText}>{t('blindDate.joined.tryAgain')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export interface JoinedBlindDatesViewProps {
  items: BlindDateParticipationDto[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  refreshing: boolean;
  onRefresh: () => void;
  languageNameFor: (code: string) => string | null;
  onOpen: (item: BlindDateParticipationDto) => void;
  onExplore: () => void;
}

export default function JoinedBlindDatesView({
  items,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  refetch,
  refreshing,
  onRefresh,
  languageNameFor,
  onOpen,
  onExplore,
}: JoinedBlindDatesViewProps) {
  const { t } = useTranslation();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const [sort, setSort] = useState<JoinedSort>('active');

  const stateCache = useMemo(() => {
    const map = new Map<string, CardState>();
    for (const i of items) map.set(i.participant_id || i.session_id, deriveCardState(i));
    return map;
  }, [items]);

  const sorted = useMemo(
    () =>
      sortParticipations(items, sort, (i) => {
        const key = i.participant_id || i.session_id;
        return stateCache.get(key) ?? deriveCardState(i);
      }),
    [items, sort, stateCache],
  );

  const attentionCount = useMemo(
    () => items.filter((i) => (stateCache.get(i.participant_id || i.session_id)?.rank ?? 4) <= 1).length,
    [items, stateCache],
  );

  return (
    <FlatList
      data={sorted}
      keyExtractor={(item, index) => item.participant_id || item.session_id || `joined-${index}`}
      renderItem={({ item, index }) => (
        <JoinedSessionCard
          item={item}
          index={index}
          languageName={item.session ? languageNameFor(item.session.language_code) : null}
          onOpen={() => onOpen(item)}
        />
      )}
      ListHeaderComponent={
        <Animated.View entering={FadeInDown.duration(320)} style={styles.titleRow}>
          <View style={styles.titleCol}>
            {attentionCount > 0 && (
              <View
                style={[
                  styles.attentionChip,
                  { backgroundColor: withAlpha(colors.primary, isDark ? 0.25 : 0.12) },
                ]}
              >
                <Ionicons name="sparkles" size={12} color={colors.primary} />
                <Text style={[styles.attentionChipText, { color: colors.primary }]}>
                  {t('blindDate.joined.attention', { count: attentionCount })}
                </Text>
              </View>
            )}
          </View>
          <SortControl value={sort} onChange={setSort} />
        </Animated.View>
      }
      ListEmptyComponent={
        isLoading ? (
          <>
            <JoinedSkeleton />
            <JoinedSkeleton />
          </>
        ) : isError ? (
          <JoinedError onRetry={refetch} />
        ) : (
          <JoinedEmpty onExplore={onExplore} />
        )
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      initialNumToRender={6}
      windowSize={7}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  titleCol: { flex: 1 },
  pageTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  attentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
  },
  attentionChipText: { fontSize: 12, fontWeight: '700' },
  pageSubtitle: { fontSize: 13.5, marginTop: 4 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  sortBtnText: { fontSize: 12, fontWeight: '600' },
  sortBackdrop: { flex: 1, backgroundColor: 'rgba(10,6,20,0.45)' },
  sortMenu: {
    position: 'absolute',
    top: 150,
    right: 16,
    minWidth: 200,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  sortOptionText: { fontSize: 14.5, fontWeight: '500' },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#1B1C32',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardEnded: { opacity: 0.78 },

  // Side-by-side layout — photo left, details right
  cardRow: { flexDirection: 'row', alignItems: 'stretch' },
  photoThumb: {
    width: 118,
    minHeight: 150,
    backgroundColor: '#241A30',
    overflow: 'hidden',
  },
  thumbLock: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(10,5,20,0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardInfo: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  infoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 11.5, fontWeight: '700' },
  roundMetaText: { fontSize: 12, fontWeight: '600' },

  heading: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, lineHeight: 22 },
  subtext: { fontSize: 12.5, lineHeight: 17 },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 'auto',
    overflow: 'hidden',
  },
  // flex + minWidth 0 so long text ellipsizes instead of overflowing the card edge.
  expiryText: { flex: 1, flexShrink: 1, minWidth: 0, fontSize: 12, fontWeight: '500' },

  // ── Creator details bottom sheet ─────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,6,20,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  sheetNote: { fontSize: 12.5 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  sheetIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowLabel: { flex: 1, fontSize: 13.5, fontWeight: '600' },
  sheetRowValue: { maxWidth: '55%', fontSize: 14, fontWeight: '700' },
  sheetEmpty: { fontSize: 13.5, paddingVertical: 20, textAlign: 'center' },

  // Full-width CTA
  ctaFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 14,
  },
  ctaFullMuted: {
    borderWidth: 1.5,
  },
  ctaFullText: { color: '#FFF', fontSize: 14.5, fontWeight: '700' },

  // Keep for emptyBtn usage in JoinedEmpty
  ctaBtnPrimary: {
    backgroundColor: colors.primary,
  },

  // Skeleton
  skelLine: { height: 12, borderRadius: 6, marginTop: 8 },
  skelButton: { height: 50, borderRadius: 16, marginHorizontal: 16, marginBottom: 16 },

  // Empty / error
  emptyWrap: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 64 },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 14.5, textAlign: 'center', lineHeight: 21, marginTop: 10 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 26,
    paddingHorizontal: 26,
    minHeight: 50,
    justifyContent: 'center',
    marginTop: 24,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
