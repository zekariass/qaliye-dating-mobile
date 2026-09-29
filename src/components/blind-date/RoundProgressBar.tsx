import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { bdColors } from '@/constants/blindDateTheme';
import { useTheme } from '@/hooks/use-theme';

type NodeState = 'done' | 'current' | 'future';

type Node = {
  key: string;
  label: string;
  state: NodeState;
  isFinal?: boolean;
};

/**
 * Dynamic round progress indicator.
 *
 * Only renders nodes for rounds that actually exist (completed + current).
 * Never shows a fixed denominator like "Round 2 of 5" — the creator may stop
 * earlier than the configured max_rounds.
 *
 * When `isFinalRound` is true the current node is rendered as ★ FINAL.
 *
 * Examples:
 *   ✓ ─── ✓ ─── ●          (rounds 1-2 done, round 3 current)
 *   ✓ ─── ✓ ─── ✓ ─── ★    (rounds 1-3 done, final round current)
 */
export function RoundProgressBar({
  currentRound,
  completedRounds,
  isFinalRound = false,
  compact = false,
  large = false,
  muted = false,
}: {
  /** Current round number (1-based). */
  currentRound: number;
  /**
   * How many rounds are fully complete. When not provided, assumes
   * `currentRound - 1`.
   */
  completedRounds?: number;
  /** True when the current round IS the final round (star node). */
  isFinalRound?: boolean;
  /** Compact mode uses "R1" / "R2" labels instead of "Round 1". */
  compact?: boolean;
  /** Large mode scales up dots and labels for intro/hero screens. */
  large?: boolean;
  /** Muted styling for ended/inactive sessions. */
  muted?: boolean;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const accent = muted ? bdColors.slate : bdColors.primary;
  const mutedDot = isDark ? '#3A3F55' : '#DCE0EA';
  const mutedText = isDark ? '#5A6072' : '#A6ACBC';

  const total = Math.max(1, currentRound);
  const completed = completedRounds ?? Math.max(0, currentRound - 1);

  const nodes: Node[] = [];
  for (let i = 1; i <= total; i++) {
    const isLast = i === total;
    const state: NodeState =
      i <= completed ? 'done' : isLast ? 'current' : 'done';
    nodes.push({
      key: `r${i}`,
      label: isFinalRound && isLast
        ? t('blindDate.progress.final')
        : compact
          ? t('blindDate.progress.compact', { round: i })
          : t('blindDate.progress.round', { round: i }),
      state,
      isFinal: isFinalRound && isLast,
    });
  }

  return (
    <View style={styles.row}>
      {nodes.map((node, i) => (
        <Fragment key={node.key}>
          {i > 0 && (
            <View
              style={[
                styles.line,
                large && styles.lineLg,
                {
                  backgroundColor:
                    nodes[i - 1].state === 'done' ? accent : mutedDot,
                },
              ]}
            />
          )}
          <View style={styles.node}>
            <View
              style={[
                styles.dot,
                large && styles.dotLg,
                node.state === 'done' && { backgroundColor: accent },
                node.state === 'future' && { backgroundColor: mutedDot },
                node.state === 'current' && [
                  styles.dotCurrent,
                  large && styles.dotCurrentLg,
                  {
                    borderColor: accent,
                    backgroundColor: isDark ? th.surface : '#FFF',
                  },
                ],
                node.isFinal && node.state === 'current' && [
                  styles.dotFinal,
                  large && styles.dotFinalLg,
                  { borderColor: bdColors.gold },
                ],
              ]}
            >
              {node.state === 'done' && (
                <Ionicons name="checkmark" size={large ? 14 : 9} color="#FFF" />
              )}
              {node.state === 'current' && !node.isFinal && (
                <View
                  style={[
                    styles.dotInner,
                    large && styles.dotInnerLg,
                    { backgroundColor: accent },
                  ]}
                />
              )}
              {node.isFinal && node.state === 'current' && (
                <Ionicons name="star" size={large ? 16 : 10} color={bdColors.gold} />
              )}
            </View>
            <Text
              style={[
                styles.label,
                large && styles.labelLg,
                {
                  color:
                    node.state === 'future'
                      ? mutedText
                      : node.isFinal
                        ? bdColors.gold
                        : th.text,
                },
              ]}
              numberOfLines={1}
            >
              {node.label}
            </Text>
            {node.state === 'current' && !node.isFinal && (
              <Text
                style={[
                  styles.currentLabel,
                  large && styles.currentLabelLg,
                  { color: accent },
                ]}
              >
                {t('blindDate.progress.current')}
              </Text>
            )}
            {node.isFinal && node.state === 'current' && (
              <Text
                style={[
                  styles.currentLabel,
                  large && styles.currentLabelLg,
                  { color: bdColors.gold },
                ]}
              >
                {t('blindDate.progress.final')}
              </Text>
            )}
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  node: {
    alignItems: 'center',
    minWidth: 28,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#DCE0EA',
  },
  dotCurrent: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  dotFinal: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    flex: 1,
    height: 2,
    marginTop: 8,
    marginHorizontal: 2,
    borderRadius: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  currentLabel: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
    textAlign: 'center',
  },

  // Large variants — used on intro/celebration screens
  dotLg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2.5,
  },
  dotCurrentLg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  dotFinalLg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  dotInnerLg: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  lineLg: {
    height: 3,
    marginTop: 14,
    borderRadius: 2,
  },
  labelLg: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  currentLabelLg: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.4,
  },
});
