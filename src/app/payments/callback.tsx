/**
 * Unified payment callback deep-link handler.
 *
 * External payment providers (ArifPay, and any future provider) redirect the
 * user's browser back to the app via a deep link after payment completes.
 * This screen catches those deep links and forwards the user to the
 * order-status screen so they can see the result.
 *
 * URL patterns handled (all resolve to this file via Expo Router):
 *   qaliyedating://payments/callback?orderId=<id>&provider=<name>
 *
 * Backend configuration (Spring Boot example):
 *   return-url: qaliyedating://payments/callback?orderId={orderId}&provider=arifpay
 *   cancel-url: qaliyedating://payments/callback?orderId={orderId}&provider=arifpay&status=cancelled
 *   error-url:  qaliyedating://payments/callback?orderId={orderId}&provider=arifpay&status=error
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';

export default function PaymentCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    provider?: string;
    status?: string;
  }>();

  useEffect(() => {
    const orderId = params.orderId;

    if (orderId) {
      // Navigate to the order-status screen with the orderId so it can
      // poll/verify the payment result regardless of provider.
      router.replace({
        pathname: '/(app)/order-status' as any,
        params: { orderId },
      });
    } else {
      // No orderId in the callback — fall back to balances screen.
      router.replace('/(app)/balances' as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show a spinner while redirecting — visible for at most one frame.
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
