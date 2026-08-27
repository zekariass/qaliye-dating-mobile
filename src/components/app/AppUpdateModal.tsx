// ---------------------------------------------------------------------------
// AppUpdateModal
// ---------------------------------------------------------------------------
//
// Renders the mandatory or optional update prompt.
//
//  Mandatory — blocking Modal with no dismiss option.
//              Back-handler on Android is a no-op so the user cannot escape.
//
//  Optional  — dismissible Modal with a "Later" button.
//              Tapping "Later" persists the dismissed version so the prompt
//              doesn't repeat for the same release.
//
// Prompt coordination
// -------------------
// This component watches InsufficientCreditsModal via its Zustand store.
// When that (or any other registered blocking modal) becomes visible while
// an update is pending, this modal defers itself.  As soon as the blocking
// modal dismisses, the update prompt is re-shown automatically.
// ---------------------------------------------------------------------------

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppUpdateStore } from '@/stores/app-update-store';
import { useInsufficientCreditsStore } from '@/stores/insufficient-credits-store';

// ─── Component ────────────────────────────────────────────────────────────────

export function AppUpdateModal() {
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  const status = useAppUpdateStore((s) => s.status);
  const storeUrl = useAppUpdateStore((s) => s.storeUrl);
  const latestVersion = useAppUpdateStore((s) => s.latestVersion);
  const isPromptVisible = useAppUpdateStore((s) => s.isPromptVisible);
  const setIsPromptVisible = useAppUpdateStore((s) => s.setIsPromptVisible);
  const setDismissedOptionalVersion = useAppUpdateStore(
    (s) => s.setDismissedOptionalVersion,
  );
  const dismissedOptionalVersion = useAppUpdateStore(
    (s) => s.dismissedOptionalVersion,
  );

  const insufficientCreditsVisible = useInsufficientCreditsStore((s) => s.visible);

  const isMandatory = status === 'mandatory-update';
  const hasPendingUpdate =
    status === 'mandatory-update' || status === 'optional-update';

  // ── Deferred display coordination ─────────────────────────────────────────
  // Derive whether the prompt should be visible from its actual inputs:
  //   • There must be a pending update.
  //   • No blocking modal (InsufficientCreditsModal) may be visible.
  //   • For optional updates, the user must not have already dismissed this
  //     specific version.
  //
  // The effect does NOT depend on `isPromptVisible` — that is an *output*, not
  // an input.  Depending on it would re-show the prompt immediately after the
  // user dismisses it, making an optional update undeclinable (effectively
  // mandatory).
  useEffect(() => {
    if (!hasPendingUpdate) return;

    const wasDismissed =
      !isMandatory && dismissedOptionalVersion === latestVersion;

    if (insufficientCreditsVisible || wasDismissed) {
      setIsPromptVisible(false);
    } else {
      setIsPromptVisible(true);
    }
  }, [
    insufficientCreditsVisible,
    hasPendingUpdate,
    isMandatory,
    dismissedOptionalVersion,
    latestVersion,
    setIsPromptVisible,
  ]);

  // ── Android back-button guard for mandatory update ─────────────────────────
  useEffect(() => {
    if (!isMandatory || !isPromptVisible || Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => true); // block
    return () => sub.remove();
  }, [isMandatory, isPromptVisible]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!storeUrl) return;
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        Alert.alert(
          t('appUpdate.storeErrorTitle', 'Could not open store'),
          t(
            'appUpdate.storeErrorBody',
            'Please open the app store manually to update Qaliye.',
          ),
        );
      }
    } catch {
      Alert.alert(
        t('appUpdate.storeErrorTitle', 'Could not open store'),
        t(
          'appUpdate.storeErrorBody',
          'Please open the app store manually to update Qaliye.',
        ),
      );
    }
  };

  const handleLater = () => {
    if (latestVersion) {
      setDismissedOptionalVersion(latestVersion);
    }
    setIsPromptVisible(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isPromptVisible) return null;

  return (
    <Modal
      visible={isPromptVisible}
      transparent
      animationType="fade"
      // For mandatory updates, back-press must not dismiss the modal.
      onRequestClose={isMandatory ? undefined : handleLater}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: th.surface }]}>
          {/* Icon */}
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconWrap}
          >
            <Ionicons name="arrow-up-circle" size={36} color="#FFFFFF" />
          </LinearGradient>

          {/* Title */}
          <Text style={[styles.title, { color: th.text }]}>
            {isMandatory
              ? t('appUpdate.mandatoryTitle', 'Update Required')
              : t('appUpdate.optionalTitle', 'Update Available')}
          </Text>

          {/* Body */}
          <Text style={[styles.message, { color: th.textSecondary }]}>
            {isMandatory
              ? t(
                  'appUpdate.mandatoryBody',
                  'A new version of Qaliye is required to continue. Please update the app to get the latest improvements and continue using Qaliye.',
                )
              : t(
                  'appUpdate.optionalBody',
                  'A new version of Qaliye is available with improvements and bug fixes.',
                )}
          </Text>

          {/* Primary CTA */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={handleUpdate}
            accessibilityRole="button"
            accessibilityLabel={t('appUpdate.updateNow', 'Update Now')}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Ionicons
                name="arrow-up-circle-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryBtnText}>
                {t('appUpdate.updateNow', 'Update Now')}
              </Text>
            </LinearGradient>
          </Pressable>

          {/* Secondary CTA — optional only */}
          {!isMandatory && (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryBtn,
                { backgroundColor: th.backgroundElement, borderColor: th.border },
                pressed && styles.secondaryBtnPressed,
              ]}
              onPress={handleLater}
              accessibilityRole="button"
              accessibilityLabel={t('appUpdate.later', 'Later')}
            >
              <Text style={[styles.secondaryBtnText, { color: th.textSecondary }]}>
                {t('appUpdate.later', 'Later')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    borderRadius: 30,
    width: '100%',
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  primaryBtnPressed: {
    transform: [{ scale: 0.97 }],
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    borderWidth: 1.5,
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.8,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
