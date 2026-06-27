import AsyncStorage from '@react-native-async-storage/async-storage';

import { generateUUID } from '@/utils/uuid';

const INSTALLATION_ID_KEY = 'qaliye_notification_installation_id';

let cachedInstallationId: string | null = null;

export async function getOrCreateInstallationId(): Promise<string> {
  if (cachedInstallationId) {
    return cachedInstallationId;
  }

  const stored = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (stored) {
    cachedInstallationId = stored;
    return stored;
  }

  const newId = generateUUID();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, newId);
  cachedInstallationId = newId;
  return newId;
}

export async function readInstallationId(): Promise<string | null> {
  if (cachedInstallationId) return cachedInstallationId;
  return AsyncStorage.getItem(INSTALLATION_ID_KEY);
}
