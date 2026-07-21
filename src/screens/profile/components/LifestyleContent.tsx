import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
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
    { icon: 'ban-outline', label: 'Smoking', value: p.smoking ? 'Yes' : 'No' },
    { icon: 'wine-outline', label: 'Drinking', value: p.drinking ? 'Yes' : 'No' },
  ];
  if (p.languages && p.languages.length > 0) {
    items.push({ icon: 'language-outline', label: 'Languages', value: p.languages.map((l) => l.name).join(', ') });
  }
  if (p.activityLevel) {
    items.push({ icon: 'fitness-outline', label: 'Activity Level', value: p.activityLevel });
  }
  return items;
}

interface LifestyleContentProps {
  profile: CurrentUserProfile;
}

export default function LifestyleContent({ profile }: LifestyleContentProps) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const items = buildLifestyleItems(profile);
  const interests = sanitizeInterests(profile.interests);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
        {items.map((item, idx) => (
          <View key={item.label}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: th.border }]} />}
            <View style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.label, { color: th.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.value, { color: th.text }]}>{item.value}</Text>
              </View>
            </View>
          </View>
        ))}

        {interests.length > 0 && (
          <View>
            {items.length > 0 && <View style={[styles.divider, { backgroundColor: th.border }]} />}
            <View style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
                <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.label, { color: th.textSecondary }]}>{t('interests.label')}</Text>
                <View style={styles.chipWrap}>
                  {interests.map((interest) => (
                    <View key={interest} style={[styles.chip, { backgroundColor: th.backgroundSelected, borderColor: th.border }]}>
                      <Text style={[styles.chipText, { color: colors.primary }]}>{translateInterest(interest, t)}</Text>
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
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9DDF8',
    padding: 16,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B1340',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E9DDF8',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
