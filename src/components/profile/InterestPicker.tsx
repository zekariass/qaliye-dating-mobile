import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { INTEREST_OPTIONS } from '@/screens/profile/mockEditProfile';
import {
    INTERESTS_INITIAL_PREVIEW_COUNT,
    MAX_INTERESTS,
    canSelectMore,
    translateInterest,
} from '@/utils/interests';

// ─── Interest → emoji mapping ────────────────────────────────────────────────

const INTEREST_EMOJI: Record<string, string> = {
  'Travel': '✈️',
  'Reading': '📚',
  'Cooking': '🍳',
  'Baking': '🧁',
  'Fitness': '💪',
  'Running': '🏃',
  'Cycling': '🚴',
  'Swimming': '🏊',
  'Yoga': '🧘',
  'Meditation': '🧠',
  'Sports': '⚽',
  'Football': '⚽',
  'Basketball': '🏀',
  'Tennis': '🎾',
  'Hiking': '🥾',
  'Camping': '⛺',
  'Nature': '🌿',
  'Gardening': '🌱',
  'Music': '🎵',
  'Concerts': '🎤',
  'Singing': '🎙️',
  'Dancing': '💃',
  'Movies': '🎬',
  'TV Shows': '📺',
  'Theatre': '🎭',
  'Comedy': '😄',
  'Podcasts': '🎧',
  'Gaming': '🎮',
  'Art': '🎨',
  'Photography': '📷',
  'Writing': '✍️',
  'Poetry': '📝',
  'Design': '🖌️',
  'Fashion': '👗',
  'Crafts': '🧶',
  'DIY': '🔨',
  'Coffee': '☕',
  'Tea': '🍵',
  'Food': '🍽️',
  'Restaurants': '🍴',
  'Brunch': '🥐',
  'Tech': '💻',
  'Science': '🔬',
  'History': '📜',
  'Languages': '🌍',
  'Business': '💼',
  'Entrepreneurship': '🚀',
  'Volunteering': '🤝',
  'Animals': '🐾',
  'Pets': '🐕',
  'Sustainability': '♻️',
  'Spirituality': '🕊️',
  'Family': '👨‍👩‍👧',
  'Nightlife': '🌃',
  'Festivals': '🎉',
  'Board Games': '🎲',
  'Shopping': '🛍️',
  'Cars': '🚗',
};

function getInterestEmoji(interest: string): string {
  return INTEREST_EMOJI[interest] ?? '✨';
}

// ─── Animated chip ────────────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function InterestChip({
  interest,
  isActive,
  disabled,
  sem,
  onPress,
}: {
  interest: string;
  isActive: boolean;
  disabled: boolean;
  sem: SemanticTheme;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const scale = useState(() => new Animated.Value(1))[0];

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [scale]);

  const emoji = getInterestEmoji(interest);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? sem.accent : sem.surfaceMuted,
          borderColor: isActive ? sem.accent : sem.border,
          opacity: disabled ? 0.35 : 1,
          transform: [{ scale }],
          ...(isActive
            ? {
                shadowColor: sem.accent,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4,
              }
            : {}),
        },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isActive }}
      accessibilityLabel={interest}
    >
      <Text style={styles.chipEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.chipText,
          { color: isActive ? '#FFFFFF' : sem.textSecondary },
        ]}
        numberOfLines={1}
      >
        {translateInterest(interest, t)}
      </Text>
    </AnimatedPressable>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type InterestPickerProps = {
  selected: string[];
  onToggle: (val: string) => void;
  sem: SemanticTheme;
  max?: number;
  initialPreviewCount?: number;
};

export const InterestPicker = memo(function InterestPicker({
  selected,
  onToggle,
  sem,
  max = MAX_INTERESTS,
  initialPreviewCount = INTERESTS_INITIAL_PREVIEW_COUNT,
}: InterestPickerProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(
    (opt: string) => {
      const isSelected = selected.includes(opt);
      if (!isSelected && !canSelectMore(selected, max)) return;
      onToggle(opt);
    },
    [selected, onToggle, max],
  );

  const visibleOptions = useMemo(
    () => (expanded ? INTEREST_OPTIONS : INTEREST_OPTIONS.slice(0, initialPreviewCount)),
    [expanded, initialPreviewCount],
  );

  const hasMore = INTEREST_OPTIONS.length > initialPreviewCount;
  const maxReached = selected.length >= max;
  const progressPercent = Math.min(100, (selected.length / max) * 100);

  return (
    <View>
      {/* Header with count + progress bar */}
      <View style={styles.headerRow}>
        <Text style={[styles.countText, { color: sem.textSecondary }]}>
          {t('interests.ofSelected', { count: selected.length, max })}
        </Text>
        {maxReached && (
          <View style={[styles.maxBadge, { backgroundColor: sem.accentSoft }]}>
            <Ionicons name="checkmark-circle" size={12} color={sem.accent} />
            <Text style={[styles.maxBadgeText, { color: sem.accent }]}>{t('interests.maxReached')}</Text>
          </View>
        )}
      </View>

      <View style={[styles.progressTrack, { backgroundColor: sem.surfaceMuted }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: maxReached ? sem.success : sem.accent,
            },
          ]}
        />
      </View>

      {/* Chips */}
      <View style={styles.chipWrap}>
        {visibleOptions.map((opt) => {
          const isActive = selected.includes(opt);
          const disabled = !isActive && maxReached;
          return (
            <InterestChip
              key={opt}
              interest={opt}
              isActive={isActive}
              disabled={disabled}
              sem={sem}
              onPress={() => handleToggle(opt)}
            />
          );
        })}
      </View>

      {/* Expand / Collapse */}
      {hasMore && (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.toggleBtn}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less' : 'See more'}
        >
          <Text style={[styles.toggleText, { color: sem.accent }]}>
            {expanded ? t('interests.showLess') : t('interests.seeMore')}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={14}
            color={sem.accent}
          />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  maxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  maxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    gap: 5,
    width: '31%',
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    paddingVertical: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
