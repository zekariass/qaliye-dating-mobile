import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthSegmentedControl, { AuthTab } from '@/components/auth/AuthSegmentedControl';
import AuthTextInput from '@/components/auth/AuthTextInput';
import SocialAuthButton from '@/components/auth/SocialAuthButton';
import GradientButton from '@/components/ui/GradientButton';
import { colors, fontSize, spacing } from '@/constants/theme';
import { useAuthError } from '@/hooks/auth/useAuthError';
import { useEmailAuth } from '@/hooks/auth/useEmailAuth';
import { useSocialAuth } from '@/hooks/auth/useSocialAuth';

const BG_IMAGE = require('@/assets/images/auth-screen-bg.png');

function EmailInputIcon() {
  return <Text style={styles.inputIcon}>✉</Text>;
}
function LockIcon() {
  return <Text style={styles.inputIcon}>🔒</Text>;
}
function AppleIcon() {
  return <Text style={{ fontSize: 18 }}>📱</Text>;
}
function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleLetter}>G</Text>
    </View>
  );
}
function FacebookIcon() {
  return (
    <View style={styles.facebookIcon}>
      <Text style={styles.facebookLetter}>f</Text>
    </View>
  );
}
function ShieldIcon() {
  return <Text style={{ fontSize: 18, color: colors.primary }}>🛡</Text>;
}
function HeartButtonIcon() {
  return <Text style={{ fontSize: 18, color: colors.surface }}>♥</Text>;
}
function ArrowButtonIcon() {
  return <Text style={{ fontSize: 16, color: colors.surface, fontWeight: '700' }}>→</Text>;
}

export default function AuthScreen() {
  const { t } = useTranslation();
  const screenHeight = Dimensions.get('window').height;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [generalError, setGeneralError] = useState('');

  const heroHeight = screenHeight * 0.43;

  const { login, signup } = useEmailAuth();
  const { google, apple, facebook } = useSocialAuth();
  const getErrorKey = useAuthError();

  const line1 = t('auth.brandTaglineLine1');
  const h1 = t('auth.brandTaglineHighlight1');
  const parts1 = line1.split(h1);
  const before1 = parts1[0] ?? '';
  const after1 = parts1[1] ?? '';

  const line2 = t('auth.brandTaglineLine2');
  const h2 = t('auth.brandTaglineHighlight2');
  const parts2 = line2.split(h2);
  const before2 = parts2[0] ?? '';
  const after2 = parts2[1] ?? '';

  function validateEmail(): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !re.test(email.trim())) {
      setEmailError(t('auth.invalidEmail'));
      return false;
    }
    setEmailError('');
    return true;
  }

  function validatePassword(): boolean {
    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
      return false;
    }
    setPasswordError('');
    return true;
  }

  function validateForm(): boolean {
    let ok = validateEmail() && validatePassword();
    if (authTab === 'createAccount' && password !== confirmPassword) {
      setConfirmPasswordError(t('auth.passwordMismatch'));
      ok = false;
    }
    return ok;
  }

  useEffect(() => {
    const emailError = authTab === 'login' ? login.error : signup.error;
    const socialError = google.error ?? apple.error ?? facebook.error;
    const activeError = emailError ?? socialError;
    if (activeError) {
      const key = getErrorKey(activeError);
      setGeneralError(key ? t(key) : activeError.message);
    } else {
      setGeneralError('');
    }
  }, [authTab, login.error, signup.error, google.error, apple.error, facebook.error, getErrorKey, t]);

  async function handlePrimaryPress() {
    setGeneralError('');
    if (!validateForm()) return;
    try {
      if (authTab === 'login') {
        await login.mutateAsync({ email, password });
      } else {
        await signup.mutateAsync({ email, password });
      }
      // Session change triggers redirect via useBootstrapApp / auth.tsx
    } catch {
      /* error shown via generalError effect */
    }
  }

  async function handleGoogle() {
    try { await google.mutateAsync(); } catch { /* error shown via effect */ }
  }
  async function handleApple() {
    try { await apple.mutateAsync(); } catch { /* error shown via effect */ }
  }
  async function handleFacebook() {
    try { await facebook.mutateAsync(); } catch { /* error shown via effect */ }
  }

  const ctaLabel = authTab === 'login' ? t('auth.login') : t('auth.createAccount');

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
            {/* Hero */}
            <View style={[styles.heroSection, { height: heroHeight }]}>
              <View style={styles.brandContainer}>
                <View style={styles.brandNameRow}>
                  <Text style={styles.brandNameText}>Qali</Text>
                  <View style={styles.brandIWrapper}>
                    <Text style={styles.brandHeartIcon}>♥</Text>
                    <Text style={styles.brandNameText}>ye</Text>
                  </View>
                </View>
                <Text style={styles.tagline}>
                  {before1}
                  <Text style={styles.taglineHighlight}>{h1}</Text>
                  {after1}
                </Text>
                <Text style={styles.tagline}>
                  {before2}
                  <Text style={styles.taglineHighlight}>{h2}</Text>
                  {after2}
                </Text>
                <View style={styles.decorDivider}>
                  <View style={styles.decorLine} />
                  <Text style={styles.decorHeart}>♥</Text>
                  <View style={styles.decorLine} />
                </View>
              </View>
            </View>

            {/* Form */}
            <View style={styles.formSection}>
              <Text style={styles.welcomeText}>{t('auth.welcome')}</Text>

              {/* ── Email form ── */}
              <View style={styles.segmentedWrapper}>
                <AuthSegmentedControl
                  selected={authTab}
                  onSelect={(tab) => {
                    setAuthTab(tab);
                    setGeneralError('');
                    setEmailError('');
                    setPasswordError('');
                    setConfirmPasswordError('');
                  }}
                  loginLabel={t('auth.login')}
                  createAccountLabel={t('auth.createAccount')}
                />
              </View>
              <View style={styles.inputWrapper}>
                <AuthTextInput
                  leftSlot={<EmailInputIcon />}
                  placeholder={t('auth.emailAddress')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                  accessibilityLabel={t('auth.emailAddress')}
                />
                {!!emailError && <Text style={styles.fieldError}>{emailError}</Text>}
              </View>

              <View style={styles.inputWrapper}>
                <AuthTextInput
                  leftSlot={<LockIcon />}
                  placeholder={t('auth.password')}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setPasswordError(''); setGeneralError(''); }}
                  accessibilityLabel={t('auth.password')}
                />
                {!!passwordError && <Text style={styles.fieldError}>{passwordError}</Text>}
              </View>

              {authTab === 'createAccount' && (
                <View style={styles.inputWrapper}>
                  <AuthTextInput
                    leftSlot={<LockIcon />}
                    placeholder={t('auth.confirmPassword')}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={confirmPassword}
                    onChangeText={(v) => { setConfirmPassword(v); setConfirmPasswordError(''); setGeneralError(''); }}
                    accessibilityLabel={t('auth.confirmPassword')}
                  />
                  {!!confirmPasswordError && <Text style={styles.fieldError}>{confirmPasswordError}</Text>}
                </View>
              )}

              {/* CTA */}
              <View style={styles.ctaWrapper}>
                <GradientButton
                  label={ctaLabel}
                  onPress={handlePrimaryPress}
                  leftIcon={<HeartButtonIcon />}
                  rightIcon={<ArrowButtonIcon />}
                  accessibilityLabel={ctaLabel}
                />
              </View>
              {!!generalError && (
                <Text style={[styles.fieldError, styles.generalError]}>{generalError}</Text>
              )}

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social / method buttons */}
              <View style={styles.socialRow}>
                <SocialAuthButton
                  icon={<GoogleIcon />}
                  label={t('auth.google')}
                  onPress={handleGoogle}
                />
                <SocialAuthButton
                  icon={<AppleIcon />}
                  label={t('auth.apple')}
                  onPress={handleApple}
                />
                <SocialAuthButton
                  icon={<FacebookIcon />}
                  label={t('auth.facebook')}
                  onPress={handleFacebook}
                />
              </View>

              {/* Privacy note */}
              <View style={styles.privacyRow}>
                <ShieldIcon />
                <View style={styles.privacyTexts}>
                  <Text style={styles.privacyText}>{t('auth.privacyLine1')}</Text>
                  <Text style={styles.privacyText}>{t('auth.privacyLine2')}</Text>
                </View>
              </View>
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

  // Hero
  heroSection: {
    justifyContent: 'flex-start',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  brandContainer: {
    maxWidth: '62%',
  },
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
  brandIWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  brandHeartIcon: {
    fontSize: 16,
    color: colors.heartPink,
    lineHeight: 20,
    marginBottom: 4,
  },
  tagline: {
    fontSize: fontSize.md,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 26,
  },
  taglineHighlight: {
    color: colors.primary,
    fontWeight: '700',
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
  decorHeart: {
    fontSize: 11,
    color: colors.primary,
  },

  // Form
  formSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  welcomeText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    marginBottom: spacing.xs + 2,
  },
  // Input icons
  inputIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },

  // Errors
  fieldError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },

  segmentedWrapper: {
    marginBottom: spacing.sm,
  },
  // CTA
  ctaWrapper: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  generalError: {
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  // Google icon
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DADCE0',
  },
  googleLetter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4285F4',
  },

  // Facebook icon
  facebookIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facebookLetter: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 15,
  },

  // Privacy
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  privacyTexts: {
    flex: 1,
  },
  privacyText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'left',
  },
});
