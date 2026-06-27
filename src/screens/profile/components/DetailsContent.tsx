import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrentUserProfile } from '../mockCurrentUserProfile';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface DetailItem {
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
  if (p.ethnicity) items.push({ icon: 'people-outline', label: 'Ethnicity', value: p.ethnicity });
  if (p.nationality) items.push({ icon: 'globe-outline', label: 'Nationality', value: p.nationality });
  if (p.religion) items.push({ icon: 'leaf-outline', label: 'Religion', value: p.religion });
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

interface DetailCellProps {
  item: DetailItem;
  cardBg: string;
  iconBg: string;
  borderColor: string;
  labelColor: string;
  valueColor: string;
}

const DetailCell = memo(function DetailCell({
  item,
  cardBg,
  iconBg,
  borderColor,
  labelColor,
  valueColor,
}: DetailCellProps) {
  return (
    <View style={[styles.cell, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
        <Ionicons name={item.icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.cellLabel, { color: labelColor }]}>{item.label}</Text>
      <Text style={[styles.cellValue, { color: valueColor }]} numberOfLines={2}>
        {item.value}
      </Text>
    </View>
  );
});

interface DetailsContentProps {
  profile: CurrentUserProfile;
}

export default function DetailsContent({ profile }: DetailsContentProps) {
  const { colors: th } = useTheme();
  const details = buildDetails(profile);

  const cardBg = th.surface;
  const iconBg = th.backgroundSelected;
  const borderColor = th.border;
  const labelColor = th.textSecondary;
  const valueColor = th.text;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {details.map((item, idx) => (
          <DetailCell
            key={idx}
            item={item}
            cardBg={cardBg}
            iconBg={iconBg}
            borderColor={borderColor}
            labelColor={labelColor}
            valueColor={valueColor}
          />
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
    gap: 10,
  },
  cell: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 3,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  cellValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
