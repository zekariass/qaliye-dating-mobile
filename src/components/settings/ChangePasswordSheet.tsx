import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthTextInput from '@/components/auth/AuthTextInput';
import GradientButton from '@/components/ui/GradientButton';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useForgotPassword } from '@/hooks/auth/useForgotPassword';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDarkMode = mode === 'dark';
  const { bottom: safeBottom } = useSafeAreaInsets();
  const { updatePassword } = useForgotPassword();

  const [currentPassword, setCurrentPassword] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [showNew, setShowNew] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const isPending = isVerifying || updatePassword.isPending;

  function reset() {
    setCurrentPassword('');
    setCurrentPasswordError('');
    setNewPassword('');
    setNewPasswordError('');
    setConfirmPassword('');
    setConfirmPasswordError('');
    setGeneralError('');
    setSuccess(false);
    setIsVerifying(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validate(): boolean {
    let ok = true;

    if (!currentPassword) {
      setCurrentPasswordError(t('auth.fieldRequired', 'This field is required.'));
      ok = false;
    } else {
      setCurrentPasswordError('');
    }

    if (newPassword.length < 6) {
      setNewPasswordError(t('auth.passwordTooShort'));
      ok = false;
    } else {
      setNewPasswordError('');
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError(t('auth.passwordMismatch'));
      ok = false;
    } else {
      setConfirmPasswordError('');
    }

    return ok;
  }

  async function handleSave() {
    if (isPending) return;
    setGeneralError('');

    if (!validate()) return;

    // Step 1: verify current password by re-signing in
    setIsVerifying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) throw new Error('no_email');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        setCurrentPasswordError(t('auth.changePasswordWrongCurrent'));
        setIsVerifying(false);
        return;
      }
    } catch {
      setGeneralError(t('auth.changePasswordError'));
      setIsVerifying(false);
      return;
    }
    setIsVerifying(false);

    // Step 2: update the password
    try {
      await updatePassword.mutateAsync(newPassword);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1600);
    } catch (e) {
      const msg = (e as Error).message.toLowerCase();
      setGeneralError(
        msg.includes('weak password') || msg.includes('at least')
          ? t('auth.passwordTooShort')
          : t('auth.changePasswordError'),
      );
    }
  }

  const ctaLabel = isPending
    ? t('auth.changePasswordSaving')
    : t('auth.changePasswordSave');

  const iconColor = th.textSecondary;
  // Use a darker border than the default theme border so the inputs are
  // clearly visible against the sheet surface in both light and dark modes.
  const inputBorderColor = isDarkMode ? '#4A3577' : '#C9B6E8';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={t('common.close', 'Close')}
        />

        <View
          style={[
            styles.sheet,
            { backgroundColor: th.surface, paddingBottom: safeBottom + spacing.xl },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: th.border }]} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: th.text }]}>
                {t('auth.changePasswordTitle')}
              </Text>
              <Text style={[styles.subtitle, { color: th.textSecondary }]}>
                {t('auth.changePasswordSubtitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.closeBtn, { backgroundColor: th.backgroundSelected }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', 'Close')}
            >
              <Ionicons name="close" size={18} color={th.text} />
            </TouchableOpacity>
          </View>

          {/* Success state */}
          {success ? (
            <View style={styles.successSection}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
              </View>
              <Text style={[styles.successText, { color: th.text }]}>
                {t('auth.changePasswordSuccess')}
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              {/* Current password */}
              <View style={styles.field}>
                <AuthTextInput
                  style={{ borderColor: inputBorderColor }}
                  leftSlot={<Ionicons name="lock-closed-outline" size={18} color={iconColor} />}
                  rightSlot={
                    <Ionicons
                      name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={iconColor}
                    />
                  }
                  onRightPress={() => setShowCurrent((p) => !p)}
                  placeholder={t('auth.currentPassword')}
                  secureTextEntry={!showCurrent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={currentPassword}
                  onChangeText={(v) => { setCurrentPassword(v); setCurrentPasswordError(''); setGeneralError(''); }}
                  accessibilityLabel={t('auth.currentPassword')}
                />
                {!!currentPasswordError && (
                  <Text style={styles.fieldError}>{currentPasswordError}</Text>
                )}
              </View>

              {/* New password */}
              <View style={styles.field}>
                <AuthTextInput
                  style={{ borderColor: inputBorderColor }}
                  leftSlot={<Ionicons name="lock-open-outline" size={18} color={iconColor} />}
                  rightSlot={
                    <Ionicons
                      name={showNew ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={iconColor}
                    />
                  }
                  onRightPress={() => setShowNew((p) => !p)}
                  placeholder={t('auth.newPassword')}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={newPassword}
                  onChangeText={(v) => { setNewPassword(v); setNewPasswordError(''); setGeneralError(''); }}
                  accessibilityLabel={t('auth.newPassword')}
                />
                {!!newPasswordError && (
                  <Text style={styles.fieldError}>{newPasswordError}</Text>
                )}
              </View>

              {/* Confirm password */}
              <View style={styles.field}>
                <AuthTextInput
                  style={{ borderColor: inputBorderColor }}
                  leftSlot={<Ionicons name="lock-open-outline" size={18} color={iconColor} />}
                  rightSlot={
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={iconColor}
                    />
                  }
                  onRightPress={() => setShowConfirm((p) => !p)}
                  placeholder={t('auth.confirmNewPassword')}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); setConfirmPasswordError(''); setGeneralError(''); }}
                  accessibilityLabel={t('auth.confirmNewPassword')}
                />
                {!!confirmPasswordError && (
                  <Text style={styles.fieldError}>{confirmPasswordError}</Text>
                )}
              </View>

              {!!generalError && (
                <View style={styles.errorBadge}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                  <Text style={styles.errorText}>{generalError}</Text>
                </View>
              )}

              <View style={styles.cta}>
                <GradientButton
                  label={ctaLabel}
                  onPress={handleSave}
                  isLoading={isPending}
                  disabled={isPending}
                  accessibilityLabel={t('auth.changePasswordSave')}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(26,6,51,0.55)',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  form: {
    gap: spacing.sm,
  },
  field: {
    gap: 4,
  },
  fieldError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    paddingHorizontal: spacing.xs,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: '500',
  },
  cta: {
    marginTop: spacing.xs,
  },
  successSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34,197,94,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    textAlign: 'center',
  },
});
