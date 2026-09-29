import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import { translateProfileOption } from '@/utils/profileOptions';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

interface PrefItem {
  icon: string;
  label: string;
  value: string;
}

function buildPreferences(p: CurrentUserProfile): PrefItem[] {
  const items: PrefItem[] = [
    {
      icon: 'compass-outline',
      label: i18n.t('profile.preferencesView.discoveryMode'),
      value: translateProfileOption(p.discoveryMode, i18n.t),
    },
    {
      icon: 'person-outline',
      label: i18n.t('profile.preferencesView.interestedIn'),
      value: translateProfileOption(p.interestedInGender, i18n.t),
    },
    {
      icon: 'options-outline',
      label: i18n.t('profile.preferencesView.ageRange'),
      value: `${p.minAge} – ${p.maxAge}`,
    },
    {
      icon: 'navigate-outline',
      label: i18n.t('profile.preferencesView.maxDistance'),
      value: i18n.t('profile.preferencesView.distanceValue', { distance: p.maxDistanceKm }),
    },
    {
      icon: 'location-outline',
      label: i18n.t('profile.preferencesView.discoverProfilesFrom'),
      value: translateProfileOption(p.locationMode, i18n.t),
    },
    {
      icon: 'search-outline',
      label: i18n.t('profile.preferencesView.expandSearchWhenLimited'),
      value: p.expandSearchWhenLimited ? i18n.t('common.yes') : i18n.t('common.no'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: i18n.t('profile.preferencesView.verifiedProfilesOnly'),
      value: p.showVerifiedOnly ? i18n.t('common.yes') : i18n.t('common.no'),
    },
  ];

  if (p.hasChildrenPreference) {
    items.push({ icon: 'people-outline', label: i18n.t('profile.preferencesView.hasChildrenPref'), value: translateProfileOption(p.hasChildrenPreference, i18n.t) });
  }
  if (p.wantsChildrenPreference) {
    items.push({ icon: 'heart-outline', label: i18n.t('profile.preferencesView.wantsChildrenPref'), value: translateProfileOption(p.wantsChildrenPreference, i18n.t) });
  }
  if (p.religionPreferences?.length) {
    items.push({ icon: 'mci:hands-pray', label: i18n.t('profile.preferencesView.religionPreferences'), value: p.religionPreferences.map((r) => translateProfileOption(r, i18n.t)).join(', ') });
  }
  if (p.languagePreferences?.length) {
    items.push({ icon: 'chatbubble-outline', label: i18n.t('profile.preferencesView.languagePreferences'), value: p.languagePreferences.map((l) => l.name).join(', ') });
  }
  if (p.ethnicityPreferences?.length) {
    items.push({ icon: 'globe-outline', label: i18n.t('profile.preferencesView.ethnicityPreferences'), value: p.ethnicityPreferences.map((e) => e.name).join(', ') });
  }

  return items;
}

interface PreferencesContentProps {
  profile: CurrentUserProfile;
}

export default function PreferencesContent({ profile }: PreferencesContentProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const prefs = buildPreferences(profile);

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
        {prefs.map((item, idx) => (
          <View key={item.label}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
            <View style={styles.listRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                {item.icon.startsWith('mci:') ? (
                  <MaterialCommunityIcons name={item.icon.slice(4) as any} size={17} color={colors.primary} />
                ) : /^[a-z-]+$/i.test(item.icon) ? (
                  <Ionicons name={item.icon as any} size={17} color={colors.primary} />
                ) : (
                  <Text style={{ fontSize: 17 }}>{item.icon}</Text>
                )}
              </View>
              <View style={styles.detailBody}>
                <Text style={[styles.detailLabel, { color: mutedCol }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: textCol }]} numberOfLines={2}>
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
});
