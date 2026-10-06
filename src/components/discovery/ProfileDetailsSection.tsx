import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CardDto } from '@/components/discovery/ProfileCard';
import { getCountryName } from '@/constants/countries';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDiscoveryInterests, getInterestEmoji, translateInterest } from '@/utils/interests';
import {
    FAMILY_INVOLVEMENT_API_TO_LABEL,
    LONG_DISTANCE_API_TO_LABEL,
    MARRIAGE_TIMELINE_API_TO_LABEL,
    RELIGION_IMPORTANCE_API_TO_LABEL,
    WILLING_TO_RELOCATE_API_TO_LABEL,
} from '@/utils/profileMappers';

function formatLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SMOKING_API_TO_KEY: Record<string, string> = {
  NO: 'discovery.details.no',
  YES: 'discovery.details.yes',
  OCCASIONALLY: 'discovery.details.occasionally',
  TRYING_TO_QUIT: 'discovery.details.tryingToQuit',
};

const DRINKING_API_TO_KEY: Record<string, string> = {
  NO: 'discovery.details.no',
  SOCIALLY: 'discovery.details.socially',
  OCCASIONALLY: 'discovery.details.occasionally',
  YES: 'discovery.details.yes',
};

const ACTIVITY_API_TO_KEY: Record<string, string> = {
  VERY_ACTIVE: 'discovery.details.activityActive',
  ACTIVE: 'discovery.details.activityActive',
  MODERATE: 'discovery.details.activityModerate',
  LIGHT: 'discovery.details.activityOccasional',
  SEDENTARY: 'discovery.details.activityRarely',
  PREFER_NOT_TO_SAY: 'discovery.details.preferNotToSay',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DetailItem {
  icon: string;
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
                      <Text style={[styles.chipText, { color: textCol }]}>
                        {getInterestEmoji(interest)} {translateInterest(interest, t)}
                      </Text>
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
    v == null ? null : v ? t('discovery.details.yes') : t('discovery.details.no');

  const smokingKey = card.smoking_detail
    ? SMOKING_API_TO_KEY[card.smoking_detail.toUpperCase()]
    : undefined;
  const smokingLabel = card.smoking_detail
    ? (smokingKey ? t(smokingKey) : formatLabel(card.smoking_detail))
    : boolLabel(card.smoking);
  const drinkingKey = card.drinking_detail
    ? DRINKING_API_TO_KEY[card.drinking_detail.toUpperCase()]
    : undefined;
  const drinkingLabel = card.drinking_detail
    ? (drinkingKey ? t(drinkingKey) : formatLabel(card.drinking_detail))
    : boolLabel(card.drinking);

  // ── Groups ──
  const basicItems: DetailItem[] = [
    card.gender    ? { icon: 'person-outline',  label: t('discovery.details.gender'),         value: formatLabel(card.gender) }                                              : null,
    card.height_cm ? { icon: 'resize-outline',  label: t('discovery.details.height'),         value: t('discovery.details.heightCm', { height: card.height_cm }) }           : null,
    card.residency_type ? { icon: 'home-outline', label: t('discovery.details.residencyType'),    value: formatLabel(card.residency_type) }                                  : null,
  ].filter(Boolean) as DetailItem[];

  const heritageItems: DetailItem[] = [
    (card.ethnicities && card.ethnicities.length > 0) ? { icon: 'people-outline',   label: t('discovery.details.ethnicity'),   value: card.ethnicities.map((e) => e.name).join(', ') } : null,
    card.nationality                                  ? { icon: 'flag-outline',     label: t('discovery.details.nationality'), value: /^[A-Z]{2}$/.test(card.nationality) ? getCountryName(card.nationality) : formatLabel(card.nationality) }                   : null,
    card.religion                                     ? { icon: 'mci:hands-pray',     label: t('discovery.details.religion'),    value: formatLabel(card.religion) }                      : null,
  ].filter(Boolean) as DetailItem[];

  const workItems: DetailItem[] = [
    card.education_level ? { icon: 'school-outline',    label: t('discovery.details.educationLevel'), value: formatLabel(card.education_level) } : null,
    card.occupation      ? { icon: 'briefcase-outline', label: t('discovery.details.occupation'),     value: card.occupation }                   : null,
  ].filter(Boolean) as DetailItem[];

  const relationshipItems: DetailItem[] = [
    card.relationship_intention ? { icon: 'heart-outline',         label: t('discovery.details.relationshipIntention'), value: formatLabel(card.relationship_intention) }       : null,
    card.marital_status         ? { icon: 'person-circle-outline', label: t('discovery.details.maritalStatus'),         value: formatLabel(card.marital_status) }                : null,
    boolLabel(card.has_children)   ? { icon: 'people-circle-outline', label: t('discovery.details.hasChildren'),   value: boolLabel(card.has_children)! }   : null,
    boolLabel(card.wants_children) ? { icon: 'happy-outline',         label: t('discovery.details.wantsChildren'), value: boolLabel(card.wants_children)! } : null,
  ].filter(Boolean) as DetailItem[];

  // Marriage & relationship prefs — read snake_case first, camelCase fallback;
  // map enum → display label, fall back to title-cased raw value.
  const pref = (
    snake: string | null | undefined,
    camel: string | null | undefined,
    map: Record<string, string>,
  ): string | null => {
    const raw = snake ?? camel;
    if (!raw) return null;
    return map[raw] ?? formatLabel(raw);
  };

  const marriageItems: DetailItem[] = [
    pref(card.marriage_timeline, card.marriageTimeline, MARRIAGE_TIMELINE_API_TO_LABEL)
      ? { icon: 'calendar-outline', label: t('profile.marriagePrefs.marriageTimeline'), value: pref(card.marriage_timeline, card.marriageTimeline, MARRIAGE_TIMELINE_API_TO_LABEL)! } : null,
    pref(card.long_distance_relationship, card.longDistanceRelationship, LONG_DISTANCE_API_TO_LABEL)
      ? { icon: 'airplane-outline', label: t('profile.marriagePrefs.longDistance'), value: pref(card.long_distance_relationship, card.longDistanceRelationship, LONG_DISTANCE_API_TO_LABEL)! } : null,
    pref(card.family_involvement, card.familyInvolvement, FAMILY_INVOLVEMENT_API_TO_LABEL)
      ? { icon: 'people-outline', label: t('profile.marriagePrefs.familyInvolvement'), value: pref(card.family_involvement, card.familyInvolvement, FAMILY_INVOLVEMENT_API_TO_LABEL)! } : null,
    pref(card.religion_importance, card.religionImportance, RELIGION_IMPORTANCE_API_TO_LABEL)
      ? { icon: 'leaf-outline', label: t('profile.marriagePrefs.religionImportance'), value: pref(card.religion_importance, card.religionImportance, RELIGION_IMPORTANCE_API_TO_LABEL)! } : null,
    pref(card.willing_to_relocate, card.willingToRelocate, WILLING_TO_RELOCATE_API_TO_LABEL)
      ? { icon: 'location-outline', label: t('profile.marriagePrefs.willingToRelocate'), value: pref(card.willing_to_relocate, card.willingToRelocate, WILLING_TO_RELOCATE_API_TO_LABEL)! } : null,
  ].filter(Boolean) as DetailItem[];

  const activityKey = card.activity_level
    ? ACTIVITY_API_TO_KEY[card.activity_level.toUpperCase()]
    : undefined;
  const activityLabel = card.activity_level
    ? (activityKey ? t(activityKey) : formatLabel(card.activity_level))
    : null;
  const lifestyleItems: DetailItem[] = [
    smokingLabel  ? { icon: 'ban-outline',           label: t('discovery.details.smoking'),         value: smokingLabel }  : null,
    drinkingLabel ? { icon: 'wine-outline',          label: t('discovery.details.drinking'),        value: drinkingLabel } : null,
    activityLabel ? { icon: 'fitness-outline',       label: t('discovery.details.fitness'),  value: activityLabel } : null,
    (card.languages && card.languages.length > 0) ? { icon: 'language-outline', label: t('discovery.details.languages'), value: card.languages.map((l) => l.name).join(', ') } : null,
    (card.interests && card.interests.length > 0) ? { icon: 'color-palette-outline', label: 'Interests', value: '' } : null,
  ].filter(Boolean) as DetailItem[];

  const groups: DetailGroup[] = [
    { title: t('discovery.details.groupBasic'),         items: basicItems },
    { title: t('discovery.details.groupHeritage'),      items: heritageItems },
    { title: t('discovery.details.groupEducationWork'), items: workItems },
    { title: t('discovery.details.groupRelationship'),  items: relationshipItems },
    { title: t('discovery.details.groupLifestyle'),     items: lifestyleItems },
    { title: t('profile.marriagePrefs.sectionTitle'),   items: marriageItems },
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
