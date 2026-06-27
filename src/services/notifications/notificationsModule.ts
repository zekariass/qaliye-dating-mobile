import type * as NotificationsType from 'expo-notifications';

/**
 * Safe lazy-loader for expo-notifications.
 *
 * In Expo Go SDK 53+ push-notification native APIs throw at module evaluation
 * time on Android. We catch that here so the rest of the app keeps working.
 * All notification hooks guard on `if (!Expo) return;` before using this.
 */
let Expo: typeof NotificationsType | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Expo = require('expo-notifications') as typeof NotificationsType;
} catch {
  // Running in Expo Go SDK 53+ — push notifications unavailable
}

export { Expo };
