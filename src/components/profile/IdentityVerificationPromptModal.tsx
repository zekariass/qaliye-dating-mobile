import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// IdentityVerificationPromptModal
// ---------------------------------------------------------------------------
// Shown contextually after Like / Super Like actions when the user has not
// yet verified their identity.  The action itself is never blocked — this is
// a soft nudge only.
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onVerifyNow: () => void;
  onDismiss: () => void;
}

export function IdentityVerificationPromptModal({ visible, onVerifyNow, onDismiss }: Props) {
  const { colors: th } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: th.surface }]}>
          {/* Icon */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
          </LinearGradient>

          {/* Content */}
          <Text style={[styles.title, { color: th.text }]}>Verify Your Identity</Text>

          <Text style={[styles.message, { color: th.textSecondary }]}>
            Build trust and help keep Qaliye safe by verifying your identity.
          </Text>

          {/* Primary CTA */}
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={onVerifyNow}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryBtnText}>Verify Now</Text>
            </LinearGradient>
          </Pressable>

          {/* Secondary — dismiss */}
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: pressed ? colors.primary : th.border },
            ]}
            onPress={onDismiss}
          >
            <Text style={[styles.secondaryBtnText, { color: th.textSecondary }]}>
              Maybe Later
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
    marginBottom: spacing.lg,
  },
  primaryBtn: {
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
  primaryBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1.5,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
