import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import { CardDto } from '@/components/discovery/ProfileCard';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface DetailItem {
  icon: IoniconName;
  labelKey: string;
  value: string;
}

interface Props {
  card: CardDto;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const { width: W } = Dimensions.get('window');
const COL_GAP = 10;
const CARD_W = (W - spacing.md * 2 - COL_GAP) / 2;

// ---------------------------------------------------------------------------
// Icon mapping — matches CurrentUserProfileScreen style
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, IoniconName> = {
  gender:       'person-outline',
  height:       'resize-outline',
  residency:    'home-outline',
  ethnicity:    'people-outline',
  nationality:  'flag-outline',
  religion:     'leaf-outline',
  education:    'school-outline',
  occupation:   'briefcase-outline',
  relationship: 'heart-outline',
  marital:      'person-circle-outline',
  children:     'people-circle-outline',
  wchildren:    'happy-outline',
  smoking:      'ban-outline',
  drinking:     'wine-outline',
};

// ---------------------------------------------------------------------------
// Detail card (matches CurrentUserProfileScreen.DetailCard)
// ---------------------------------------------------------------------------
const DetailCard = memo(function DetailCard({
  icon, label, value, surfaceBg, iconBg, borderCol, textCol, mutedCol,
}: {
  icon: IoniconName;
  label: string;
  value: string;
  surfaceBg: string;
  iconBg: string;
  borderCol: string;
  textCol: string;
  mutedCol: string;
}) {
  return (
    <View style={[styles.detailCard, { width: CARD_W, backgroundColor: surfaceBg, borderColor: borderCol }]}>
      <View style={[styles.detailIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={styles.detailBody}>
        <Text style={[styles.detailLabel, { color: mutedCol }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.detailValue, { color: textCol }]} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ProfileDetailsSection({ card }: Props) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const detailSurface = isDark ? th.backgroundElement : th.surface;
  const detailIconBg  = isDark ? th.backgroundSelected : '#F3EEFF';

  const boolLabel = (v: boolean | undefined): string | null =>
    v == null ? null : v ? t('discovery.details.yes') : t('discovery.details.no');

  const maybeItems: Array<DetailItem | null> = [
    card.gender             ? { icon: ICON_MAP.gender,       labelKey: 'discovery.details.gender',                value: card.gender }           : null,
    card.height_cm          ? { icon: ICON_MAP.height,       labelKey: 'discovery.details.height',                value: t('discovery.details.heightCm', { height: card.height_cm }) } : null,
    card.residency_type     ? { icon: ICON_MAP.residency,    labelKey: 'discovery.details.residencyType',         value: card.residency_type }   : null,
    card.ethnicity          ? { icon: ICON_MAP.ethnicity,    labelKey: 'discovery.details.ethnicity',             value: card.ethnicity }        : null,
    card.nationality        ? { icon: ICON_MAP.nationality,  labelKey: 'discovery.details.nationality',           value: card.nationality }      : null,
    card.religion           ? { icon: ICON_MAP.religion,     labelKey: 'discovery.details.religion',              value: card.religion }         : null,
    card.education_level    ? { icon: ICON_MAP.education,    labelKey: 'discovery.details.educationLevel',        value: card.education_level }  : null,
    card.occupation         ? { icon: ICON_MAP.occupation,   labelKey: 'discovery.details.occupation',            value: card.occupation }       : null,
    card.relationship_intention ? { icon: ICON_MAP.relationship, labelKey: 'discovery.details.relationshipIntention', value: card.relationship_intention } : null,
    card.marital_status     ? { icon: ICON_MAP.marital,      labelKey: 'discovery.details.maritalStatus',         value: card.marital_status }   : null,
    boolLabel(card.has_children)   ? { icon: ICON_MAP.children,  labelKey: 'discovery.details.hasChildren',   value: boolLabel(card.has_children)! }  : null,
    boolLabel(card.wants_children) ? { icon: ICON_MAP.wchildren, labelKey: 'discovery.details.wantsChildren', value: boolLabel(card.wants_children)! } : null,
    boolLabel(card.smoking)  ? { icon: ICON_MAP.smoking,  labelKey: 'discovery.details.smoking',  value: boolLabel(card.smoking)! }  : null,
    boolLabel(card.drinking) ? { icon: ICON_MAP.drinking, labelKey: 'discovery.details.drinking', value: boolLabel(card.drinking)! } : null,
  ];

  const details: DetailItem[] = maybeItems.filter((x): x is DetailItem => x !== null);

  // Pair items into two-column rows (matches CurrentUserProfileScreen grid)
  const pairs = details.reduce<[DetailItem, DetailItem | null][]>((acc, item, i) => {
    if (i % 2 === 0) acc.push([item, details[i + 1] ?? null]);
    return acc;
  }, []);

  return (
    <View style={styles.container}>
      {/* ── About section ── */}
      {card.bio ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('discovery.aboutUser', { name: card.display_name })}
          </Text>
          <View style={[styles.bioCard, { backgroundColor: detailSurface, borderColor: th.border }]}>
            <Text style={[styles.bioText, { color: th.text }]}>{card.bio}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Prompt answers ── */}
      {card.prompt_answers && card.prompt_answers.length > 0 ? (
        <View style={styles.section}>
          {card.prompt_answers.map((pa, idx) => (
            <View key={idx} style={[styles.bioCard, { backgroundColor: detailSurface, borderColor: th.border }]}>
              <Text style={[styles.promptQuestion, { color: th.textMuted }]}>{pa.promptText}</Text>
              <Text style={[styles.bioText, { color: th.text }]}>{pa.answerText}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Profile details grid ── */}
      {details.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('discovery.profileDetails')}
          </Text>
          <View style={styles.grid}>
            {pairs.map(([left, right], idx) => (
              <View key={idx} style={styles.gridRow}>
                <DetailCard
                  icon={left.icon}
                  label={t(left.labelKey)}
                  value={left.value}
                  surfaceBg={detailSurface}
                  iconBg={detailIconBg}
                  borderCol={th.border}
                  textCol={th.text}
                  mutedCol={th.textMuted}
                />
                {right ? (
                  <DetailCard
                    icon={right.icon}
                    label={t(right.labelKey)}
                    value={right.value}
                    surfaceBg={detailSurface}
                    iconBg={detailIconBg}
                    borderCol={th.border}
                    textCol={th.text}
                    mutedCol={th.textMuted}
                  />
                ) : (
                  <View style={{ width: CARD_W }} />
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // Bio
  bioCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
  },
  promptQuestion: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: 6,
  },

  // Grid
  grid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: COL_GAP,
  },

  // Detail card — matches CurrentUserProfileScreen
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 9,
    minHeight: 62,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailBody: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
});
