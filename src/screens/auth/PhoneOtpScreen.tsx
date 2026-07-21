import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthTextInput from '@/components/auth/AuthTextInput';
import InfoMessage from '@/components/auth/InfoMessage';
import GradientButton from '@/components/ui/GradientButton';
import { colors, fontSize, gradients, radius, spacing } from '@/constants/theme';
import { usePhoneOtp } from '@/hooks/auth/usePhoneOtp';
import { useTheme } from '@/hooks/use-theme';

const RESEND_COOLDOWN_SECONDS = 60;

function CodeIcon({ color }: { color: string }) {
  return <Text style={[styles.inputIcon, { color }]}>🔑</Text>;
}
function CheckIcon() {
  return <Text style={{ fontSize: 18, color: colors.surface }}>✓</Text>;
}
function ArrowIcon() {
  return <Text style={{ fontSize: 16, color: colors.surface, fontWeight: '700' }}>→</Text>;
}

export default function PhoneOtpScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const params = useLocalSearchParams<{ phone?: string; display?: string }>();
  const phone = params.phone ?? '';
  const displayPhone = params.display ?? phone;

  const { verifyCode, sendCode } = usePhoneOtp();

  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [orb1Anim, orb2Anim]);

  const orb1TranslateY = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const orb1Scale = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const orb2TranslateY = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const orb2Scale = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] });

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  function validateToken(): boolean {
    if (!/^\d{6}$/.test(token)) {
      setTokenError(t('auth.invalidCode'));
      return false;
    }
    setTokenError('');
    return true;
  }

  function getVerifyErrorMessage(error: Error): string {
    const msg = error.message.toLowerCase();
    if (msg.includes('expired') || msg.includes('token has expired')) {
      return t('auth.phoneOtpExpiredCode');
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return t('auth.phoneOtpRateLimit');
    }
    return t('auth.phoneOtpInvalidCode');
  }

  function getResendErrorMessage(error: Error): string {
    const msg = error.message.toLowerCase();
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return t('auth.phoneOtpRateLimit');
    }
    return t('auth.phoneOtpSendFailed');
  }

  async function handleVerify() {
    if (verifyCode.isPending) return;
    setGeneralError('');
    setSuccessMessage('');
    if (!validateToken()) return;
    try {
      await verifyCode.mutateAsync({ phone, code: token });
      setSuccessMessage(t('auth.phoneOtpVerified'));
      router.replace('/auth');
    } catch (e) {
      setGeneralError(getVerifyErrorMessage(e as Error));
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || sendCode.isPending) return;
    setGeneralError('');
    setSuccessMessage('');
    try {
      await sendCode.mutateAsync(phone);
      setSuccessMessage(t('auth.phoneOtpResendSuccess'));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setGeneralError(getResendErrorMessage(e as Error));
    }
  }

  function handleBack() {
    router.replace('/phone-auth' as any);
  }

  const isVerifying = verifyCode.isPending;
  const isResending = sendCode.isPending;

  const ctaLabel = isVerifying
    ? t('auth.phoneOtpVerifying')
    : t('auth.phoneOtpVerify');

  const resendLabel = isResending
    ? t('auth.phoneOtpResending')
    : resendCooldown > 0
    ? t('auth.phoneOtpResendCooldown', { seconds: resendCooldown })
    : t('auth.phoneOtpResendCode');

  return (
    <LinearGradient
      colors={isDark ? ['#0D0712', '#160F24', '#1A1230'] : gradients.splash}
      style={styles.bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Animated.View
        style={[
          styles.orb,
          styles.orb1,
          { transform: [{ translateY: orb1TranslateY }, { scale: orb1Scale }] },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.orb,
          styles.orb2,
          { transform: [{ translateY: orb2TranslateY }, { scale: orb2Scale }] },
        ]}
        pointerEvents="none"
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand hero */}
            <View style={styles.heroSection}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.85)', borderColor: th.border }]}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={22} color={th.text} />
              </TouchableOpacity>

              <View style={styles.brandContainer}>
                <View style={styles.brandNameRow}>
                  <Text style={[styles.brandNameText, { color: isDark ? th.text : '#3B0068' }]}>Qali</Text>
                  <View style={styles.brandIWrapper}>
                    <Text style={styles.brandHeartIcon}>♥</Text>
                    <Text style={[styles.brandNameText, { color: isDark ? th.text : '#3B0068' }]}>ye</Text>
                  </View>
                </View>
                <View style={styles.decorDivider}>
                  <View style={[styles.decorLine, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.decorHeart, { color: colors.primary }]}>♥</Text>
                  <View style={[styles.decorLine, { backgroundColor: colors.primary }]} />
                </View>
              </View>
            </View>

            {/* OTP form */}
            <View style={styles.formSection}>
              <View style={styles.headerRow}>
                <Text style={styles.shieldEmoji}>📱</Text>
                <Text style={[styles.titleText, { color: th.text }]}>{t('auth.phoneOtpTitle')}</Text>
              </View>

              <Text style={[styles.subtitleText, { color: th.textMuted }]}>{t('auth.phoneOtpSubtitle')}</Text>
              <View style={styles.phoneDisplayRow}>
                <Text style={styles.flagText}>🇪🇹</Text>
                <Text style={[styles.phoneDisplayText, { color: colors.primary }]}>{displayPhone}</Text>
              </View>

              <View style={styles.infoWrapper}>
                <InfoMessage
                  icon={<Ionicons name="information-circle-outline" size={14} color={colors.primary} />}
                  message={t('auth.phoneOtpCheckSms')}
                />
              </View>

              <View style={styles.inputWrapper}>
                <AuthTextInput
                  leftSlot={<CodeIcon color={th.textMuted} />}
                  placeholder={t('auth.phoneOtpEnterCode')}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={token}
                  onChangeText={(v) => {
                    setToken(v.replace(/\D/g, ''));
                    setTokenError('');
                    setGeneralError('');
                  }}
                  onSubmitEditing={handleVerify}
                  returnKeyType="done"
                  accessibilityLabel={t('auth.phoneOtpEnterCode')}
                />
                {!!tokenError && <Text style={styles.fieldError}>{tokenError}</Text>}
              </View>

              <View style={styles.ctaWrapper}>
                <GradientButton
                  label={ctaLabel}
                  onPress={handleVerify}
                  leftIcon={<CheckIcon />}
                  rightIcon={<ArrowIcon />}
                  accessibilityLabel={t('auth.phoneOtpVerify')}
                  isLoading={isVerifying}
                  disabled={isVerifying}
                />
              </View>

              {!!generalError && (
                <Text style={[styles.fieldError, styles.centeredMessage]}>{generalError}</Text>
              )}
              {!!successMessage && (
                <Text style={[styles.successMessage, styles.centeredMessage]}>{successMessage}</Text>
              )}

              {/* Resend */}
              <TouchableOpacity
                style={styles.resendRow}
                onPress={handleResend}
                disabled={resendCooldown > 0 || isResending}
                accessibilityRole="button"
                accessibilityLabel={t('auth.phoneOtpResendCode')}
              >
                <Text
                  style={[
                    styles.resendText,
                    { color: colors.primary },
                    (resendCooldown > 0 || isResending) && styles.resendTextDisabled,
                  ]}
                >
                  {resendLabel}
                </Text>
              </TouchableOpacity>

              {/* Back */}
              <TouchableOpacity
                style={styles.backRow}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel={t('auth.phoneOtpBackToPhone')}
              >
                <Text style={[styles.backText, { color: th.textMuted }]}>{t('auth.phoneOtpBackToPhone')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  orb: {
    position: 'absolute',
    borderRadius: radius.full,
  },
  orb1: {
    width: 240,
    height: 240,
    top: -60,
    left: -70,
    backgroundColor: colors.secondary,
    opacity: 0.14,
  },
  orb2: {
    width: 210,
    height: 210,
    bottom: 80,
    right: -60,
    backgroundColor: colors.primaryLight,
    opacity: 0.16,
  },
  safeArea: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  heroSection: {
    height: 180,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  brandContainer: { maxWidth: '62%' },
  brandNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  brandNameText: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 60,
  },
  brandIWrapper: { alignItems: 'center', justifyContent: 'flex-end' },
  brandHeartIcon: {
    fontSize: 16,
    color: colors.heartPink,
    lineHeight: 20,
    marginBottom: 4,
  },
  decorDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  decorLine: {
    width: 28,
    height: 1.5,
    opacity: 0.55,
  },
  decorHeart: { fontSize: 11 },

  formSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  shieldEmoji: { fontSize: 28 },
  titleText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    flexShrink: 1,
  },
  subtitleText: {
    fontSize: fontSize.sm,
    marginBottom: 4,
  },
  phoneDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  flagText: { fontSize: 18 },
  phoneDisplayText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  infoWrapper: { marginBottom: spacing.sm },
  inputWrapper: { marginBottom: spacing.xs + 2 },
  inputIcon: { fontSize: 18 },
  ctaWrapper: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  fieldError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },
  successMessage: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  centeredMessage: { textAlign: 'center' },
  resendRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  resendText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  resendTextDisabled: { opacity: 0.5 },
  backRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  backText: {
    fontSize: fontSize.sm,
  },
});
