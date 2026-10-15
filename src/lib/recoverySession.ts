import * as SecureStore from 'expo-secure-store';

// A Supabase recovery link creates a real authenticated session. We persist a
// flag when a `type=recovery` deep link is handled so that the app bootstrap
// can distinguish a recovery session from a normal sign-in and keep the user
// pinned to the reset-password screen until the password is actually changed.
const KEY = 'qaliye.password-recovery-pending';

export async function markPasswordRecoveryPending(): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY, '1');
  } catch { /* non-fatal — bootstrap treats a missing flag as no recovery */ }
}

export async function isPasswordRecoveryPending(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function clearPasswordRecoveryPending(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch { /* non-fatal */ }
}
