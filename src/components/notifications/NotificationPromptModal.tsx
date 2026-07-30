import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

export function NotificationPromptModal({
  visible,
  onEnable,
  onDismiss,
  isLoading = false,
}: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: th.surface }]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="notifications" size={36} color="#FFFFFF" />
          </LinearGradient>

          <Text style={[styles.title, { color: th.text }]}>
            {t('notifications.promptTitle', 'Never Miss a Match!')}
          </Text>

          <Text style={[styles.message, { color: th.textSecondary }]}>
            {t(
              'notifications.promptBody',
              'Get instant alerts when someone likes you, sends a message, or you get a new match. Turn on notifications so you never miss out.',
            )}
          </Text>

          <View style={styles.benefitsRow}>
            <View style={styles.benefitItem}>
              <Ionicons name="heart" size={16} color={colors.primary} />
              <Text style={[styles.benefitText, { color: th.textSecondary }]}>
                {t('notifications.promptBenefitLikes', 'New likes')}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="chatbubble" size={16} color={colors.primary} />
              <Text style={[styles.benefitText, { color: th.textSecondary }]}>
                {t('notifications.promptBenefitMessages', 'Messages')}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={[styles.benefitText, { color: th.textSecondary }]}>
                {t('notifications.promptBenefitMatches', 'Matches')}
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.enableBtn,
              pressed && styles.enableBtnPressed,
            ]}
            onPress={onEnable}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.enableBtnGradient}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="notifications" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.enableBtnText}>
                    {t('notifications.promptEnable', 'Enable Notifications')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dismissBtn,
              { borderColor: pressed ? colors.primary : th.border },
            ]}
            onPress={onDismiss}
          >
            <Text style={[styles.dismissBtnText, { color: th.textSecondary }]}>
              {t('notifications.promptNotNow', 'Not Now')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  benefitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: spacing.lg,
  },
  benefitItem: {
    alignItems: 'center',
    gap: 4,
  },
  benefitText: {
    fontSize: 11,
    fontWeight: '600',
  },
  enableBtn: {
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  enableBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  enableBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  enableBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
