import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { BlurredPortraitFallback } from '@/components/blind-date/SessionSwipeCard';
import { bdColors, bdGradients } from '@/constants/blindDateTheme';
import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type {
    BlindDateParticipantStatus,
    BlindDateRosterParticipantDto,
} from '@/types/blindDate';

// ─── Status presentation ──────────────────────────────────────────────────────

const STATUS_META: Record<
  BlindDateParticipantStatus,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  ACTIVE:     { label: 'In the running', icon: 'ellipse',            color: colors.success },
  ADVANCED:   { label: 'Advanced',       icon: 'arrow-up-circle',    color: '#3B82F6' },
  FINALIST:   { label: 'Finalist',       icon: 'star',               color: bdColors.gold },
  REVEALED:   { label: 'Revealed',       icon: 'eye',                color: bdColors.primary },
  ELIMINATED: { label: 'Eliminated',     icon: 'close-circle',       color: bdColors.slate },
  WITHDRAWN:  { label: 'Withdrew',       icon: 'exit-outline',       color: bdColors.slate },
};

function formatJoinedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnonymousParticipantCard({
  participant,
  index,
  onSelect,
  pending,
  disabled = false,
  selectable = true,
  isFinalRound = false,
}: {
  participant: BlindDateRosterParticipantDto;
  /** 0-based index used to label "Participant #N". */
  index: number;
  /**
   * Called with the decision to record for this participant.
   * The parent decides which decisions to surface (e.g. ADVANCE+ELIMINATE
   * in normal rounds, SELECT_FINALIST+ELIMINATE in the final round).
   */
  onSelect: (decision: 'ADVANCE' | 'ELIMINATE' | 'SELECT_FINALIST') => void;
  /** Whether a selection request is in-flight for this participant. */
  pending?: boolean;
  /** Disable all action buttons (e.g. round already closed). */
  disabled?: boolean;
  /** Whether the Pass/Advance buttons are shown at all. */
  selectable?: boolean;
  /**
   * When true the "Advance" button becomes "Select Finalist" —
   * the creator is at max_rounds and must pick one.
   */
  isFinalRound?: boolean;
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const meta = STATUS_META[participant.status];
  const [expanded, setExpanded] = useState(false);

  // ADVANCE is only a recorded selection — status stays ACTIVE until the
  // round closes, and stays ADVANCED once moved into a later round.
  // `decision` is the server-truth mark for the current open round.
  const markedAdvance =
    participant.decision === 'ADVANCE' &&
    (participant.status === 'ACTIVE' || participant.status === 'ADVANCED');
  const pillMeta = markedAdvance
    ? { label: 'Selected', icon: 'checkmark-circle' as const, color: bdColors.primary }
    : meta;

  const answerCount = participant.answers.filter((a) => a.submitted_at != null).length;
  const totalQuestions = participant.answers.length;
  const isDimmed =
    participant.status === 'ELIMINATED' || participant.status === 'WITHDRAWN';
  const showActions = selectable && !isDimmed;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: th.surface,
          borderColor:
            participant.status === 'FINALIST' ? bdColors.gold : th.border,
        },
        isDimmed && styles.cardDim,
      ]}
    >
      {/* ── Card header: portrait + label + status ── */}
      <TouchableOpacity
        style={styles.head}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Participant ${index + 1}, ${meta.label}`}
      >
        {/* Blurred portrait */}
        <View style={styles.avatarWrap}>
          {participant.status === 'FINALIST' ? (
            <View style={[styles.avatar, { backgroundColor: `${bdColors.gold}20` }]}>
              <Ionicons name="star" size={18} color={bdColors.gold} />
            </View>
          ) : (
            <View style={styles.avatar}>
              <BlurredPortraitFallback seed={participant.participant_id} />
            </View>
          )}
        </View>

        <View style={styles.headText}>
          <Text style={[styles.name, { color: th.text }]}>
            Participant #{index + 1}
          </Text>
          <Text style={[styles.sub, { color: th.textSecondary }]}>
            Joined {formatJoinedAt(participant.joined_at)}
            {totalQuestions > 0
              ? `  ·  ${answerCount}/${totalQuestions} answered`
              : ''}
          </Text>
        </View>

        {/* Status pill */}
        <View style={[styles.pill, { backgroundColor: `${pillMeta.color}1F` }]}>
          <Ionicons name={pillMeta.icon} size={10} color={pillMeta.color} />
          <Text style={[styles.pillText, { color: pillMeta.color }]}>{pillMeta.label}</Text>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={th.textSecondary}
        />
      </TouchableOpacity>

      {/* ── Explicit answers toggle ── */}
      <View style={styles.toggleWrap}>
        <TouchableOpacity
          style={[
            styles.viewAnswersBtn,
            { backgroundColor: expanded ? `${bdColors.primary}14` : 'transparent', borderColor: `${bdColors.primary}55` },
          ]}
          onPress={() => setExpanded((v) => !v)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? 'Hide answers'
              : `View answers, ${answerCount} of ${totalQuestions} answered`
          }
          accessibilityState={{ expanded }}
        >
          <Ionicons
            name={expanded ? 'eye-off-outline' : 'eye-outline'}
            size={14}
            color={bdColors.primary}
          />
          <Text style={[styles.viewAnswersText, { color: bdColors.primary }]}>
            {expanded
              ? 'Hide answers'
              : `View answers${totalQuestions > 0 ? ` · ${answerCount}/${totalQuestions}` : ''}`}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={bdColors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Answers accordion ── */}
      {expanded && (
        <View style={[styles.answersBox, { borderTopColor: th.border }]}>
          {participant.answers.length === 0 ? (
            <Text style={[styles.answerEmpty, { color: th.textSecondary }]}>
              {participant.status === 'WITHDRAWN'
                ? 'Withdrew before answering.'
                : 'No answers for the current round yet.'}
            </Text>
          ) : (
            participant.answers.map((a, i) => (
              <View key={a.session_question_id} style={styles.answerRow}>
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
                    {a.submitted_at ? a.answer : 'Not answered yet'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* ── Action buttons ── */}
      {showActions && (
        <View style={[styles.actions, { borderTopColor: th.border }]}>
          {pending ? (
            <ActivityIndicator
              color={bdColors.primary}
              size="small"
              style={styles.actionsLoader}
            />
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: 'rgba(239,68,68,0.10)' },
                  disabled && styles.actionBtnDisabled,
                ]}
                onPress={() => onSelect('ELIMINATE')}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="close" size={15} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Pass
                </Text>
              </TouchableOpacity>

              {!isFinalRound && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    markedAdvance
                      ? { backgroundColor: bdColors.primary }
                      : { backgroundColor: `${bdColors.primary}14` },
                    disabled && styles.actionBtnDisabled,
                  ]}
                  onPress={() => onSelect('ADVANCE')}
                  disabled={disabled || markedAdvance}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: markedAdvance, disabled: disabled || markedAdvance }}
                >
                  <Ionicons
                    name={markedAdvance ? 'checkmark' : 'arrow-up'}
                    size={15}
                    color={markedAdvance ? '#FFF' : bdColors.primary}
                  />
                  <Text
                    style={[
                      styles.actionText,
                      { color: markedAdvance ? '#FFF' : bdColors.primary },
                    ]}
                  >
                    {markedAdvance
                      ? 'Selected'
                      : participant.status === 'ADVANCED'
                        ? 'Keep'
                        : 'Select'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* The creator may crown a finalist in ANY open round — tapping
                  this ends the selection stage and sends the session to the
                  reveal with this participant as the winner. */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: `${bdColors.gold}22`, borderWidth: 1.5, borderColor: `${bdColors.gold}66` },
                  disabled && styles.actionBtnDisabled,
                ]}
                onPress={() => onSelect('SELECT_FINALIST')}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select as finalist"
              >
                <Ionicons name="star" size={15} color={bdColors.gold} />
                <Text style={[styles.actionText, { color: '#B45309' }]}>
                  Finalist
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardDim: {
    opacity: 0.55,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  sub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toggleWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  viewAnswersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  viewAnswersText: {
    fontSize: 14,
    fontWeight: '800',
  },
  answersBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  answerEmpty: {
    fontSize: 13.5,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  answerRow: {
    gap: 7,
  },
  answerQRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  answerQBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 1,
  },
  answerQBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  answerQ: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 20,
  },
  answerBubble: {
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 4,
  },
  answerA: {
    fontSize: 15,
    lineHeight: 21,
  },
  answerPending: {
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  actionsLoader: {
    flex: 1,
    paddingVertical: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
  },

  actionBtnDisabled: {
    opacity: 0.4,
  },
  actionText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
