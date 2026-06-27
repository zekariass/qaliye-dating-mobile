import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface LifestyleItem {
  icon: IoniconName;
  label: string;
  value: string;
}

function buildLifestyleItems(p: CurrentUserProfile): LifestyleItem[] {
  return [
    { icon: 'ban-outline', label: 'Smoking', value: p.smoking ? 'Yes' : 'No' },
    { icon: 'wine-outline', label: 'Drinking', value: p.drinking ? 'Yes' : 'No' },
  ];
}

const COMING_SOON: { icon: IoniconName; label: string }[] = [
  { icon: 'fitness-outline', label: 'Activity Level' },
  { icon: 'color-palette-outline', label: 'Interests' },
  { icon: 'language-outline', label: 'Languages' },
];

interface LifestyleContentProps {
  profile: CurrentUserProfile;
}

export default function LifestyleContent({ profile }: LifestyleContentProps) {
  const { colors: th } = useTheme();
  const items = buildLifestyleItems(profile);

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

        <View style={[styles.divider, { backgroundColor: th.border }]} />

        {COMING_SOON.map((item) => (
          <View key={item.label}>
            <View style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected, opacity: 0.5 }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.label, { color: th.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.comingSoon, { color: th.textMuted }]}>Coming soon</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
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
  comingSoon: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E9DDF8',
  },
});
