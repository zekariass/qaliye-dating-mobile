import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sanitizeInterests, translateInterest } from '@/utils/interests';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface LifestyleItem {
  icon: IoniconName;
  label: string;
  value: string;
}

function buildLifestyleItems(p: CurrentUserProfile): LifestyleItem[] {
  const items: LifestyleItem[] = [
    { icon: 'ban-outline', label: 'Smoking', value: p.smokingDetail ?? (p.smoking ? 'Yes' : 'No') },
    { icon: 'wine-outline', label: 'Drinking', value: p.drinkingDetail ?? (p.drinking ? 'Yes' : 'No') },
  ];
  if (p.languages && p.languages.length > 0) {
    items.push({ icon: 'language-outline', label: 'Languages', value: p.languages.map((l) => l.name).join(', ') });
  }
  if (p.activityLevel) {
    items.push({ icon: 'fitness-outline', label: 'Fitness', value: p.activityLevel });
  }
  return items;
}

interface LifestyleContentProps {
  profile: CurrentUserProfile;
}

export default function LifestyleContent({ profile }: LifestyleContentProps) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const items = buildLifestyleItems(profile);
  const interests = sanitizeInterests(profile.interests);

  const surfaceBg = th.surface;
  const iconBg = isDark ? th.backgroundSelected : '#F3EEFF';
  const borderCol = isDark ? 'rgba(46,31,80,0.22)' : 'rgba(233,221,248,0.5)';
  const textCol = th.text;
  const mutedCol = th.textSecondary;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.listCard,
          {
            backgroundColor: surfaceBg,
            borderColor: borderCol,
            ...Platform.select({
              ios: { shadowColor: '#8A2CFF', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
              android: { elevation: 3 },
            }) as any,
          },
        ]}
      >
        {items.map((item, idx) => (
          <View key={item.label}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
            <View style={styles.listRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                <Ionicons name={item.icon} size={17} color={colors.primary} />
              </View>
              <View style={styles.detailBody}>
                <Text style={[styles.detailLabel, { color: mutedCol }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: textCol }]}>{item.value}</Text>
              </View>
            </View>
          </View>
        ))}

        {interests.length > 0 && (
          <View>
            {items.length > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
            <View style={styles.listRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                <Ionicons name="color-palette-outline" size={17} color={colors.primary} />
              </View>
              <View style={[styles.detailBody, { gap: 8 }]}>
                <Text style={[styles.detailLabel, { color: mutedCol }]}>{t('interests.label')}</Text>
                <View style={styles.chipWrap}>
                  {interests.map((interest) => (
                    <View key={interest} style={[styles.chip, { backgroundColor: iconBg, borderColor: borderCol }]}>
                      <Text style={[styles.chipText, { color: textCol }]}>{translateInterest(interest, t)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  listCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  detailIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailBody: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
