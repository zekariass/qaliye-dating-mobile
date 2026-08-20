import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

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
  group, surfaceBg, iconBg, borderCol, textCol, mutedCol, card, t, isDark,
}: {
  group: DetailGroup;
  surfaceBg: string;
  iconBg: string;
  borderCol: string;
  textCol: string;
  mutedCol: string;
  card: CardDto;
  t: ReturnType<typeof useTranslation>['t'];
  isDark: boolean;
}) {
  const regularItems = group.items.filter((i) => i.label !== 'Interests');
  const { visible: visibleInterests, remaining: remainingInterests } = getDiscoveryInterests(card.interests);
  const hasInterests = group.items.some((i) => i.label === 'Interests') && visibleInterests.length > 0;
  const hasContent = regularItems.length > 0 || (hasInterests && visibleInterests.length > 0);

  if (!hasContent) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionAccent} />
        <Text style={[styles.sectionLabel, { color: colors.primary }]}>{group.title}</Text>
      </View>
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
        {regularItems.map((item, idx) => (
          <View key={item.label}>
            {idx > 0 && <View style={[styles.divider, { backgroundColor: borderCol }]} />}
            <View style={styles.listRow}>
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                <Ionicons name={item.icon} size={17} color={colors.primary} />
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
              <View style={[styles.detailIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                <Ionicons name="color-palette-outline" size={17} color={colors.primary} />
              </View>
              <View style={[styles.detailBody, { gap: 8 }]}>
                <Text style={[styles.detailLabel, { color: mutedCol }]}>{t('interests.label')}</Text>
                <View style={styles.chipWrap}>
                  {visibleInterests.map((interest) => (
                    <View key={interest} style={[styles.chip, { backgroundColor: iconBg, borderColor: borderCol }]}>
                      <Text style={[styles.chipText, { color: textCol }]}>{translateInterest(interest, t)}</Text>
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

  const detailSurface = isDark ? th.surface : th.surface;
  const detailIconBg  = isDark ? th.backgroundSelected : '#F3EEFF';
  const mutedBorder   = isDark ? 'rgba(46,31,80,0.22)' : 'rgba(233,221,248,0.5)';

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
    activityLabel ? { icon: 'fitness-outline',       label: 'Fitness',  value: activityLabel } : null,
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
          <View style={styles.sectionHeader}>
            <View style={styles.sectionAccent} />
            <Text style={[styles.sectionTitle, { color: th.text }]}>
              {t('discovery.aboutUser', { name: card.display_name })}
            </Text>
          </View>
          <View
            style={[
              styles.bioCard,
              {
                backgroundColor: detailSurface,
                borderColor: mutedBorder,
                ...Platform.select({
                  ios: { shadowColor: '#8A2CFF', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
                  android: { elevation: 3 },
                }) as any,
              },
            ]}
          >
            <View style={styles.bioAccentBar} />
            <View style={styles.bioContent}>
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={colors.primary}
                style={styles.bioQuoteIcon}
              />
              <Text style={[styles.bioText, { color: th.text }]}>{card.bio}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── Prompt answers ── */}
      {card.prompt_answers && card.prompt_answers.length > 0 ? (
        <View style={styles.section}>
          {card.prompt_answers.map((pa, idx) => (
            <View
              key={idx}
              style={[
                styles.promptCard,
                {
                  backgroundColor: detailSurface,
                  borderColor: mutedBorder,
                  ...Platform.select({
                    ios: { shadowColor: '#8A2CFF', shadowOpacity: isDark ? 0.12 : 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
                    android: { elevation: 2 },
                  }) as any,
                },
              ]}
            >
              <View style={styles.promptAccentBar} />
              <View style={styles.promptContent}>
                <View style={styles.promptHeader}>
                  <Ionicons name="sparkles" size={14} color={colors.secondary} />
                  <Text style={[styles.promptQuestion, { color: th.textMuted }]}>{pa.promptText}</Text>
                </View>
                <Text style={[styles.bioText, { color: th.text }]}>{pa.answerText}</Text>
              </View>
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
          isDark={isDark}
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
    paddingTop: 20,
    gap: 22,
  },
  section: {
    gap: 10,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 2,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Bio card
  bioCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bioAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  bioContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingLeft: 20,
    gap: 10,
  },
  bioQuoteIcon: {
    marginTop: 3,
    flexShrink: 0,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 23,
    flex: 1,
  },

  // Prompt card
  promptCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  promptAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.secondary,
  },
  promptContent: {
    padding: 16,
    paddingLeft: 20,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  promptQuestion: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.15,
    flex: 1,
  },

  // List card container
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

  // Interest chips
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
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
