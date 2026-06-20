import { useTranslation } from 'react-i18next';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

export type DiscoveryMode = 'STANDARD' | 'GLOBAL' | 'INCOGNITO';

interface Props {
  visible: boolean;
  current: DiscoveryMode;
  onSelect: (mode: DiscoveryMode) => void;
  onClose: () => void;
}

export default function DiscoveryModeDropdown({ visible, current, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  const modes: { key: DiscoveryMode; label: string; icon: string }[] = [
    { key: 'STANDARD', label: 'Standard', icon: '📍' },
    { key: 'GLOBAL', label: 'Global', icon: '🌍' },
    { key: 'INCOGNITO', label: 'Incognito', icon: '🕶' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Discovery Mode</Text>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.row, current === m.key && styles.rowActive]}
              onPress={() => { onSelect(m.key); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{m.icon}</Text>
              <Text style={[styles.label, current === m.key && styles.labelActive]}>{m.label}</Text>
              {current === m.key && <Text style={styles.check}>✓</Text>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  rowActive: {
    backgroundColor: colors.backgroundLavender,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
    color: colors.primary,
  },
  check: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  closeText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
