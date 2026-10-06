import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import { supabase } from '@/lib/supabase';
import {
    FAMILY_INVOLVEMENT_API_TO_LABEL,
    LONG_DISTANCE_API_TO_LABEL,
    MARRIAGE_TIMELINE_API_TO_LABEL,
    RELIGION_IMPORTANCE_API_TO_LABEL,
    WILLING_TO_RELOCATE_API_TO_LABEL,
} from '@/utils/profileMappers';
import { translateProfileOption } from '@/utils/profileOptions';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

interface DetailItem {
  icon: string;
  label: string;
  value: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ].map((m) => i18n.t(`profile.edit.monthsShort.${m}`));
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function calcAge(dateStr: string): number {
  const today = new Date();
  const b = new Date(dateStr + 'T00:00:00');
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

function buildDetails(p: CurrentUserProfile, email: string | null): DetailItem[] {
  const items: DetailItem[] = [];

  if (email) {
    items.push({ icon: 'mail-outline', label: i18n.t('profile.details.email'), value: email });
  }
  items.push({ icon: 'map-outline', label: i18n.t('profile.details.address'), value: p.address });
  items.push({ icon: 'person-outline', label: i18n.t('profile.details.gender'), value: translateProfileOption(p.gender, i18n.t) });
  items.push({
    icon: 'calendar-outline',
    label: i18n.t('profile.details.dateOfBirth'),
    value: `${formatDate(p.dateOfBirth)} ${i18n.t('profile.details.ageValue', { age: calcAge(p.dateOfBirth) })}`,
  });
  if (p.heightCm != null) {
    items.push({ icon: 'resize-outline', label: i18n.t('profile.details.height'), value: i18n.t('profile.details.heightValue', { height: p.heightCm }) });
  }
  items.push({ icon: 'home-outline', label: i18n.t('profile.details.residencyType'), value: translateProfileOption(p.residencyType, i18n.t) });
  if (p.ethnicities && p.ethnicities.length > 0) {
    items.push({ icon: 'people-outline', label: i18n.t('profile.details.ethnicity'), value: p.ethnicities.map((e) => e.name).join(', ') });
  }
  if (p.nationality) items.push({ icon: 'globe-outline', label: i18n.t('profile.details.nationality'), value: translateProfileOption(p.nationality, i18n.t) });
  if (p.religion) items.push({ icon: 'mci:hands-pray', label: i18n.t('profile.details.religion'), value: translateProfileOption(p.religion, i18n.t) });
  if (p.educationLevel) items.push({ icon: 'school-outline', label: i18n.t('profile.details.educationLevel'), value: translateProfileOption(p.educationLevel, i18n.t) });
  if (p.occupation) items.push({ icon: 'briefcase-outline', label: i18n.t('profile.details.occupation'), value: p.occupation });
  items.push({
    icon: 'heart-outline',
    label: i18n.t('profile.details.relationshipIntention'),
    value: translateProfileOption(p.relationshipIntention, i18n.t),
  });
  if (p.maritalStatus) {
    items.push({ icon: 'person-circle-outline', label: i18n.t('profile.details.maritalStatus'), value: translateProfileOption(p.maritalStatus, i18n.t) });
  }
  items.push({
    icon: 'people-circle-outline',
    label: i18n.t('profile.details.hasChildren'),
    value: p.hasChildren ? i18n.t('common.yes') : i18n.t('common.no'),
  });
  items.push({
    icon: 'happy-outline',
    label: i18n.t('profile.details.wantsChildren'),
    value: p.wantsChildren == null ? i18n.t('profile.details.notSpecified') : p.wantsChildren ? i18n.t('common.yes') : i18n.t('common.no'),
  });

  return items;
}

interface MarriagePrefItem {
  label: string;
  value: string;
}

// CurrentUserProfile stores marriage pref fields as human-readable display labels
// (already converted by mapProfileMeDtoToCurrentUserProfile). The API→label maps
// are imported as a fallback for any stale raw-enum values that might slip through.
function buildMarriagePrefItems(p: CurrentUserProfile): MarriagePrefItem[] {
  const items: MarriagePrefItem[] = [];
  if (p.marriageTimeline)
    items.push({ label: i18n.t('profile.marriagePrefs.marriageTimeline'), value: MARRIAGE_TIMELINE_API_TO_LABEL[p.marriageTimeline] ?? p.marriageTimeline });
  if (p.longDistanceRelationship)
    items.push({ label: i18n.t('profile.marriagePrefs.longDistance'), value: LONG_DISTANCE_API_TO_LABEL[p.longDistanceRelationship] ?? p.longDistanceRelationship });
  if (p.familyInvolvement)
    items.push({ label: i18n.t('profile.marriagePrefs.familyInvolvement'), value: FAMILY_INVOLVEMENT_API_TO_LABEL[p.familyInvolvement] ?? p.familyInvolvement });
  if (p.religionImportance)
    items.push({ label: i18n.t('profile.marriagePrefs.religionImportance'), value: RELIGION_IMPORTANCE_API_TO_LABEL[p.religionImportance] ?? p.religionImportance });
  if (p.willingToRelocate)
    items.push({ label: i18n.t('profile.marriagePrefs.willingToRelocate'), value: WILLING_TO_RELOCATE_API_TO_LABEL[p.willingToRelocate] ?? p.willingToRelocate });
  return items;
}

interface DetailsContentProps {
  profile: CurrentUserProfile;
}

export default function DetailsContent({ profile }: DetailsContentProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const details = buildDetails(profile, email);
  const marriageItems = buildMarriagePrefItems(profile);

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
        {details.map((item, idx) => (
          <View key={idx}>
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
                <Text style={[styles.detailValue, { color: textCol }]}>{item.value}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* ─── Marriage & Relationship Preferences (hidden when all null) ─── */}
      {marriageItems.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: mutedCol }]}>
            {i18n.t('profile.marriagePrefs.sectionTitle')}
          </Text>
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
            {marriageItems.map((item, idx) => (
              <View key={item.label}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
                <View style={styles.listRow}>
                  <View style={styles.detailBody}>
                    <Text style={[styles.detailLabel, { color: mutedCol }]}>{item.label}</Text>
                    <Text style={[styles.detailValue, { color: textCol }]}>{item.value}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
    paddingHorizontal: 4,
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
