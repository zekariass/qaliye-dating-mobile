import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { INTEREST_OPTIONS } from '@/screens/profile/mockEditProfile';
import {
    INTERESTS_INITIAL_PREVIEW_COUNT,
    MAX_INTERESTS,
    canSelectMore,
    translateInterest,
} from '@/utils/interests';

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

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={[styles.countText, { color: sem.textSecondary }]}>
          {t('interests.ofSelected', { count: selected.length, max })}
        </Text>
        {maxReached && (
          <View style={[styles.maxBadge, { backgroundColor: sem.accentSoft }]}>
            <Text style={[styles.maxBadgeText, { color: sem.accent }]}>{t('interests.maxReached')}</Text>
          </View>
        )}
      </View>

      <View style={styles.chipWrap}>
        {visibleOptions.map((opt) => {
          const isActive = selected.includes(opt);
          const disabled = !isActive && maxReached;
          return (
            <Pressable
              key={opt}
              onPress={() => handleToggle(opt)}
              disabled={disabled}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? sem.accentSoft : sem.surfaceMuted,
                  borderColor: isActive ? sem.accent : sem.border,
                  opacity: disabled ? 0.4 : 1,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={opt}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isActive ? sem.accent : sem.textSecondary },
                ]}
              >
                {translateInterest(opt, t)}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
    marginBottom: 12,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
  },
  maxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  maxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
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
    marginTop: 12,
    paddingVertical: 4,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
