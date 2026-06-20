import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  visible: boolean;
  name: string;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

export default function MatchCelebrationOverlay({ visible, name, onSendMessage, onKeepSwiping }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: th.surface }]}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={[styles.title, { color: th.text }]}>{t('discovery.itsAMatch')}</Text>
          <Text style={[styles.subtitle, { color: th.textSecondary }]}>{t('discovery.matchSubtitle', { name })}</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={onSendMessage} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>{t('discovery.sendMessage')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: th.border }]} onPress={onKeepSwiping} activeOpacity={0.8}>
            <Text style={[styles.secondaryBtnText, { color: th.textSecondary }]}>{t('discovery.keepSwiping')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_W * 0.78,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
