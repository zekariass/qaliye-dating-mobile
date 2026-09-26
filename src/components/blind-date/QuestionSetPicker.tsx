import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useQuestionSet } from '@/hooks/blindDate/useQuestionSet';
import { useTheme } from '@/hooks/use-theme';

/** Normalize question text for cross-round "already used" comparison (§12.1). */
export function normalizeQuestionText(q: string): string {
  return q.trim().toLowerCase();
}

/**
 * Checkbox list over the caller's permanent question set (platform + custom),
 * shared by the session-create sheet and the next-round picker.
 *
 * - `pickedQ` holds the selected **platform question ids** (`question_id`
 *   field — NOT the set row `id`; `POST /sessions` and `POST /rounds`
 *   validate against `question_id` and reject row ids with
 *   `question_not_in_set`). `pickedC` holds custom-question `id`s.
 * - Unanswered questions are disabled — `POST /sessions` rejects them with
 *   `question_unanswered`.
 * - `usedTexts` (normalized question text already snapshot into earlier rounds
 *   of this session) hides those rows entirely — only questions still
 *   available for selection are listed.
 */
export function QuestionSetPicker({
  enabled = true,
  pickedQ,
  pickedC,
  pickedCount,
  maxQuestions,
  onToggleQ,
  onToggleC,
  usedTexts,
  onManageQuestions,
}: {
  enabled?: boolean;
  pickedQ: Set<string>;
  pickedC: Set<string>;
  pickedCount: number;
  /**
   * Per-round cap — pass `limits.max_round_questions` from the config.
   * `undefined` (older backend) means no client-side cap; the server still
   * rejects with `invalid_question_count`.
   */
  maxQuestions?: number;
  onToggleQ: (id: string) => void;
  onToggleC: (id: string) => void;
  usedTexts?: Set<string>;
  onManageQuestions?: () => void;
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const purple = colors.primary;
  const chipBg = isDark ? '#2E1F50' : '#F2E7FF';

  const { questions, customQuestions, isLoading, isError, refetch } = useQuestionSet({ enabled });
  const totalCount = questions.length + customQuestions.length;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Questions already snapshot into earlier rounds are not selectable again —
  // hide them rather than listing them disabled.
  const isUsed = (text: string) => usedTexts?.has(normalizeQuestionText(text)) ?? false;
  const visibleQuestions = questions.filter((q) => !isUsed(q.question));
  const visibleCustomQuestions = customQuestions.filter((q) => !isUsed(q.question));
  const allUsed = totalCount > 0 && visibleQuestions.length + visibleCustomQuestions.length === 0;

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (isLoading) {
    return <ActivityIndicator color={purple} style={{ marginVertical: 30 }} />;
  }
  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { color: th.textSecondary }]}>
          Couldn’t load your question set.
        </Text>
        <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
          <Text style={{ color: purple, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (totalCount === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="chatbubble-ellipses-outline" size={36} color={purple} />
        <Text style={[styles.muted, { color: th.textSecondary, textAlign: 'center' }]}>
          Your question set is empty. Add questions first — they’re reused every time you host.
        </Text>
        {onManageQuestions && (
          <TouchableOpacity
            style={styles.cta}
            onPress={onManageQuestions}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={16} color="#FFF" />
            <Text style={styles.ctaText}>Set up my questions</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const renderRow = (
    id: string,
    picked: boolean,
    question: string,
    answer: string | null,
    onToggle: () => void,
  ) => {
    const unanswered = !answer || answer.trim() === '';
    const disabled = unanswered;
    return (
      <TouchableOpacity
        key={id}
        style={[
          styles.row,
          {
            borderColor: picked ? purple : th.border,
            backgroundColor: picked
              ? isDark ? 'rgba(138,44,255,0.16)' : '#F2E7FF'
              : isDark ? '#1D1230' : '#FFF',
          },
          disabled && { opacity: 0.55 },
        ]}
        onPress={onToggle}
        disabled={disabled}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: picked, disabled }}
      >
        <Ionicons
          name={picked ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={picked ? purple : th.textSecondary}
        />
        <View style={styles.rowMain}>
          <Text style={[styles.q, { color: th.text }]} numberOfLines={3}>
            {question}
          </Text>
          {unanswered ? (
            <View style={[styles.hintPill, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Ionicons name="pencil" size={10} color="#F59E0B" />
              <Text style={[styles.hintPillText, { color: '#F59E0B' }]}>
                Needs your answer first
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.answerToggle}
                onPress={() => toggleExpand(id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityState={{ expanded: expanded.has(id) }}
              >
                <Ionicons
                  name={expanded.has(id) ? 'chevron-up' : 'chevron-down'}
                  size={13}
                  color={purple}
                />
                <Text style={[styles.answerToggleText, { color: purple }]}>Your answer</Text>
              </TouchableOpacity>
              {expanded.has(id) && (
                <Text style={[styles.a, { color: th.textSecondary }]}>{answer}</Text>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.list}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {allUsed && (
        <Text style={[styles.muted, styles.allUsedNote, { color: th.textSecondary }]}>
          All your questions were already used in earlier rounds — add new ones to continue.
        </Text>
      )}
      {visibleQuestions.length > 0 && (
        <Text style={[styles.sectionLabel, { color: th.textSecondary }]}>Platform questions</Text>
      )}
      {visibleQuestions.map((q) =>
        renderRow(q.question_id, pickedQ.has(q.question_id), q.question, q.answer, () => {
          if (pickedQ.has(q.question_id) || maxQuestions == null || pickedCount < maxQuestions)
            onToggleQ(q.question_id);
        }),
      )}
      {visibleCustomQuestions.length > 0 && (
        <Text style={[styles.sectionLabel, { color: th.textSecondary }]}>Your questions</Text>
      )}
      {visibleCustomQuestions.map((q) =>
        renderRow(q.id, pickedC.has(q.id), q.question, q.answer, () => {
          if (pickedC.has(q.id) || maxQuestions == null || pickedCount < maxQuestions) onToggleC(q.id);
        }),
      )}
      {onManageQuestions && (
        <TouchableOpacity style={styles.manage} onPress={onManageQuestions} accessibilityRole="button">
          <Ionicons name="settings-outline" size={13} color={purple} />
          <Text style={{ color: purple, fontSize: 12.5, fontWeight: '700' }}>
            Manage my question set
          </Text>
        </TouchableOpacity>
      )}
      <Text
        style={[
          styles.countHint,
          {
            color:
              maxQuestions != null && pickedCount >= maxQuestions
                ? '#F59E0B'
                : th.textSecondary,
            backgroundColor:
              maxQuestions != null && pickedCount >= maxQuestions
                ? 'rgba(245,158,11,0.12)'
                : chipBg,
          },
        ]}
      >
        {pickedCount}
        {maxQuestions != null ? `/${maxQuestions}` : ''} selected
        {maxQuestions != null && pickedCount >= maxQuestions
          ? ' — deselect one to pick another'
          : ''}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 4, flexShrink: 1 },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 8,
  },
  center: { alignItems: 'center', gap: 12, paddingVertical: 26 },
  muted: { fontSize: 13, lineHeight: 18 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 6,
  },
  ctaText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  rowMain: { flex: 1 },
  q: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  a: { fontSize: 13, marginTop: 4, lineHeight: 19 },
  answerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
  },
  answerToggleText: { fontSize: 12, fontWeight: '700' },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: 'rgba(140,140,160,0.12)',
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hintPillText: { fontSize: 10.5, fontWeight: '700' },
  manage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  allUsedNote: {
    textAlign: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  countHint: {
    alignSelf: 'center',
    fontSize: 11.5,
    fontWeight: '700',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
});
