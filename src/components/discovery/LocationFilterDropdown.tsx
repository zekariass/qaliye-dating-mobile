import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { colors, fontSize, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LocationFilter } from '@/types/discovery';

export type { LocationFilter };

interface Props {
  visible: boolean;
  current: LocationFilter;
  onSelect: (filter: LocationFilter) => void;
  onClose: () => void;
}

export function locationFilterLabel(filter: LocationFilter, t: (k: string) => string): string {
  switch (filter) {
    case 'NEARBY':   return t('discovery.locationFilter.nearby');
    case 'ETHIOPIA': return t('discovery.locationFilter.ethiopia');
    case 'ERITREA':  return t('discovery.locationFilter.eritrea');
    case 'DIASPORA': return t('discovery.locationFilter.diaspora');
    case 'ANYWHERE': return t('discovery.locationFilter.anywhere');
  }
}

// ---------------------------------------------------------------------------
export default function LocationFilterDropdown({ visible, current, onSelect, onClose }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  const options: {
    key: LocationFilter;
    iconName?: React.ComponentProps<typeof Ionicons>['name'];
    emoji?: string;
    labelKey: string;
    descKey: string;
  }[] = [
    { key: 'ANYWHERE', iconName: 'globe-outline',     labelKey: 'discovery.locationFilter.anywhere',  descKey: 'discovery.locationFilter.anywhereDesc' },
    { key: 'NEARBY',   iconName: 'location-outline', labelKey: 'discovery.locationFilter.nearby',    descKey: 'discovery.locationFilter.nearbyDesc' },
    { key: 'ETHIOPIA', emoji: '\u{1F1EA}\u{1F1F9}',   labelKey: 'discovery.locationFilter.ethiopia',  descKey: 'discovery.locationFilter.ethiopiaDesc' },
    { key: 'ERITREA',  emoji: '\u{1F1EA}\u{1F1F7}',   labelKey: 'discovery.locationFilter.eritrea',   descKey: 'discovery.locationFilter.eritreaDesc' },
    { key: 'DIASPORA', iconName: 'earth-outline',     labelKey: 'discovery.locationFilter.diaspora',  descKey: 'discovery.locationFilter.diasporaDesc' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.sheet, { backgroundColor: th.surface }]}>
          <View style={[styles.handle, { backgroundColor: th.border }]} />

          <Text style={[styles.title, { color: th.text }]}>{t('discovery.locationFilter.title')}</Text>
          <Text style={[styles.subtitle, { color: th.textSecondary }]}>Choose where you want to discover profiles</Text>

          <View style={styles.optionsList}>
            {options.map((opt) => {
              const active = current === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.card, { backgroundColor: th.backgroundElement, borderColor: th.border }, active && styles.cardActive]}
                  onPress={() => { onSelect(opt.key); onClose(); }}
                  activeOpacity={0.75}
                >
                  {/* Icon */}
                  <View style={[styles.iconWrap, { backgroundColor: th.backgroundSelected }, active && styles.iconWrapActive]}>
                    {opt.emoji ? (
                      <Text style={styles.emoji}>{opt.emoji}</Text>
                    ) : (
                      <Ionicons
                        name={opt.iconName!}
                        size={22}
                        color={active ? colors.primary : th.textSecondary}
                      />
                    )}
                  </View>

                  {/* Text */}
                  <View style={styles.rowText}>
                    <Text style={[styles.label, { color: th.text }, active && styles.labelActive]}>
                      {t(opt.labelKey)}
                    </Text>
                    <Text style={[styles.desc, { color: th.textSecondary }]}>{t(opt.descKey)}</Text>
                  </View>

                  {/* Check */}
                  {active ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={16} color={colors.surface} />
                    </View>
                  ) : (
                    <View style={[styles.unchecked, { borderColor: th.border }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Close button */}
          <TouchableOpacity style={styles.closePill} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closePillText}>Close</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 5, 18, 0.55)',
    justifyContent: 'flex-end',
  },

  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 36,
    gap: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
    marginTop: 2,
  },

  optionsList: {
    gap: 10,
    marginBottom: 14,
  },

  // Card row
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 12,
  },
  cardActive: {
    backgroundColor: colors.backgroundLavender,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },

  // Icon
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#E8D9FF',
  },
  emoji: {
    fontSize: 22,
    textAlign: 'center',
  },

  // Text
  rowText: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  labelActive: {
    color: colors.primary,
  },
  desc: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Check / unchecked
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  unchecked: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  // Close pill
  closePill: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: radius.full,
    backgroundColor: colors.blackTab,
    marginTop: 4,
  },
  closePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.surface,
    letterSpacing: 0.3,
  },
});
