import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Easing,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthSegmentedControl, { AuthTab } from '@/components/auth/AuthSegmentedControl';
import AuthTextInput from '@/components/auth/AuthTextInput';
import GradientButton from '@/components/ui/GradientButton';
import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useAuthError } from '@/hooks/auth/useAuthError';
import { useEmailAuth } from '@/hooks/auth/useEmailAuth';
import { useSocialAuth } from '@/hooks/auth/useSocialAuth';
import { useTheme } from '@/hooks/use-theme';

function PulsingHeart() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);
  return (
    <Animated.Text style={{ fontSize: 18, color: '#FF6BB3', lineHeight: 22, marginBottom: 2, transform: [{ scale }] }}>
      ♥
    </Animated.Text>
  );
}

export default function AuthScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [generalError, setGeneralError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const { login, signup } = useEmailAuth();
  const { google, apple } = useSocialAuth();
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
    const emailOk = validateEmail();
    const passwordOk = validatePassword();
    let ok = emailOk && passwordOk;
    if (authTab === 'createAccount' && password !== confirmPassword) {
      setConfirmPasswordError(t('auth.passwordMismatch'));
      ok = false;
    }
    return ok;
  }

  useEffect(() => {
    const emailError = authTab === 'login' ? login.error : signup.error;
    const socialError = google.error ?? apple.error;
    const activeError = emailError ?? socialError;
    if (activeError) {
      const message = getErrorKey(activeError);
      setGeneralError(message ?? activeError.message);
    } else {
      setGeneralError('');
    }
  }, [authTab, login.error, signup.error, google.error, apple.error, getErrorKey, t]);

  async function handlePrimaryPress() {
    setGeneralError('');
    setConfirmationSent(false);
    if (!validateForm()) return;
    try {
      if (authTab === 'login') {
        await login.mutateAsync({ email, password });
      } else {
        const result = await signup.mutateAsync({ email, password });
        if (result.needsConfirmation) {
          setConfirmedEmail(email);
          setConfirmationSent(true);
        }
      }
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
function handlePhone() {
    router.push('/phone-auth' as any);
  }

  const ctaLabel = authTab === 'login' ? t('auth.login') : t('auth.createAccount');
  const isLoading = authTab === 'login' ? login.isPending : signup.isPending;
  const isSocialLoading = google.isPending || apple.isPending;

  return (
    <View style={[s.root, { backgroundColor: th.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Purple Hero ── */}
      <View style={s.hero}>
        <LinearGradient
          colors={['#1A0633', '#2A0B4F', '#4B1389']}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[s.bubble, s.bubble1]} />
        <View style={[s.bubble, s.bubble2]} />
        <View style={[s.bubble, s.bubble3]} />
        <View style={[s.bubble, s.bubble4]} />

        <SafeAreaView edges={['top']} style={s.heroContent}>
          <View style={s.logoRow}>
            <Text style={s.logoText}>Qali</Text>
            <View style={s.logoHeartWrap}>
              <PulsingHeart />
              <Text style={s.logoText}>ye</Text>
            </View>
          </View>

          <Text style={s.tagline}>
            {before1}<Text style={s.tagHL}>{h1}</Text>{after1}
          </Text>
          {!!line2 && (
            <Text style={s.tagline}>
              {before2}<Text style={s.tagHL}>{h2}</Text>{after2}
            </Text>
          )}

          <View style={s.dividerDeco}>
            <View style={s.decoLine} />
            <Text style={s.decoHeart}>♥</Text>
            <View style={s.decoLine} />
          </View>
        </SafeAreaView>
      </View>

      {/* ── Card ── */}
      <KeyboardAvoidingView
        style={s.cardKav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={s.cardScroll}
          contentContainerStyle={s.cardScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[s.card, { backgroundColor: th.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}>
            <View style={[s.cardHandle, { backgroundColor: th.border }]} />
            <Text style={[s.welcomeText, { color: th.text }]}>{t('auth.welcome')}</Text>

            {/* ── Social buttons ── */}
            <View style={s.socialStack}>
              <TouchableOpacity
                style={[s.socialBtn, s.googleBtn, { backgroundColor: th.surface, borderColor: th.border }]}
                onPress={handleGoogle}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <Ionicons name="logo-google" size={20} color="#4285F4" />
                <Text style={[s.socialLabel, { color: th.text }]}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[s.socialBtn, s.appleBtn, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
                onPress={handleApple}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Continue with Apple"
              >
                <Ionicons name="logo-apple" size={22} color={isDark ? '#000000' : '#FFFFFF'} />
                <Text style={[s.socialLabel, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                  Continue with Apple
                </Text>
              </TouchableOpacity>
              )}

            </View>

            {!!generalError && !showEmailForm && (
              <Text style={s.errorText}>{generalError}</Text>
            )}

            {/* ── Divider ── */}
            <View style={s.orRow}>
              <View style={[s.orLine, { backgroundColor: th.border }]} />
              <Text style={[s.orText, { color: th.textMuted }]}>{t('auth.orContinueWith')}</Text>
              <View style={[s.orLine, { backgroundColor: th.border }]} />
            </View>

            {/* ── Phone section ── */}
            <TouchableOpacity
              style={[s.emailToggle, s.phoneToggle, { borderColor: '#E05A00', backgroundColor: isDark ? 'rgba(255, 120, 20, 0.10)' : 'rgba(255, 120, 20, 0.04)' }]}
              onPress={handlePhone}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('auth.continueWithPhone')}
            >
              <Text style={s.phoneFlag}>🇪🇹</Text>
              <Text style={[s.emailToggleLabel, s.phoneToggleLabel]}>{t('auth.continueWithPhone')}</Text>
            </TouchableOpacity>

            {/* ── Email section ── */}
            {!showEmailForm ? (
              <TouchableOpacity
                style={[s.emailToggle, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(138, 44, 255, 0.12)' : 'rgba(138, 44, 255, 0.04)' }]}
                onPress={() => setShowEmailForm(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                <Text style={[s.emailToggleLabel, { color: colors.primary }]}>Continue with Email</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.emailForm}>
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

                <View style={s.inputGap}>
                  <AuthTextInput
                    leftSlot={<Ionicons name="mail-outline" size={18} color={th.textMuted} />}
                    placeholder={t('auth.emailAddress')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                    accessibilityLabel={t('auth.emailAddress')}
                  />
                  {!!emailError && <Text style={s.fieldErr}>{emailError}</Text>}
                </View>

                <View style={s.inputGap}>
                  <AuthTextInput
                    leftSlot={<Ionicons name="lock-closed-outline" size={18} color={th.textMuted} />}
                    rightSlot={
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={th.textMuted}
                      />
                    }
                    onRightPress={() => setShowPassword((p) => !p)}
                    placeholder={t('auth.password')}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setPasswordError(''); setGeneralError(''); }}
                    accessibilityLabel={t('auth.password')}
                  />
                  {!!passwordError && <Text style={s.fieldErr}>{passwordError}</Text>}
                </View>

                {authTab === 'createAccount' && (
                  <View style={s.inputGap}>
                    <AuthTextInput
                      leftSlot={<Ionicons name="lock-closed-outline" size={18} color={th.textMuted} />}
                      rightSlot={
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={th.textMuted}
                        />
                      }
                      onRightPress={() => setShowConfirmPassword((p) => !p)}
                      placeholder={t('auth.confirmPassword')}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={confirmPassword}
                      onChangeText={(v) => { setConfirmPassword(v); setConfirmPasswordError(''); setGeneralError(''); }}
                      accessibilityLabel={t('auth.confirmPassword')}
                    />
                    {!!confirmPasswordError && <Text style={s.fieldErr}>{confirmPasswordError}</Text>}
                  </View>
                )}

                <View style={s.ctaWrap}>
                  <GradientButton
                    label={ctaLabel}
                    onPress={handlePrimaryPress}
                    leftIcon={<Text style={{ fontSize: 18, color: '#fff' }}>♥</Text>}
                    rightIcon={<Text style={{ fontSize: 16, color: '#fff', fontWeight: '700' }}>→</Text>}
                    accessibilityLabel={ctaLabel}
                    isLoading={isLoading}
                    disabled={isLoading}
                  />
                </View>

                {!!generalError && showEmailForm && (
                  <Text style={s.errorText}>{generalError}</Text>
                )}
                {confirmationSent && (
                  <Text style={s.confirmText}>
                    {t('auth.checkEmail')} ({confirmedEmail})
                  </Text>
                )}
              </View>
            )}

            {/* ── Privacy ── */}
            <View style={s.privacyRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <View style={s.privacyTexts}>
                <Text style={[s.privacyText, { color: th.textMuted }]}>{t('auth.privacyLine1')}</Text>
                <Text style={[s.privacyText, { color: th.textMuted }]}>{t('auth.privacyLine2')}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Social auth loading overlay ── */}
      <Modal
        visible={isSocialLoading}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={s.loadingOverlay}>
          <View style={[s.loadingCard, { backgroundColor: th.surface }]}>
            <View style={s.loadingIconWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[s.loadingText, { color: th.text }]}>{t('auth.signingIn', 'Signing in…')}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: {
    flex: 1,
  },

  /* ── Hero ── */
  hero: {
    paddingBottom: spacing.xxl + 12,
    overflow: 'hidden',
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  bubble1: {
    width: 180,
    height: 180,
    backgroundColor: '#FF4FA3',
    opacity: 0.12,
    top: -40,
    right: -50,
  },
  bubble2: {
    width: 120,
    height: 120,
    backgroundColor: '#B777FF',
    opacity: 0.18,
    top: 60,
    left: -30,
  },
  bubble3: {
    width: 80,
    height: 80,
    backgroundColor: '#FF9BCD',
    opacity: 0.15,
    bottom: 20,
    right: 30,
  },
  bubble4: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    opacity: 0.08,
    bottom: 40,
    left: 60,
  },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 56,
  },
  logoHeartWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  tagline: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    lineHeight: 24,
    textAlign: 'center',
  },
  tagHL: {
    color: '#FFB6D9',
    fontWeight: '700',
  },
  dividerDeco: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  decoLine: {
    width: 28,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  decoHeart: {
    fontSize: 11,
    color: '#FFB6D9',
  },

  /* ── Card ── */
  cardKav: {
    flex: 1,
    marginTop: -spacing.lg,
  },
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    flexGrow: 1,
  },
  card: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 8,
  },
  cardHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  welcomeText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  /* ── Social ── */
  socialStack: {
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    paddingVertical: 14,
    borderRadius: radius.lg,
    minHeight: 52,
  },
  googleBtn: {
    borderWidth: 1.5,
  },
  appleBtn: {},
socialLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },

  errorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },

  /* ── Divider ── */
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  orLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: fontSize.sm,
  },

  /* ── Phone toggle ── */
  phoneToggle: {
  },
  phoneFlag: {
    fontSize: 20,
  },
  phoneToggleLabel: {
    color: '#C04E00',
  },

  /* ── Email toggle ── */
  emailToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  emailToggleLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },

  /* ── Email form ── */
  emailForm: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inputGap: {
    marginBottom: 2,
  },
  fieldErr: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },
  ctaWrap: {
    marginTop: spacing.xs,
  },
  confirmText: {
    fontSize: fontSize.xs,
    color: '#16A34A',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  /* ── Privacy ── */
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  privacyTexts: {
    flex: 1,
  },
  privacyText: {
    fontSize: fontSize.xs,
    lineHeight: 18,
    textAlign: 'left',
  },

  /* ── Loading overlay ── */
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(138, 44, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(138, 44, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
