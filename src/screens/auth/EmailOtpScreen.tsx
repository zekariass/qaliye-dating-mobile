import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ImageBackground,
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
import { colors, fontSize, spacing } from '@/constants/theme';
import { useEmailOtp } from '@/hooks/auth/useEmailOtp';

const BG_IMAGE = require('@/assets/images/auth-screen-bg.png');

const RESEND_COOLDOWN_SECONDS = 60;

function CodeIcon() {
  return <Text style={styles.inputIcon}>🔑</Text>;
}
function CheckIcon() {
  return <Text style={{ fontSize: 18, color: colors.surface }}>✓</Text>;
}
function ArrowIcon() {
  return <Text style={{ fontSize: 16, color: colors.surface, fontWeight: '700' }}>→</Text>;
}

type Props = { email: string; mode?: 'login' | 'signup' };

export default function EmailOtpScreen({ email, mode = 'signup' }: Props) {
  const { t } = useTranslation();
  const { verifyOtp, resendOtp } = useEmailOtp();

  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

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

  function getOtpErrorMessage(error: Error): string {
    const msg = error.message.toLowerCase();
    if (msg.includes('expired') || msg.includes('token has expired')) {
      return t('auth.emailOtpExpiredCode');
    }
    return t('auth.emailOtpInvalidCode');
  }

  async function handleVerify() {
    if (verifyOtp.isPending) return;
    setGeneralError('');
    setSuccessMessage('');
    if (!validateToken()) return;
    try {
      await verifyOtp.mutateAsync({ email, token });
      setSuccessMessage(t('auth.emailOtpVerified'));
      router.replace('/auth');
    } catch (e) {
      setGeneralError(getOtpErrorMessage(e as Error));
    }
  }

  async function handleResend() {
    if (resendCooldown > 0 || resendOtp.isPending) return;
    setGeneralError('');
    setSuccessMessage('');
    try {
      await resendOtp.mutateAsync(email);
      setSuccessMessage(t('auth.emailOtpResendSuccess'));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setGeneralError((e as Error).message);
    }
  }

  function handleBack() {
    router.replace('/auth');
  }

  const isVerifying = verifyOtp.isPending;
  const isResending = resendOtp.isPending;

  const ctaLabel = isVerifying
    ? t('auth.emailOtpVerifying')
    : t('auth.emailOtpVerify');

  const resendLabel = isResending
    ? t('auth.emailOtpResending')
    : resendCooldown > 0
    ? t('auth.emailOtpResendCooldown', { seconds: resendCooldown })
    : t('auth.emailOtpResendCode');

  return (
    <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
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
              <View style={styles.brandContainer}>
                <View style={styles.brandNameRow}>
                  <Text style={styles.brandNameText}>Qali</Text>
                  <View style={styles.brandIWrapper}>
                    <Text style={styles.brandHeartIcon}>♥</Text>
                    <Text style={styles.brandNameText}>ye</Text>
                  </View>
                </View>
                <View style={styles.decorDivider}>
                  <View style={styles.decorLine} />
                  <Text style={styles.decorHeart}>♥</Text>
                  <View style={styles.decorLine} />
                </View>
              </View>
            </View>

            {/* OTP form */}
            <View style={styles.formSection}>
              <View style={styles.headerRow}>
                <Text style={styles.shieldEmoji}>🛡️</Text>
                <Text style={styles.titleText}>{t('auth.emailOtpTitle')}</Text>
              </View>

              <Text style={styles.subtitleText}>{t('auth.emailOtpSubtitle')}</Text>
              <Text style={styles.emailText}>{email}</Text>

              <View style={styles.infoWrapper}>
                <InfoMessage
                  icon={<Text style={styles.infoIcon}>ℹ</Text>}
                  message={t('auth.emailOtpCheckSpam')}
                />
              </View>

              <View style={styles.inputWrapper}>
                <AuthTextInput
                  leftSlot={<CodeIcon />}
                  placeholder={t('auth.emailOtpEnterCode')}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={token}
                  onChangeText={(v) => {
                    setToken(v.replace(/\D/g, ''));
                    setTokenError('');
                    setGeneralError('');
                  }}
                  accessibilityLabel={t('auth.emailOtpEnterCode')}
                />
                {!!tokenError && <Text style={styles.fieldError}>{tokenError}</Text>}
              </View>

              <View style={styles.ctaWrapper}>
                <GradientButton
                  label={ctaLabel}
                  onPress={handleVerify}
                  leftIcon={<CheckIcon />}
                  rightIcon={<ArrowIcon />}
                  accessibilityLabel={t('auth.emailOtpVerify')}
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
                accessibilityLabel={t('auth.emailOtpResendCode')}
              >
                <Text
                  style={[
                    styles.resendText,
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
                accessibilityLabel={t('auth.emailOtpBackToSignup')}
              >
                <Text style={styles.backText}>
                  {mode === 'login' ? t('auth.emailOtpBackToLogin') : t('auth.emailOtpBackToSignup')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safeArea: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  heroSection: {
    height: 160,
    justifyContent: 'flex-start',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
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
    color: '#3B0068',
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
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  decorHeart: { fontSize: 11, color: colors.primary },

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
    color: colors.textPrimary,
  },
  subtitleText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 2,
  },
  emailText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  infoWrapper: { marginBottom: spacing.sm },
  infoIcon: { fontSize: 14, color: colors.primaryDark },
  inputWrapper: { marginBottom: spacing.xs + 2 },
  inputIcon: { fontSize: 18, color: colors.textMuted },
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
  centeredMessage: {
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  resendText: {
    fontSize: fontSize.sm,
    color: colors.primary,
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
    color: colors.textMuted,
  },
});
