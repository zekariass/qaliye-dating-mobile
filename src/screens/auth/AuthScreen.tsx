import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
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

// ─── Floating heart particle ──────────────────────────────────────────────────

function FloatingHeart({ delay, x, size, opacity }: { delay: number; x: number; size: number; opacity: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, { toValue: -60, duration: 3000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(fade, { toValue: opacity, duration: 800, useNativeDriver: true }),
            Animated.timing(fade, { toValue: 0, duration: 2200, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(fade, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        bottom: 20,
        left: x,
        fontSize: size,
        color: '#FF6BB3',
        opacity: fade,
        transform: [{ translateY }],
      }}
    >
      ♥
    </Animated.Text>
  );
}

// ─── Pulsing heart (used in tagline) ─────────────────────────────────────────

function PulsingHeart({ style }: { style?: object }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.delay(500),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.Text style={[s.taglineHeart, style, { transform: [{ scale }] }]}>♥</Animated.Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

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
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={s.hero}>
        <LinearGradient
          colors={['#0D0520', '#1E0840', '#3A0E7A', '#5B18B8']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Decorative blobs */}
        <View style={[s.blob, s.blob1]} />
        <View style={[s.blob, s.blob2]} />
        <View style={[s.blob, s.blob3]} />

        {/* Floating hearts */}
        <FloatingHeart delay={0}    x={40}  size={12} opacity={0.6} />
        <FloatingHeart delay={900}  x={110} size={8}  opacity={0.4} />
        <FloatingHeart delay={1800} x={200} size={14} opacity={0.5} />
        <FloatingHeart delay={600}  x={280} size={9}  opacity={0.45} />
        <FloatingHeart delay={2400} x={320} size={11} opacity={0.55} />

        <SafeAreaView edges={['top']} style={s.heroContent}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <Text style={s.logoText}>Qaliye</Text>
          </View>

          {/* Tagline — replace first 'o' in each highlight with a pulsing heart */}
          <View style={s.taglineWrap}>
            <Text style={s.tagline}>
              {before1}
              {h1.includes('o') ? (
                <>
                  <Text style={s.tagHL}>{h1.split('o')[0]}</Text>
                  <PulsingHeart />
                  <Text style={s.tagHL}>{h1.split('o').slice(1).join('o')}</Text>
                </>
              ) : (
                <Text style={s.tagHL}>{h1}</Text>
              )}
              {after1}
            </Text>
            {!!line2 && (
              <Text style={s.tagline}>
                {before2}
                {h2.includes('o') ? (
                  <>
                    <Text style={s.tagHL}>{h2.split('o')[0]}</Text>
                    <PulsingHeart />
                    <Text style={s.tagHL}>{h2.split('o').slice(1).join('o')}</Text>
                  </>
                ) : (
                  <Text style={s.tagHL}>{h2}</Text>
                )}
                {after2}
              </Text>
            )}
          </View>

          {/* Decorative divider */}
          <View style={s.dividerDeco}>
            <View style={s.decoLine} />
            <View style={s.decoHeartRow}>
              <Text style={s.decoHeart}>♥</Text>
              <Text style={[s.decoHeart, { opacity: 0.5, fontSize: 7 }]}>♥</Text>
              <Text style={[s.decoHeart, { opacity: 0.3, fontSize: 5 }]}>♥</Text>
            </View>
            <View style={s.decoLine} />
          </View>
        </SafeAreaView>
      </View>

      {/* ── Card ─────────────────────────────────────────────────────────── */}
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
          <View style={[s.card, { backgroundColor: isDark ? '#130B28' : '#FFFFFF' }]}>
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: isDark ? '#3A2568' : '#DDD5F5' }]} />

            <Text style={[s.welcomeText, { color: isDark ? '#FFFFFF' : '#1A0B30' }]}>
              {t('auth.welcome')}
            </Text>

            {/* Social buttons */}
            <View style={s.socialStack}>
              <TouchableOpacity
                style={[
                  s.socialBtn,
                  {
                    backgroundColor: isDark ? '#1E1438' : '#F7F4FF',
                    borderColor: isDark ? '#3A2568' : '#E2D9FF',
                  },
                ]}
                onPress={handleGoogle}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
              >
                <View style={s.socialIconWrap}>
                  <Ionicons name="logo-google" size={20} color="#4285F4" />
                </View>
                <Text style={[s.socialLabel, { color: isDark ? '#F0EAFF' : '#2D1560' }]}>
                  Continue with Google
                </Text>
                <View style={s.socialChevron}>
                  <Ionicons name="chevron-forward" size={16} color={isDark ? '#7B5EA7' : '#B09DD8'} />
                </View>
              </TouchableOpacity>

              {appleAvailable && (
                <TouchableOpacity
                  style={[
                    s.socialBtn,
                    {
                      backgroundColor: isDark ? '#FFFFFF' : '#0D0D0D',
                      borderColor: 'transparent',
                    },
                  ]}
                  onPress={handleApple}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                >
                  <View style={s.socialIconWrap}>
                    <Ionicons name="logo-apple" size={22} color={isDark ? '#000000' : '#FFFFFF'} />
                  </View>
                  <Text style={[s.socialLabel, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                    Continue with Apple
                  </Text>
                  <View style={s.socialChevron}>
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#55555588' : '#FFFFFF88'} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {!!generalError && !showEmailForm && (
              <View style={s.errorBadge}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                <Text style={s.errorText}>{generalError}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={s.orRow}>
              <View style={[s.orLine, { backgroundColor: isDark ? '#2E1F4A' : '#EDE5FF' }]} />
              <Text style={[s.orText, { color: isDark ? '#6B5490' : '#9B85C4' }]}>
                {t('auth.orContinueWith')}
              </Text>
              <View style={[s.orLine, { backgroundColor: isDark ? '#2E1F4A' : '#EDE5FF' }]} />
            </View>

            {/* Phone button */}
            <TouchableOpacity
              style={[
                s.altBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,110,0,0.10)' : 'rgba(255,110,0,0.06)',
                  borderColor: isDark ? 'rgba(255,110,0,0.30)' : 'rgba(255,110,0,0.25)',
                },
              ]}
              onPress={handlePhone}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('auth.continueWithPhone')}
            >
              <Text style={s.altBtnFlag}>🇪🇹</Text>
              <Text style={[s.altBtnLabel, { color: '#C85000' }]}>
                {t('auth.continueWithPhone')}
              </Text>
            </TouchableOpacity>

            {/* Email button or form */}
            {!showEmailForm ? (
              <TouchableOpacity
                style={[
                  s.altBtn,
                  {
                    backgroundColor: isDark ? 'rgba(138,44,255,0.12)' : 'rgba(138,44,255,0.06)',
                    borderColor: isDark ? 'rgba(138,44,255,0.35)' : 'rgba(138,44,255,0.22)',
                  },
                ]}
                onPress={() => setShowEmailForm(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                <Text style={[s.altBtnLabel, { color: colors.primary }]}>
                  Continue with Email
                </Text>
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
                    leftSlot={<Ionicons name="mail-outline" size={18} color={isDark ? '#7B5EA7' : '#9B85C4'} />}
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
                    leftSlot={<Ionicons name="lock-closed-outline" size={18} color={isDark ? '#7B5EA7' : '#9B85C4'} />}
                    rightSlot={
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={isDark ? '#7B5EA7' : '#9B85C4'}
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
                      leftSlot={<Ionicons name="lock-closed-outline" size={18} color={isDark ? '#7B5EA7' : '#9B85C4'} />}
                      rightSlot={
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={isDark ? '#7B5EA7' : '#9B85C4'}
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
                  <View style={s.errorBadge}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
                    <Text style={s.errorText}>{generalError}</Text>
                  </View>
                )}
                {confirmationSent && (
                  <View style={s.confirmBadge}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#16A34A" />
                    <Text style={s.confirmText}>
                      {t('auth.checkEmail')} ({confirmedEmail})
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Privacy */}
            <View style={[s.privacyRow, { borderTopColor: isDark ? '#2E1F4A' : '#EDE5FF' }]}>
              <Ionicons name="shield-checkmark-outline" size={15} color={isDark ? '#6B5490' : '#B09DD8'} />
              <View style={s.privacyTexts}>
                <Text style={[s.privacyText, { color: isDark ? '#6B5490' : '#9B85C4' }]}>
                  {t('auth.privacyLine1')}
                </Text>
                <Text style={[s.privacyText, { color: isDark ? '#6B5490' : '#9B85C4' }]}>
                  {t('auth.privacyLine2')}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Social auth loading overlay */}
      <Modal visible={isSocialLoading} transparent animationType="fade" statusBarTranslucent>
        <View style={s.loadingOverlay}>
          <View style={[s.loadingCard, { backgroundColor: isDark ? '#1E1438' : '#FFFFFF' }]}>
            <View style={s.loadingIconWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <Text style={[s.loadingText, { color: isDark ? '#FFFFFF' : '#1A0B30' }]}>
              {t('auth.signingIn', 'Signing in…')}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: { flex: 1 },

  /* ── Hero ─────────────────────────────────────────────────────────────── */
  hero: {
    paddingBottom: spacing.xxl + 16,
    overflow: 'hidden',
  },
  heroContent: {
    alignItems: 'center',
    paddingTop: spacing.xl + 4,
    paddingHorizontal: spacing.lg,
  },

  /* Decorative blobs */
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blob1: {
    width: 220,
    height: 220,
    backgroundColor: '#9B42FF',
    opacity: 0.18,
    top: -60,
    right: -60,
  },
  blob2: {
    width: 160,
    height: 160,
    backgroundColor: '#FF4FA3',
    opacity: 0.12,
    top: 40,
    left: -50,
  },
  blob3: {
    width: 100,
    height: 100,
    backgroundColor: '#C077FF',
    opacity: 0.14,
    bottom: 10,
    right: 20,
  },

  /* Logo */
  logoWrap: {
    marginBottom: spacing.sm,
  },
  logoText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: 60,
  },

  /* Tagline */
  taglineWrap: {
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.md,
  },
  tagline: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '500',
    lineHeight: 23,
    textAlign: 'center',
  },
  tagHL: {
    color: '#E8B4FF',
    fontWeight: '700',
  },
  taglineHeart: {
    fontSize: 14,
    color: '#FF6BB3',
    lineHeight: 23,
  },

  /* Divider decoration */
  dividerDeco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  decoLine: {
    width: 32,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 1,
  },
  decoHeartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  decoHeart: {
    fontSize: 9,
    color: '#FFB6D9',
  },

  /* ── Card ─────────────────────────────────────────────────────────────── */
  cardKav: {
    flex: 1,
    marginTop: -spacing.xl,
  },
  cardScroll: { flex: 1 },
  cardScrollContent: { flexGrow: 1 },
  card: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: spacing.lg,
  },

  /* ── Social buttons ─────────────────────────────────────────────────── */
  socialStack: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minHeight: 54,
  },
  socialIconWrap: {
    width: 32,
    alignItems: 'center',
  },
  socialLabel: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 32,
  },
  socialChevron: {
    width: 24,
    alignItems: 'flex-end',
  },

  /* ── Error / Confirm badges ─────────────────────────────────────────── */
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: '500',
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  confirmText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: '#16A34A',
    fontWeight: '500',
  },

  /* ── Or divider ─────────────────────────────────────────────────────── */
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  orLine: { flex: 1, height: 1 },
  orText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* ── Alt buttons (phone / email) ────────────────────────────────────── */
  altBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 15,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.sm,
    minHeight: 54,
  },
  altBtnFlag: { fontSize: 20, lineHeight: 26 },
  altBtnLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },

  /* ── Email form ─────────────────────────────────────────────────────── */
  emailForm: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inputGap: { marginBottom: 2 },
  fieldErr: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 4,
    paddingHorizontal: spacing.xs,
  },
  ctaWrap: { marginTop: spacing.xs },

  /* ── Privacy ────────────────────────────────────────────────────────── */
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  privacyTexts: { flex: 1 },
  privacyText: {
    fontSize: 11,
    lineHeight: 17,
  },

  /* ── Loading overlay ────────────────────────────────────────────────── */
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 4, 30, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.3,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(138,44,255,0.2)',
    minWidth: 200,
  },
  loadingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: 'rgba(138,44,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
