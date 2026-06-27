import { Platform } from 'react-native';

import { Expo } from './notificationsModule';

export const QALIYE_CHANNEL_ID = 'qaliye-default';

export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!Expo) return;

  await Expo.setNotificationChannelAsync(QALIYE_CHANNEL_ID, {
    name: 'Qaliye',
    description: 'Messages, matches, likes, and account notifications',
    importance: Expo.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    enableLights: true,
    lightColor: '#8A2CFF',
    lockscreenVisibility: Expo.AndroidNotificationVisibility.PRIVATE,
    bypassDnd: false,
    showBadge: true,
  });
}
