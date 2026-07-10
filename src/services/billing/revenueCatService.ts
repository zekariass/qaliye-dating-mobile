/**
 * RevenueCat service wrapper.
 * Requires: react-native-purchases (already installed)
 * Requires EAS Build — not available in Expo Go.
 *
 * Environment variables needed:
 *   EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxx
 *   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxx
 */

import { Platform } from 'react-native';
import Purchases, {
    type CustomerInfo,
    type PurchasesOfferings,
    type PurchasesPackage,
    PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

function getApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? null;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? null;
  }
  return null;
}

let _configured = false;

export function configureRevenueCat(): void {
  if (Platform.OS === 'web') return;
  const apiKey = getApiKey();
  if (!apiKey) {
    if (__DEV__) {
      console.warn('[RevenueCat] API key not configured — set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY');
    }
    return;
  }
  if (!_configured) {
    Purchases.configure({ apiKey });
    _configured = true;
  }
}

export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!_configured) configureRevenueCat();
  if (!getApiKey()) return;
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] logIn failed', e);
  }
}

export async function logOutRevenueCat(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!_configured || !getApiKey()) return;
  try {
    await Purchases.logOut();
  } catch {
    // non-fatal
  }
}

export async function getRevenueCatOfferings(): Promise<PurchasesOfferings | null> {
  if (Platform.OS === 'web') return null;
  if (!_configured) configureRevenueCat();
  if (!getApiKey()) return null;
  try {
    const offerings = await Purchases.getOfferings();
    if (__DEV__) {
      const ids = Object.keys(offerings?.all ?? {});
      console.log('[RevenueCat] offerings fetched. IDs:', ids.length > 0 ? ids : '(empty)');
    }
    return offerings;
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] getOfferings failed', e);
    return null;
  }
}

export function findPackageInOfferings(
  offerings: PurchasesOfferings,
  offeringId: string,
  packageId: string,
): PurchasesPackage | null {
  const offering = offerings.all[offeringId];
  if (!offering) return null;
  return offering.availablePackages.find((pkg) => pkg.identifier === packageId) ?? null;
}

export async function purchaseRevenueCatPackage(pkg: PurchasesPackage): Promise<{
  customerInfo: CustomerInfo;
  cancelled: boolean;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { customerInfo, cancelled: false };
  } catch (e: unknown) {
    const err = e as { code?: string; userCancelled?: boolean };
    if (
      err.userCancelled === true ||
      err.code === String(PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR)
    ) {
      return { customerInfo: null as unknown as CustomerInfo, cancelled: true };
    }
    throw e;
  }
}

export async function restoreRevenueCatPurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo | null> {
  if (Platform.OS === 'web') return null;
  if (!_configured || !getApiKey()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export { PURCHASES_ERROR_CODE };
export type { CustomerInfo, PurchasesOfferings, PurchasesPackage };

