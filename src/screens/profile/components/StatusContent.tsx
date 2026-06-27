import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface StatusItem {
  icon: IoniconName;
  label: string;
  value: string;
  active: boolean;
}

function buildStatusItems(p: CurrentUserProfile): StatusItem[] {
  return [
    {
      icon: 'eye-outline',
      label: 'Profile Visibility',
      value: p.isVisible ? 'Visible' : 'Hidden',
      active: p.isVisible,
    },
    {
      icon: 'checkmark-done-outline',
      label: 'Onboarding Status',
      value: p.isOnboarded ? 'Completed' : 'In Progress',
      active: p.isOnboarded,
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Verification Status',
      value: p.isVerified ? 'Verified' : 'Not Verified',
      active: p.isVerified,
    },
    {
      icon: 'speedometer-outline',
      label: 'Profile Completion',
      value: `${p.profileCompletionScore}%`,
      active: p.profileCompletionScore >= 80,
    },
  ];
}

interface StatusContentProps {
  profile: CurrentUserProfile;
}

export default function StatusContent({ profile }: StatusContentProps) {
  const { colors: th } = useTheme();
  const items = buildStatusItems(profile);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
            <View style={styles.cardTop}>
              <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.active ? colors.success : '#D1D5DB' },
                ]}
              />
            </View>
            <Text style={[styles.label, { color: th.textSecondary }]}>{item.label}</Text>
            <Text style={[styles.value, { color: th.text }]}>{item.value}</Text>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9DDF8',
    padding: 16,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B1340',
  },
});
