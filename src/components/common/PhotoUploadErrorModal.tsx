import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PhotoUploadErrorVariant = 'ai' | 'moderation' | 'error';

export type PhotoUploadErrorModalProps = {
  visible: boolean;
  /** Which error presentation to use. */
  variant: PhotoUploadErrorVariant;
  /** User-facing message shown under the title. */
  message?: string;
  /** Primary action — pick a different photo (typically for moderation rejections). */
  onChooseAnother?: () => void;
  /** Primary action — retry the same upload (technical errors only). */
  onRetry?: () => void;
  /** Secondary action — remove the failed photo from the slot. */
  onRemove?: () => void;
  /** Always rendered — dismisses the modal. */
  onClose: () => void;
};

/**
 * Shared upload-error dialog used by both onboarding (PhotoStep) and the
 * profile photo editor (PhotosTabReal) so AI rejections, moderation rejections,
 * and technical failures look identical across the app.
 */
export function PhotoUploadErrorModal({
  visible,
  variant,
  message,
  onChooseAnother,
  onRetry,
  onRemove,
  onClose,
}: PhotoUploadErrorModalProps) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();

  const title =
    variant === 'ai'
      ? t('onboarding.photo.aiRejectedTitle', 'AI-generated photo')
      : variant === 'moderation'
        ? t('onboarding.photo.notApproved', 'Photo not approved')
        : t('onboarding.photo.uploadFailed', 'Upload failed');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: th.surface }]}>
          <View style={styles.iconWrap}>
            {variant === 'ai' ? (
              <View style={styles.aiIconWrap}>
                <Text style={styles.aiEmoji}>{'\u{1F916}'}</Text>
                <View style={styles.aiWarningBadge}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                </View>
              </View>
            ) : (
              <Ionicons
                name={variant === 'moderation' ? 'shield-outline' : 'alert-circle'}
                size={40}
                color="#EF4444"
              />
            )}
          </View>
          <Text style={[styles.title, { color: th.text }]}>{title}</Text>
          {!!message && (
            <Text style={[styles.message, { color: th.textSecondary }]}>{message}</Text>
          )}
          <View style={styles.actions}>
            {onChooseAnother && (
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onChooseAnother}
              >
                <Text style={styles.btnTextPrimary}>
                  {t('onboarding.photo.chooseAnother', 'Choose Another Photo')}
                </Text>
              </TouchableOpacity>
            )}
            {onRetry && (
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={onRetry}
              >
                <Text style={styles.btnTextPrimary}>{t('common.retry')}</Text>
              </TouchableOpacity>
            )}
            {onRemove && (
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, { borderColor: th.border }]}
                onPress={onRemove}
              >
                <Text style={[styles.btnText, { color: th.textSecondary }]}>
                  {t('onboarding.photo.removePhoto', 'Remove Photo')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: th.border }]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: th.textSecondary }]}>
                {t('common.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: spacing.sm,
  },
  aiIconWrap: {
    position: 'relative',
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiEmoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  aiWarningBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginBottom: spacing.sm,
  },
  btn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  btnSecondary: {
    borderWidth: 1,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextPrimary: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
