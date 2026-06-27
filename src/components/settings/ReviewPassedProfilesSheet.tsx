import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import GradientButton from '@/components/ui/GradientButton';
import { Routes } from '@/constants/routes';
import { colors, fontSize, radius, shadows, spacing } from '@/constants/theme';
import { useRevisitPassedProfiles } from '@/hooks/discovery/useRevisitPassedProfiles';
import { useTheme } from '@/hooks/use-theme';
import type { RevisitCount } from '@/types/discovery';

const COUNT_OPTIONS: RevisitCount[] = [10, 20, 30];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReviewPassedProfilesSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const router = useRouter();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const { mutate: revisit, isPending } = useRevisitPassedProfiles();
  const [selectedCount, setSelectedCount] = useState<RevisitCount | null>(null);

  const handleClose = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

  const handleSuccess = useCallback(
    (reopenedCount: number) => {
      onClose();
      const hasProfiles = reopenedCount > 0;

      if (hasProfiles) {
        const message =
          reopenedCount === 1
            ? t(
                'settings.revisitSuccessOne',
                '1 previously passed profile is available in Discovery again.',
              )
            : t(
                'settings.revisitSuccess',
                '{{count}} previously passed profiles are available in Discovery again.',
                { count: reopenedCount },
              );

        Alert.alert(
          t('settings.revisitSuccessTitle', 'Profiles reopened'),
          message,
          [
            {
              text: t('settings.revisitStay', 'Stay in Settings'),
              style: 'cancel',
            },
            {
              text: t('settings.revisitGoToDiscovery', 'Go to Discovery'),
              onPress: () => router.replace(Routes.DISCOVER as any),
            },
          ],
        );
      } else {
        Alert.alert(
          t('settings.revisitSuccessTitle', 'Profiles reopened'),
          t(
            'settings.revisitSuccessZero',
            'No eligible previously passed profiles are available right now.',
          ),
          [{ text: t('common.ok', 'OK') }],
        );
      }
    },
    [onClose, router, t],
  );

  const handleError = useCallback(
    (error: Error) => {
      let message = t(
        'settings.revisitErrorGeneric',
        'Something went wrong. Please try again.',
      );
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 400) {
          message = t(
            'settings.revisitErrorValidation',
            "This request isn't valid right now.",
          );
        } else if (status === 403) {
          message = t(
            'settings.revisitErrorForbidden',
            "You can't use Discovery right now.",
          );
        }
      }
      Alert.alert(
        t('settings.revisitErrorTitle', 'Could not reopen'),
        message,
        [{ text: t('common.retry', 'Try again') }],
      );
    },
    [t],
  );

  const handleConfirm = useCallback(() => {
    if (selectedCount == null || isPending) return;
    revisit(selectedCount, {
      onSuccess: (data) => handleSuccess(data.reopenedCount),
      onError: handleError,
    });
  }, [selectedCount, isPending, revisit, handleSuccess, handleError]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.overlay}
        onPress={handleClose}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel', 'Cancel')}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: th.surface, paddingBottom: safeBottom + spacing.lg },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: th.border }]} />
          <Text style={[styles.title, { color: th.text }]}>
            {t('settings.revisitSheetTitle', 'Review passed profiles')}
          </Text>
          <Text style={[styles.subtitle, { color: th.textSecondary }]}>
            {t(
              'settings.revisitSheetSubtitle',
              'Choose how many recent profiles you want to reconsider. Only profiles that are still eligible will return to Discovery.',
            )}
          </Text>

          <View style={styles.optionsList}>
            {COUNT_OPTIONS.map((count) => {
              const active = selectedCount === count;
              const label = t('settings.revisitLast', 'Last {{count}}', { count });
              return (
                <TouchableOpacity
                  key={count}
                  testID={`revisit-count-${count}`}
                  style={[
                    styles.card,
                    { backgroundColor: th.backgroundElement, borderColor: th.border },
                    active && styles.cardActive,
                  ]}
                  onPress={() => setSelectedCount(count)}
                  activeOpacity={0.75}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                  disabled={isPending}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: th.backgroundSelected },
                      active && styles.iconWrapActive,
                    ]}
                  >
                    <Ionicons
                      name="refresh-outline"
                      size={22}
                      color={active ? colors.primary : th.textSecondary}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text
                      style={[styles.label, { color: th.text }, active && styles.labelActive]}
                    >
                      {label}
                    </Text>
                    <Text style={[styles.desc, { color: th.textSecondary }]}>
                      {t(
                        'settings.revisitHint',
                        'Up to {{count}} eligible profiles may return to Discovery.',
                        { count },
                      )}
                    </Text>
                  </View>
                  {active ? (
                    <View style={styles.check}>
                      <Ionicons name="checkmark" size={16} color={colors.surface} />
                    </View>
                  ) : (
                    <View style={[styles.unchecked, { borderColor: th.border }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <GradientButton
            testID="revisit-confirm"
            label={
              isPending
                ? t('settings.revisitReopening', 'Reopening profiles…')
                : t('settings.revisitReopenProfiles', 'Reopen profiles')
            }
            onPress={handleConfirm}
            isLoading={isPending}
            disabled={selectedCount == null || isPending}
            accessibilityLabel={t('settings.revisitReopenProfiles', 'Reopen profiles')}
          />

          <TouchableOpacity
            testID="revisit-cancel"
            style={styles.cancelBtn}
            onPress={handleClose}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel', 'Cancel')}
            disabled={isPending}
          >
            <Text style={[styles.cancelText, { color: th.textSecondary }]}>
              {t('common.cancel', 'Cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 5, 18, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    ...shadows.soft,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  optionsList: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardActive: {
    backgroundColor: colors.backgroundLavender,
    borderColor: colors.primary,
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#E8D9FF',
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  labelActive: {
    color: colors.primary,
  },
  desc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  unchecked: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  cancelText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
