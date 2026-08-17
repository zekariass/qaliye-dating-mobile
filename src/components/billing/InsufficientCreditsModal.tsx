import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useInsufficientCreditsStore } from '@/stores/insufficient-credits-store';
import { useTheme } from '@/hooks/use-theme';

export function InsufficientCreditsModal() {
  const { colors: th } = useTheme();
  const router = useRouter();
  const visible = useInsufficientCreditsStore((s) => s.visible);
  const message = useInsufficientCreditsStore((s) => s.message);
  const dismiss = useInsufficientCreditsStore((s) => s.dismiss);

  const handleBuyCredits = useCallback(() => {
    dismiss();
    router.push('/(app)/credits-shop' as any);
  }, [dismiss, router]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      <Pressable style={styles.overlay} onPress={dismiss}>
        <Pressable
          style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="diamond-outline" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: th.text }]}>Insufficient Credits</Text>

          <Text style={[styles.message, { color: th.textSecondary }]}>
            {message}
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.buttonSecondary, { borderColor: th.border }]}
              onPress={dismiss}
            >
              <Text style={[styles.buttonText, { color: th.textSecondary }]}>Close</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleBuyCredits}
            >
              <Ionicons name="cart-outline" size={16} color="#fff" />
              <Text style={styles.buttonPrimaryText}>Buy Credits</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 120,
  },
  buttonSecondary: {
    borderWidth: 1,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
