import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Modal,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadows, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { NotificationSettingsSection } from './NotificationSettingsSection';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function NotificationSettingsSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const { bottom: safeBottom } = useSafeAreaInsets();

  const handleClose = useCallback(() => onClose(), [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/*
          Backdrop and sheet are SIBLINGS — not parent/child.
          Touches inside the sheet never bubble up to the backdrop's TouchableOpacity,
          so the sheet's ScrollView receives scroll gestures unobstructed.
        */}
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
          <View style={[styles.handle, { backgroundColor: th.border }]} />

          <View style={styles.closeRow}>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel={t('common.close', 'Close')}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={22} color={th.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <NotificationSettingsSection />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(8, 5, 18, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    maxHeight: '88%',
    ...shadows.soft,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: spacing.xs,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
});
