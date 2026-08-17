import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type InsufficientCreditAction = {
  /** Icon name for the action (e.g. "arrow-undo", "star", "rocket") */
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Human-readable action name, e.g. "Rewind", "Super Like", "Boost" */
  actionName: string;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  action: InsufficientCreditAction;
  /** Current unified credit balance */
  creditBalance: number;
  /** Whether credits shop is enabled for the user's country */
  creditsEnabled?: boolean;
}

export function InsufficientCreditModal({
  visible,
  onClose,
  action,
  creditBalance,
  creditsEnabled = true,
}: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const router = useRouter();

  const handleBuyCredits = () => {
    onClose();
    router.push('/(app)/credits-shop' as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.card, { backgroundColor: th.surface }]}>
          {/* Close button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              { backgroundColor: pressed ? th.backgroundSelected : th.backgroundSelected, opacity: pressed ? 0.6 : 1 },
            ]}
            hitSlop={12}
          >
            <Ionicons name="close" size={20} color={th.textSecondary} />
          </Pressable>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <LinearGradient
              colors={[colors.warning, '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name={action.icon} size={36} color="#FFFFFF" />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: th.text }]}>
            {t('billing.insufficientCreditTitle', 'Insufficient Credits')}
          </Text>

          {/* Body */}
          <Text style={[styles.message, { color: th.textSecondary }]}>
            {t(
              'billing.insufficientCreditBody',
              'You have {{balance}} credits. {{action}} requires more credits. Buy more to continue.',
              { balance: creditBalance.toLocaleString(), action: action.actionName },
            )}
          </Text>

          {/* Current balance pill */}
          <View style={[styles.balancePill, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="wallet-outline" size={16} color={colors.primary} />
            <Text style={[styles.balanceText, { color: colors.primary }]}>
              {creditBalance.toLocaleString()} {t('billing.credits', 'credits')}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: th.border, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.secondaryBtnText, { color: th.textSecondary }]}>
                {t('common.cancel', 'Cancel')}
              </Text>
            </Pressable>

            {creditsEnabled && (
              <Pressable
                onPress={handleBuyCredits}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    {t('billing.buyCredits', 'Buy Credits')}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
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
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: spacing.lg,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  primaryBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
