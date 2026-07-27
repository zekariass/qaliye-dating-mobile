import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { CardDto } from '@/components/discovery/ProfileCard';
import { getCountryName } from '@/constants/countries';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDiscoveryInterests, translateInterest } from '@/utils/interests';

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SMOKING_API_TO_LABEL: Record<string, string> = {
  NO: 'No',
  YES: 'Yes',
  OCCASIONALLY: 'Occasionally',
  TRYING_TO_QUIT: 'Trying to quit',
};

const DRINKING_API_TO_LABEL: Record<string, string> = {
  NO: 'No',
  SOCIALLY: 'Socially',
  OCCASIONALLY: 'Occasionally',
  YES: 'Yes',
};

const ACTIVITY_API_TO_LABEL: Record<string, string> = {
  SEDENTARY: 'Sedentary',
  LIGHT: 'Light',
  MODERATE: 'Moderate',
  ACTIVE: 'Active',
  VERY_ACTIVE: 'Very active',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface DetailItem {
  icon: IoniconName;
  label: string;
  value: string;
}

interface DetailGroup {
  title: string;
  items: DetailItem[];
}

interface Props {
  card: CardDto;
}

// ---------------------------------------------------------------------------
// Section renderer — full-width list with dividers inside a single card
// ---------------------------------------------------------------------------
function SectionGroup({
  group, surfaceBg, iconBg, borderCol, textCol, mutedCol, card, t,
}: {
  group: DetailGroup;
  surfaceBg: string;
  iconBg: string;
  borderCol: string;
  textCol: string;
  mutedCol: string;
  card: CardDto;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const regularItems = group.items.filter((i) => i.label !== 'Interests');
  const { visible: visibleInterests, remaining: remainingInterests } = getDiscoveryInterests(card.interests);
  const hasInterests = group.items.some((i) => i.label === 'Interests') && visibleInterests.length > 0;
  const hasContent = regularItems.length > 0 || (hasInterests && visibleInterests.length > 0);

  if (!hasContent) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.primary }]}>{group.title}</Text>
      <View style={[styles.listCard, { backgroundColor: surfaceBg, borderColor: borderCol }]}>
        {regularItems.map((item, idx) => (
          <View key={item.label}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
            <View style={styles.listRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name={item.icon} size={16} color={colors.primary} />
              </View>
              <View style={styles.detailBody}>
                <Text style={[styles.detailLabel, { color: mutedCol }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: textCol }]}>{item.value}</Text>
              </View>
            </View>
          </View>
        ))}
        {hasInterests && visibleInterests.length > 0 && (
          <View>
            {regularItems.length > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
            <View style={styles.listRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
              </View>
              <View style={[styles.detailBody, { gap: 6 }]}>
                <Text style={[styles.detailLabel, { color: mutedCol }]}>{t('interests.label')}</Text>
                <View style={styles.chipWrap}>
                  {visibleInterests.map((interest) => (
                    <View key={interest} style={[styles.chip, { backgroundColor: iconBg, borderColor: borderCol }]}>
                      <Text style={[styles.chipText, { color: colors.primary }]}>{translateInterest(interest, t)}</Text>
                    </View>
                  ))}
                  {remainingInterests > 0 && (
                    <View style={[styles.chip, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
                      <Text style={[styles.chipMore, { color: mutedCol }]}>{t('interests.moreCount', { count: remainingInterests })}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ProfileDetailsSection({ card }: Props) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const detailSurface = th.background;
  const detailIconBg  = isDark ? th.backgroundSelected : '#F3EEFF';
  const mutedBorder   = isDark ? 'rgba(46,31,80,0.25)' : 'rgba(233,221,248,0.35)';

  const boolLabel = (v: boolean | undefined | null): string | null =>
    v == null ? null : v ? 'Yes' : 'No';

  const smokingLabel = card.smoking_detail
    ? (SMOKING_API_TO_LABEL[card.smoking_detail.toUpperCase()] ?? formatLabel(card.smoking_detail))
    : boolLabel(card.smoking);
  const drinkingLabel = card.drinking_detail
    ? (DRINKING_API_TO_LABEL[card.drinking_detail.toUpperCase()] ?? formatLabel(card.drinking_detail))
    : boolLabel(card.drinking);

  // ── Groups ──
  const basicItems: DetailItem[] = [
    card.gender    ? { icon: 'person-outline',  label: 'Gender',         value: formatLabel(card.gender) }                                              : null,
    card.height_cm ? { icon: 'resize-outline',  label: 'Height',         value: `${card.height_cm} cm` }                                               : null,
    card.residency_type ? { icon: 'home-outline', label: 'Residency',    value: formatLabel(card.residency_type) }                                      : null,
  ].filter(Boolean) as DetailItem[];

  const heritageItems: DetailItem[] = [
    (card.ethnicities && card.ethnicities.length > 0) ? { icon: 'people-outline',   label: 'Ethnicity',   value: card.ethnicities.map((e) => e.name).join(', ') } : null,
    card.nationality                                  ? { icon: 'flag-outline',     label: 'Nationality', value: /^[A-Z]{2}$/.test(card.nationality) ? getCountryName(card.nationality) : formatLabel(card.nationality) }                   : null,
    card.religion                                     ? { icon: 'leaf-outline',     label: 'Religion',    value: formatLabel(card.religion) }                      : null,
  ].filter(Boolean) as DetailItem[];

  const workItems: DetailItem[] = [
    card.education_level ? { icon: 'school-outline',    label: 'Education', value: formatLabel(card.education_level) } : null,
    card.occupation      ? { icon: 'briefcase-outline', label: 'Work',      value: card.occupation }                   : null,
  ].filter(Boolean) as DetailItem[];

  const relationshipItems: DetailItem[] = [
    card.relationship_intention ? { icon: 'heart-outline',         label: 'Intention',      value: formatLabel(card.relationship_intention) }       : null,
    card.marital_status         ? { icon: 'person-circle-outline', label: 'Marital status', value: formatLabel(card.marital_status) }                : null,
    boolLabel(card.has_children)   ? { icon: 'people-circle-outline', label: 'Has children',   value: boolLabel(card.has_children)! }   : null,
    boolLabel(card.wants_children) ? { icon: 'happy-outline',         label: 'Wants children', value: boolLabel(card.wants_children)! } : null,
  ].filter(Boolean) as DetailItem[];

  const activityLabel = card.activity_level
    ? (ACTIVITY_API_TO_LABEL[card.activity_level.toUpperCase()] ?? formatLabel(card.activity_level))
    : null;
  const lifestyleItems: DetailItem[] = [
    smokingLabel  ? { icon: 'ban-outline',           label: 'Smoking',         value: smokingLabel }  : null,
    drinkingLabel ? { icon: 'wine-outline',          label: 'Drinking',        value: drinkingLabel } : null,
    activityLabel ? { icon: 'fitness-outline',       label: 'Activity level',  value: activityLabel } : null,
    (card.languages && card.languages.length > 0) ? { icon: 'language-outline', label: 'Languages', value: card.languages.map((l) => l.name).join(', ') } : null,
    (card.interests && card.interests.length > 0) ? { icon: 'color-palette-outline', label: 'Interests', value: '' } : null,
  ].filter(Boolean) as DetailItem[];

  const groups: DetailGroup[] = [
    { title: 'Basic Information', items: basicItems },
    { title: 'Heritage',          items: heritageItems },
    { title: 'Education & Work',  items: workItems },
    { title: 'Relationship',      items: relationshipItems },
    { title: 'Lifestyle',         items: lifestyleItems },
  ];

  return (
    <View style={styles.container}>
      {/* ── About section ── */}
      {card.bio ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: th.text }]}>
            {t('discovery.aboutUser', { name: card.display_name })}
          </Text>
          <View style={[styles.bioCard, { backgroundColor: detailSurface, borderColor: mutedBorder }]}>
            <Text style={[styles.bioText, { color: th.text }]}>{card.bio}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Prompt answers ── */}
      {card.prompt_answers && card.prompt_answers.length > 0 ? (
        <View style={styles.section}>
          {card.prompt_answers.map((pa, idx) => (
            <View key={idx} style={[styles.bioCard, { backgroundColor: detailSurface, borderColor: mutedBorder }]}>
              <Text style={[styles.promptQuestion, { color: th.textMuted }]}>{pa.promptText}</Text>
              <Text style={[styles.bioText, { color: th.text }]}>{pa.answerText}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* ── Grouped detail sections ── */}
      {groups.map((group) => (
        <SectionGroup
          key={group.title}
          group={group}
          surfaceBg={detailSurface}
          iconBg={detailIconBg}
          borderCol={mutedBorder}
          textCol={th.text}
          mutedCol={th.textSecondary}
          card={card}
          t={t}
        />
      ))}
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
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Bio
  bioCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 14,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 23,
  },
  promptQuestion: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: 6,
  },

  // List card container
  listCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
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
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipMore: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
