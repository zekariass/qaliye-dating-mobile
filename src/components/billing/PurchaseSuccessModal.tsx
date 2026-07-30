import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  featureName?: string;
  amount?: string;
}

export function PurchaseSuccessModal({
  visible,
  onClose,
  title,
  message,
  icon = 'checkmark-circle',
  featureName,
  amount,
}: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 14,
        stiffness: 120,
        mass: 0.8,
      });
      checkScale.value = withDelay(
        250,
        withSequence(
          withTiming(1.3, { duration: 200, easing: Easing.out(Easing.ease) }),
          withSpring(1, { damping: 12, stiffness: 200 }),
        ),
      );
      const timer = setTimeout(() => onClose(), 4000);
      return () => clearTimeout(timer);
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0, { duration: 150 });
      checkScale.value = 0;
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.card, { backgroundColor: th.surface }, cardStyle]}>
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

          {/* Animated checkmark circle */}
          <Animated.View style={[styles.iconCircle, checkStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name={icon} size={48} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Confetti dots */}
          <View style={styles.dotsRow}>
            <View style={[styles.dot, { backgroundColor: colors.secondaryLight }]} />
            <View style={[styles.dot, { backgroundColor: colors.primaryLight }]} />
            <View style={[styles.dot, { backgroundColor: colors.secondary }]} />
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <View style={[styles.dot, { backgroundColor: colors.primaryLight }]} />
          </View>

          <Text style={[styles.title, { color: th.text }]}>{title}</Text>

          <Text style={[styles.message, { color: th.textSecondary }]}>{message}</Text>

          {(featureName || amount) && (
            <View style={[styles.summaryRow, { backgroundColor: th.backgroundSelected }]}>
              {featureName && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: th.textSecondary }]}>{t('billing.plan', 'Plan')}</Text>
                  <Text style={[styles.summaryValue, { color: th.text }]}>{featureName}</Text>
                </View>
              )}
              {amount && (
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, { color: th.textSecondary }]}>{t('billing.quantity', 'Quantity')}</Text>
                  <Text style={[styles.summaryValue, { color: th.text }]}>{amount}</Text>
                </View>
              )}
            </View>
          )}

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.doneBtn,
              pressed && styles.doneBtnPressed,
            ]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneBtnGradient}
            >
              <Text style={styles.doneBtnText}>
                {t('common.done', 'Done')}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
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
    maxWidth: 360,
    borderRadius: radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
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
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  doneBtn: {
    borderRadius: 30,
    width: '100%',
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  doneBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  doneBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  doneBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
