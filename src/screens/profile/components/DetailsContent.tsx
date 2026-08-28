import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

interface DetailItem {
  icon: string;
  label: string;
  value: string;
}

function formatEnum(val: string): string {
  return val
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
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

function buildDetails(p: CurrentUserProfile): DetailItem[] {
  const items: DetailItem[] = [];

  items.push({ icon: 'map-outline', label: 'Address', value: p.address });
  items.push({ icon: 'person-outline', label: 'Gender', value: formatEnum(p.gender) });
  items.push({
    icon: 'calendar-outline',
    label: 'Date of Birth',
    value: `${formatDate(p.dateOfBirth)} (${calcAge(p.dateOfBirth)})`,
  });
  if (p.heightCm != null) {
    items.push({ icon: 'resize-outline', label: 'Height', value: `${p.heightCm} cm` });
  }
  items.push({ icon: 'home-outline', label: 'Residency Type', value: formatEnum(p.residencyType) });
  if (p.ethnicities && p.ethnicities.length > 0) {
    items.push({ icon: 'people-outline', label: 'Ethnicity', value: p.ethnicities.map((e) => e.name).join(', ') });
  }
  if (p.nationality) items.push({ icon: 'globe-outline', label: 'Nationality', value: p.nationality });
  if (p.religion) items.push({ icon: 'mci:hands-pray', label: 'Religion', value: p.religion });
  if (p.educationLevel) items.push({ icon: 'school-outline', label: 'Education Level', value: p.educationLevel });
  if (p.occupation) items.push({ icon: 'briefcase-outline', label: 'Occupation', value: p.occupation });
  items.push({
    icon: 'heart-outline',
    label: 'Relationship Intention',
    value: formatEnum(p.relationshipIntention),
  });
  if (p.maritalStatus) {
    items.push({ icon: 'person-circle-outline', label: 'Marital Status', value: p.maritalStatus });
  }
  items.push({
    icon: 'people-circle-outline',
    label: 'Has Children',
    value: p.hasChildren ? 'Yes' : 'No',
  });
  items.push({
    icon: 'happy-outline',
    label: 'Wants Children',
    value: p.wantsChildren == null ? 'Not specified' : p.wantsChildren ? 'Yes' : 'No',
  });

  return items;
}

interface DetailsContentProps {
  profile: CurrentUserProfile;
}

export default function DetailsContent({ profile }: DetailsContentProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const details = buildDetails(profile);

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
