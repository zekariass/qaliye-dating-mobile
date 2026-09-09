import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'qaliye_payment_phone';

/**
 * Strip spaces, dashes, parentheses from a phone input string.
 */
export function sanitizePhone(input: string): string {
  return input.replace(/[\s\-()]/g, '');
}

/**
 * Validate an Ethiopian phone number.
 * Accepts:
 *   - 09XXXXXXXXX  (starts with 0, exactly 10 digits)
 *   - 251XXXXXXXXX (starts with 251, exactly 12 digits)
 *   - +251XXXXXXXXX (starts with +251, exactly 13 digits)
 * The local number after the prefix must start with 7 or 9.
 */
export function isValidEthiopianPhone(raw: string): boolean {
  const phone = sanitizePhone(raw);
  if (!phone) return false;

  // 0 + 9 digits = 10 total
  if (/^0\d{9}$/.test(phone)) {
    return /^[79]/.test(phone.slice(1));
  }
  // 251 + 9 digits = 12 total
  if (/^251\d{9}$/.test(phone)) {
    return /^[79]/.test(phone.slice(3));
  }
  // +251 + 9 digits = 13 total (including the +)
  if (/^\+251\d{9}$/.test(phone)) {
    return /^[79]/.test(phone.slice(4));
  }
  return false;
}

/** Persist the phone number for future purchases. */
export async function cachePaymentPhone(phone: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, phone);
  } catch {
    // Non-blocking — user will just re-enter next time.
  }
}

/** Read the previously cached phone number, or null. */
export async function getCachedPaymentPhone(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
