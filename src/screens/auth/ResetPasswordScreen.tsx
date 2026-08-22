import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
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
import { supabase } from '@/lib/supabase';

type ScreenStatus = 'checking' | 'ready' | 'error';

function LockIcon() {
  return <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />;
}
function CheckIcon() {
  return <Text style={{ fontSize: 18, color: colors.surface }}>✓</Text>;
}
function ArrowIcon() {
  return <Text style={{ fontSize: 16, color: colors.surface, fontWeight: '700' }}>→</Text>;
}

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { updatePassword } = useForgotPassword();

  // Verify we have an active recovery session before showing the form.
  // By the time we reach this screen the session has already been established
  // by callback.tsx or the _layout.tsx fallback handler.
  const [screenStatus, setScreenStatus] = useState<ScreenStatus>('checking');
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setScreenStatus('ready');
      } else {
        setSessionError(t('auth.resetPasswordInvalidLink'));
        setScreenStatus('error');
      }
    });
  }, [t]);

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState(false);

  function validatePassword(): boolean {
    if (newPassword.length < 6) {
      setNewPasswordError(t('auth.passwordTooShort'));
      return false;
    }
    setNewPasswordError('');
    return true;
  }

  function validateConfirm(): boolean {
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError(t('auth.passwordMismatch'));
      return false;
    }
    setConfirmPasswordError('');
    return true;
  }

  async function handleSave() {
    if (updatePassword.isPending) return;
    setGeneralError('');
    const pwOk = validatePassword();
    const cfOk = validateConfirm();
    if (!pwOk || !cfOk) return;

    try {
      await updatePassword.mutateAsync(newPassword);
      setSuccess(true);
      setTimeout(() => { router.replace('/auth'); }, 1800);
    } catch (e) {
      const msg = (e as Error).message.toLowerCase();
      setGeneralError(
        msg.includes('weak password') || msg.includes('at least')
          ? t('auth.passwordTooShort')
          : (e as Error).message,
      );
    }
  }

  function handleBack() {
    router.replace('/auth');
  }

  const isPending = updatePassword.isPending;
  const ctaLabel = isPending ? t('auth.resetPasswordSaving') : t('auth.resetPasswordSave');
  const iconColor = isDark ? '#7B5EA7' : '#9B85C4';

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

            {/* Card */}
            <View style={[styles.card, { backgroundColor: isDark ? '#130B28' : '#FFFFFF' }]}>
              <View style={styles.headerRow}>
                <Text style={styles.shieldEmoji}>🛡️</Text>
                <Text style={[styles.titleText, { color: isDark ? th.text : colors.textPrimary }]}>
                  {t('auth.resetPasswordTitle')}
                </Text>
              </View>

              {/* Checking session */}
              {screenStatus === 'checking' && (
                <View style={styles.centeredState}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.processingText, { color: th.textSecondary }]}>
                    {t('auth.resetPasswordLinkProcessing')}
                  </Text>
                </View>
              )}

              {/* Invalid / expired link */}
              {screenStatus === 'error' && (
                <View style={styles.centeredState}>
                  <View style={styles.errorIconWrap}>
                    <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
                  </View>
                  <Text style={styles.errorStateText}>{sessionError}</Text>
                  <TouchableOpacity style={styles.backRow} onPress={handleBack} accessibilityRole="button">
                    <Ionicons name="arrow-back-outline" size={14} color={th.textSecondary} />
                    <Text style={[styles.backText, { color: th.textSecondary }]}>
                      {t('auth.resetPasswordBackToLogin')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Password form */}
              {screenStatus === 'ready' && !success && (
                <>
                  <Text style={[styles.subtitleText, { color: th.textSecondary }]}>
                    {t('auth.resetPasswordSubtitle')}
                  </Text>

                  <View style={styles.inputWrapper}>
                    <AuthTextInput
                      leftSlot={<LockIcon />}
                      rightSlot={
                        <Ionicons
                          name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={iconColor}
                        />
                      }
                      onRightPress={() => setShowNewPassword((p) => !p)}
                      placeholder={t('auth.newPassword')}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={newPassword}
                      onChangeText={(v) => { setNewPassword(v); setNewPasswordError(''); setGeneralError(''); }}
                      accessibilityLabel={t('auth.newPassword')}
                    />
                    {!!newPasswordError && <Text style={styles.fieldError}>{newPasswordError}</Text>}
                  </View>

                  <View style={styles.inputWrapper}>
                    <AuthTextInput
                      leftSlot={<LockIcon />}
                      rightSlot={
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={iconColor}
                        />
                      }
                      onRightPress={() => setShowConfirmPassword((p) => !p)}
                      placeholder={t('auth.confirmNewPassword')}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); setConfirmPasswordError(''); setGeneralError(''); }}
                      accessibilityLabel={t('auth.confirmNewPassword')}
                    />
                    {!!confirmPasswordError && <Text style={styles.fieldError}>{confirmPasswordError}</Text>}
                  </View>

                  <View style={styles.ctaWrapper}>
                    <GradientButton
                      label={ctaLabel}
                      onPress={handleSave}
                      leftIcon={<CheckIcon />}
                      rightIcon={<ArrowIcon />}
                      accessibilityLabel={t('auth.resetPasswordSave')}
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

                  <TouchableOpacity
                    style={styles.backRow}
                    onPress={handleBack}
                    accessibilityRole="button"
                    accessibilityLabel={t('auth.resetPasswordBackToLogin')}
                  >
                    <Ionicons name="arrow-back-outline" size={14} color={th.textSecondary} />
                    <Text style={[styles.backText, { color: th.textSecondary }]}>
                      {t('auth.resetPasswordBackToLogin')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Success */}
              {success && (
                <View style={styles.centeredState}>
                  <View style={styles.successIconWrap}>
                    <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
                  </View>
                  <Text style={[styles.successText, { color: isDark ? th.text : colors.textPrimary }]}>
                    {t('auth.resetPasswordSuccess')}
                  </Text>
                </View>
              )}
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
  shieldEmoji: { fontSize: 28 },
  titleText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  subtitleText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },

  centeredState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  processingText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorStateText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34,197,94,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    textAlign: 'center',
  },

  inputWrapper: { marginBottom: spacing.sm },

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
