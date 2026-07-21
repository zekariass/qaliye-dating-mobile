import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import GradientButton from '@/components/ui/GradientButton';
import { colors, fontSize, gradients, radius, spacing } from '@/constants/theme';
import { usePhoneOtp } from '@/hooks/auth/usePhoneOtp';
import { useTheme } from '@/hooks/use-theme';
import { formatEthiopianPhoneDisplay, normalizeEthiopianPhone } from '@/utils/phone';

function PhoneIcon({ color }: { color: string }) {
  return <Ionicons name="call-outline" size={18} color={color} />;
}
function ArrowIcon() {
  return <Text style={{ fontSize: 16, color: colors.surface, fontWeight: '700' }}>→</Text>;
}

export default function PhoneInputScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { sendCode } = usePhoneOtp();

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [orb1Anim, orb2Anim]);

  const orb1TranslateY = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const orb1Scale = orb1Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const orb2TranslateY = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
  const orb2Scale = orb2Anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] });

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }

  function validate(): string | null {
    const normalized = normalizeEthiopianPhone(phone);
    if (!normalized) {
      setPhoneError(t('auth.invalidEthiopianPhone'));
      shake();
      return null;
    }
    setPhoneError('');
    return normalized;
  }

  function getErrorMessage(error: Error): string {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid_ethiopian_phone')) return t('auth.invalidEthiopianPhone');
    if (msg.includes('rate limit') || msg.includes('too many')) return t('auth.phoneOtpRateLimit');
    // Surface provider-level errors during development
    if (__DEV__ && error.message) return `${t('auth.phoneOtpSendFailed')}: ${error.message}`;
    return t('auth.phoneOtpSendFailed');
  }

  async function handleSend() {
    if (sendCode.isPending) return;
    setGeneralError('');
    const normalized = validate();
    if (!normalized) return;
    try {
      await sendCode.mutateAsync(normalized);
      const display = formatEthiopianPhoneDisplay(normalized);
      router.push({ pathname: '/phone-otp' as any, params: { phone: normalized, display } });
    } catch (e) {
      const err = e as Error;
      setGeneralError(getErrorMessage(err));
    }
  }

  function handleBack() {
    router.replace('/auth');
  }

  return (
    <LinearGradient
      colors={isDark ? ['#0D0712', '#160F24', '#1A1230'] : gradients.splash}
      style={styles.bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative floating orbs */}
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

            {/* Form */}
            <View style={styles.formSection}>
              <View style={styles.headerRow}>
                <Text style={styles.flagEmoji}>🇪🇹</Text>
                <Text style={[styles.titleText, { color: th.text }]}>{t('auth.continueWithPhone')}</Text>
              </View>

              <Text style={[styles.subtitleText, { color: th.textMuted }]}>{t('auth.enterEthiopianPhone')}</Text>

              {/* Ethiopia-only badge */}
              <View style={[styles.badgeRow, { backgroundColor: isDark ? 'rgba(138, 44, 255, 0.15)' : 'rgba(138, 44, 255, 0.07)' }]}>
                <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>{t('auth.ethiopiaOnly')}</Text>
              </View>

              {/* Phone input row */}
              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => inputRef.current?.focus()}
                  style={[
                    styles.phoneInputContainer,
                    { backgroundColor: th.backgroundElement, borderColor: th.border },
                    inputFocused && { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(138, 44, 255, 0.08)' : '#FBF7FF' },
                    !!phoneError && { borderColor: colors.danger },
                  ]}
                >
                  {/* Fixed prefix */}
                  <View style={[styles.prefixBadge, { backgroundColor: isDark ? 'rgba(138, 44, 255, 0.12)' : 'rgba(138, 44, 255, 0.06)' }]}>
                    <Text style={styles.flagSmall}>🇪🇹</Text>
                    <Text style={[styles.prefixText, { color: colors.primary }]}>+251</Text>
                  </View>

                  <View style={[styles.prefixDivider, { backgroundColor: th.border }]} />

                  {/* Local number input */}
                  <TextInput
                    ref={inputRef}
                    style={[styles.phoneTextInput, { color: th.text }]}
                    placeholder={t('auth.phoneInputPlaceholder')}
                    placeholderTextColor={th.textMuted}
                    keyboardType="phone-pad"
                    maxLength={15}
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v);
                      setPhoneError('');
                      setGeneralError('');
                    }}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onSubmitEditing={handleSend}
                    returnKeyType="send"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    accessibilityLabel={t('auth.phoneNumber')}
                  />

                  <View style={styles.phoneIconRight}>
                    <PhoneIcon color={th.textMuted} />
                  </View>
                </TouchableOpacity>
              </Animated.View>

              {!!phoneError && <Text style={styles.fieldError}>{phoneError}</Text>}

              <View style={styles.ctaWrapper}>
                <GradientButton
                  label={sendCode.isPending ? t('auth.sendingOtp') : t('auth.sendOtp')}
                  onPress={handleSend}
                  rightIcon={<ArrowIcon />}
                  accessibilityLabel={t('auth.sendOtp')}
                  isLoading={sendCode.isPending}
                  disabled={sendCode.isPending}
                />
              </View>

              {!!generalError && (
                <Text style={[styles.fieldError, styles.centeredError]}>{generalError}</Text>
              )}

              {/* Privacy note */}
              <View style={styles.privacyRow}>
                <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                <Text style={[styles.privacyText, { color: th.textMuted }]}>{t('auth.privacyLine1')}</Text>
              </View>
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
    width: 260,
    height: 260,
    top: -80,
    right: -80,
    backgroundColor: colors.primaryLight,
    opacity: 0.18,
  },
  orb2: {
    width: 200,
    height: 200,
    bottom: 60,
    left: -70,
    backgroundColor: colors.secondary,
    opacity: 0.13,
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
    marginBottom: spacing.xs,
  },
  flagEmoji: { fontSize: 28 },
  titleText: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    flexShrink: 1,
  },
  subtitleText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },

  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minHeight: 58,
    overflow: 'hidden',
  },
  phoneInputFocused: {
  },
  phoneInputError: {
  },
  prefixBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 5,
  },
  flagSmall: { fontSize: 18 },
  prefixText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  prefixDivider: {
    width: 1.5,
    alignSelf: 'stretch',
    marginVertical: 10,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    letterSpacing: 1,
  },
  phoneIconRight: {
    paddingRight: spacing.md,
  },

  fieldError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: 6,
    paddingHorizontal: spacing.xs,
  },
  centeredError: { textAlign: 'center', marginTop: spacing.sm },

  ctaWrapper: { marginTop: spacing.md, marginBottom: spacing.sm },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  privacyText: {
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
});
