import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
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
import GradientButton from '@/components/ui/GradientButton';
import { colors, fontSize, gradients, spacing } from '@/constants/theme';
import { useForgotPassword } from '@/hooks/auth/useForgotPassword';
import { useTheme } from '@/hooks/use-theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SendIcon() {
  return <Text style={{ fontSize: 18, color: colors.surface }}>✉</Text>;
}
function ArrowIcon() {
  return <Text style={{ fontSize: 16, color: colors.surface, fontWeight: '700' }}>→</Text>;
}

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { requestReset } = useForgotPassword();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [successEmail, setSuccessEmail] = useState('');

  function validateEmail(): boolean {
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setEmailError(t('auth.invalidEmail'));
      return false;
    }
    setEmailError('');
    return true;
  }

  async function handleSend() {
    if (requestReset.isPending) return;
    setGeneralError('');
    setSuccessEmail('');
    if (!validateEmail()) return;
    try {
      await requestReset.mutateAsync(email.trim());
      setSuccessEmail(email.trim());
    } catch (e) {
      const msg = (e as Error).message.toLowerCase();
      if (msg.includes('rate limit')) {
        setGeneralError('Too many requests. Please wait a moment and try again.');
      } else {
        setGeneralError(t('auth.forgotPasswordError'));
      }
    }
  }

  function handleBack() {
    router.replace('/auth');
  }

  const isPending = requestReset.isPending;
  const ctaLabel = isPending ? t('auth.forgotPasswordSending') : t('auth.forgotPasswordSend');

  return (
    <LinearGradient
      colors={isDark ? ['#0D0712', '#160F24', '#1A1230'] : gradients.splash}
      style={styles.bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
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

            {/* Form card */}
            <View style={[styles.card, { backgroundColor: isDark ? '#130B28' : '#FFFFFF' }]}>
              <View style={styles.headerRow}>
                <Text style={styles.lockEmoji}>🔒</Text>
                <Text style={[styles.titleText, { color: isDark ? th.text : colors.textPrimary }]}>
                  {t('auth.forgotPasswordTitle')}
                </Text>
              </View>

              <Text style={[styles.subtitleText, { color: th.textSecondary }]}>
                {t('auth.forgotPasswordSubtitle')}
              </Text>

              {!successEmail ? (
                <>
                  <View style={styles.inputWrapper}>
                    <AuthTextInput
                      leftSlot={<Ionicons name="mail-outline" size={18} color={isDark ? '#7B5EA7' : '#9B85C4'} />}
                      placeholder={t('auth.emailAddress')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      value={email}
                      onChangeText={(v) => {
                        setEmail(v);
                        setEmailError('');
                        setGeneralError('');
                      }}
                      accessibilityLabel={t('auth.emailAddress')}
                    />
                    {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
                  </View>

                  <View style={styles.ctaWrapper}>
                    <GradientButton
                      label={ctaLabel}
                      onPress={handleSend}
                      leftIcon={<SendIcon />}
                      rightIcon={<ArrowIcon />}
                      accessibilityLabel={t('auth.forgotPasswordSend')}
                      isLoading={isPending}
                      disabled={isPending}
                    />
                  </View>

                  {!!generalError && (
                    <View style={styles.errorBadge}>
                      <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                      <Text style={styles.errorText}>{generalError}</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.successSection}>
                  <View style={styles.successIconWrap}>
                    <Ionicons name="mail-outline" size={36} color={colors.primary} />
                  </View>
                  <Text style={[styles.successTitle, { color: isDark ? th.text : colors.textPrimary }]}>
                    {t('auth.forgotPasswordSuccess')}
                  </Text>
                  <Text style={styles.successEmail}>{successEmail}</Text>
                  <Text style={[styles.successHint, { color: th.textSecondary }]}>
                    {t('auth.forgotPasswordCheckSpam')}
                  </Text>
                </View>
              )}

              {/* Back to login */}
              <TouchableOpacity
                style={styles.backRow}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel={t('auth.forgotPasswordBackToLogin')}
              >
                <Ionicons name="arrow-back-outline" size={14} color={th.textSecondary} />
                <Text style={[styles.backText, { color: th.textSecondary }]}>
                  {t('auth.forgotPasswordBackToLogin')}
                </Text>
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
  safeArea: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  /* ── Brand hero ────────────────────────────────────────────────────── */
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

  /* ── Card ──────────────────────────────────────────────────────────── */
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  lockEmoji: { fontSize: 28 },
  titleText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  subtitleText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },

  inputWrapper: { marginBottom: spacing.xs + 2 },

  ctaWrapper: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: '500',
  },
  fieldError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },

  successSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(138,44,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  successTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  successHint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  backText: {
    fontSize: fontSize.sm,
  },
});
