import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/notifications/useNotificationPreferences';
import { useNotificationPermission } from '@/hooks/notifications/useNotificationPermission';
import type { NotificationPreferencesPatch } from '@/types/notifications';

const MARKETING_CONSENT_VERSION = '1.0';

type RowProps = {
  label: string;
  sublabel?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  isLoading?: boolean;
};

function PreferenceRow({ label, sublabel, value, onValueChange, disabled, isLoading }: RowProps) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: disabled ? th.textMuted : th.text }]}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={[styles.rowSublabel, { color: th.textMuted }]}>{sublabel}</Text>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: 'rgba(0,0,0,0.1)', true: colors.primary + 'AA' }}
          thumbColor={value ? colors.primary : '#ccc'}
        />
      )}
    </View>
  );
}

export function NotificationSettingsSection() {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const { status: permStatus, checkPermission } = useNotificationPermission();
  const { data: prefs, isLoading: isLoadingPrefs, isError } = useNotificationPreferences();
  const { mutate: updatePrefs, isPending: isUpdating } = useUpdateNotificationPreferences();
  const [pendingField, setPendingField] = useState<keyof NotificationPreferencesPatch | null>(null);

  const permGranted = permStatus === 'granted';
  const permDenied = permStatus === 'denied';

  const handleOpenDeviceSettings = useCallback(async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
    setTimeout(checkPermission, 1500);
  }, [checkPermission]);

  const update = useCallback(
    (patch: NotificationPreferencesPatch) => {
      const field = Object.keys(patch)[0] as keyof NotificationPreferencesPatch;
      setPendingField(field);
      updatePrefs(patch, {
        onSettled: () => setPendingField(null),
        onError: () => {
          Alert.alert(
            t('notifications.errorTitle', 'Update failed'),
            t('notifications.errorMessage', 'Could not save your preference. Please try again.'),
          );
        },
      });
    },
    [updatePrefs, t],
  );

  const handleMessagePreview = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        update({ messagePreviewEnabled: false });
        return;
      }
      Alert.alert(
        t('notifications.previewTitle', 'Message Previews'),
        t(
          'notifications.previewBody',
          'Message previews may show message text in notification banners or on the lock screen. Are you sure you want to enable this?',
        ),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('common.enable', 'Enable'),
            onPress: () => update({ messagePreviewEnabled: true }),
          },
        ],
      );
    },
    [update, t],
  );

  const handleMarketing = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        update({ marketingNotificationsEnabled: false });
        return;
      }
      Alert.alert(
        t('notifications.marketingConsentTitle', 'Offers and Updates'),
        t(
          'notifications.marketingConsentBody',
          'Qaliye may send you promotions, premium offers, feature updates, and occasional re-engagement messages. You can turn this off at any time.',
        ),
        [
          { text: t('common.cancel', 'Cancel'), style: 'cancel' },
          {
            text: t('notifications.agree', 'I Agree'),
            onPress: () =>
              update({
                marketingNotificationsEnabled: true,
                marketingNotificationsConsentVersion: MARKETING_CONSENT_VERSION,
              }),
          },
        ],
      );
    },
    [update, t],
  );

  if (isLoadingPrefs) {
    return (
      <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
        <Text style={[styles.sectionTitle, { color: th.text }]}>
          {t('notifications.title', 'Notifications')}
        </Text>
        <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />
      </View>
    );
  }

  const pushEnabled = prefs?.pushEnabled ?? false;
  const categoryDisabled = !pushEnabled || !permGranted;

  return (
    <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
      <Text style={[styles.sectionTitle, { color: th.text }]}>
        {t('notifications.title', 'Notifications')}
      </Text>
      <Text style={[styles.sectionSubtitle, { color: th.textSecondary }]}>
        {t('notifications.subtitle', 'Choose how Qaliye notifies you.')}
      </Text>

      {/* Device permission status row */}
      <View style={[styles.permRow, { borderColor: permGranted ? colors.success + '44' : colors.warning + '44', backgroundColor: permGranted ? colors.success + '10' : colors.warning + '10' }]}>
        <Ionicons
          name={permGranted ? 'checkmark-circle' : 'warning-outline'}
          size={18}
          color={permGranted ? colors.success : colors.warning}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.permText, { color: th.text }]}>
            {permGranted
              ? t('notifications.deviceEnabled', 'Notifications enabled on this device')
              : t('notifications.deviceDisabled', 'Notifications disabled in device settings')}
          </Text>
        </View>
        {permDenied && (
          <Pressable
            onPress={handleOpenDeviceSettings}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.openSettings', 'Open device settings')}
          >
            <Text style={[styles.openSettings, { color: colors.primary }]}>
              {t('notifications.openSettings', 'Open Settings')}
            </Text>
          </Pressable>
        )}
      </View>

      {isError && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {t('notifications.loadError', 'Could not load notification preferences.')}
        </Text>
      )}

      {prefs && (
        <>
          <View style={[styles.divider, { borderColor: th.border }]} />

          <PreferenceRow
            label={t('notifications.pushEnabled', 'Push notifications')}
            sublabel={
              !pushEnabled
                ? t('notifications.pushPaused', 'Normal push notifications are paused for this account')
                : undefined
            }
            value={pushEnabled}
            onValueChange={(v) => update({ pushEnabled: v })}
            isLoading={pendingField === 'pushEnabled' && isUpdating}
          />

          {!pushEnabled && (
            <Text style={[styles.masterOffNote, { color: th.textMuted }]}>
              {t('notifications.masterOffNote', 'Category settings are preserved but notifications will not be sent.')}
            </Text>
          )}

          <View style={[styles.divider, { borderColor: th.border }]} />

          <PreferenceRow
            label={t('notifications.messages', 'Messages')}
            value={prefs.messageNotificationsEnabled}
            onValueChange={(v) => update({ messageNotificationsEnabled: v })}
            disabled={categoryDisabled}
            isLoading={pendingField === 'messageNotificationsEnabled' && isUpdating}
          />

          <View style={[styles.divider, { borderColor: th.border }]} />

          <PreferenceRow
            label={t('notifications.matches', 'New matches')}
            value={prefs.matchNotificationsEnabled}
            onValueChange={(v) => update({ matchNotificationsEnabled: v })}
            disabled={categoryDisabled}
            isLoading={pendingField === 'matchNotificationsEnabled' && isUpdating}
          />

          <View style={[styles.divider, { borderColor: th.border }]} />

          <PreferenceRow
            label={t('notifications.likes', 'Likes and superlikes')}
            value={prefs.likeNotificationsEnabled}
            onValueChange={(v) => update({ likeNotificationsEnabled: v })}
            disabled={categoryDisabled}
            isLoading={pendingField === 'likeNotificationsEnabled' && isUpdating}
          />

          <View style={[styles.divider, { borderColor: th.border }]} />

          <PreferenceRow
            label={t('notifications.messagePreview', 'Message previews')}
            sublabel={t(
              'notifications.messagePreviewSub',
              'Show message content in notification banners',
            )}
            value={prefs.messagePreviewEnabled}
            onValueChange={handleMessagePreview}
            disabled={categoryDisabled}
            isLoading={pendingField === 'messagePreviewEnabled' && isUpdating}
          />

          <View style={[styles.divider, { borderColor: th.border }]} />

          <PreferenceRow
            label={t('notifications.marketing', 'Offers and updates')}
            sublabel={t('notifications.marketingSub', 'Promotions and feature announcements')}
            value={prefs.marketingNotificationsEnabled}
            onValueChange={handleMarketing}
            disabled={!pushEnabled || !permGranted}
            isLoading={pendingField === 'marketingNotificationsEnabled' && isUpdating}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  permText: {
    fontSize: 13,
    fontWeight: '500',
  },
  openSettings: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    minHeight: 52,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  rowSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  masterOffNote: {
    fontSize: 12,
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  errorText: {
    fontSize: 13,
    paddingTop: 8,
  },
});
