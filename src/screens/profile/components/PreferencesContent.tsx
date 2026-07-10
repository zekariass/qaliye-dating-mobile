import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface PrefItem {
  icon: IoniconName;
  label: string;
  value: string;
}

function formatEnum(val: string): string {
  return val
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildPreferences(p: CurrentUserProfile): PrefItem[] {
  const items: PrefItem[] = [
    {
      icon: 'compass-outline',
      label: 'Discovery Mode',
      value: formatEnum(p.discoveryMode),
    },
    {
      icon: 'person-outline',
      label: 'Interested In',
      value: formatEnum(p.interestedInGender),
    },
    {
      icon: 'options-outline',
      label: 'Age Range',
      value: `${p.minAge} – ${p.maxAge}`,
    },
    {
      icon: 'navigate-outline',
      label: 'Max Distance',
      value: `${p.maxDistanceKm} km`,
    },
    {
      icon: 'location-outline',
      label: 'Discover Profiles From',
      value: formatEnum(p.locationMode),
    },
    {
      icon: 'search-outline',
      label: 'Expand Search When Limited',
      value: p.expandSearchWhenLimited ? 'Yes' : 'No',
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Verified Profiles Only',
      value: p.showVerifiedOnly ? 'Yes' : 'No',
    },
  ];

  if (p.hasChildrenPreference) {
    items.push({ icon: 'people-outline', label: 'Has Children Pref', value: formatEnum(p.hasChildrenPreference) });
  }
  if (p.wantsChildrenPreference) {
    items.push({ icon: 'heart-outline', label: 'Wants Children Pref', value: formatEnum(p.wantsChildrenPreference) });
  }
  if (p.religionPreferences?.length) {
    items.push({ icon: 'moon-outline', label: 'Religion Preferences', value: p.religionPreferences.join(', ') });
  }
  if (p.languagePreferences?.length) {
    items.push({ icon: 'chatbubble-outline', label: 'Language Preferences', value: p.languagePreferences.map((l) => l.name).join(', ') });
  }
  if (p.ethnicityPreferences?.length) {
    items.push({ icon: 'globe-outline', label: 'Ethnicity Preferences', value: p.ethnicityPreferences.map((e) => e.name).join(', ') });
  }

  return items;
}

interface PreferencesContentProps {
  profile: CurrentUserProfile;
}

export default function PreferencesContent({ profile }: PreferencesContentProps) {
  const { colors: th } = useTheme();
  const prefs = buildPreferences(profile);

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
        {prefs.map((item, idx) => (
          <View key={item.label}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: th.border }]} />}
            <View style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: th.backgroundSelected }]}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.label, { color: th.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.value, { color: th.text }]} numberOfLines={2}>
                  {item.value}
                </Text>
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
    paddingHorizontal: 8,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9DDF8',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
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
});
