import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChapaCheckoutModal } from '@/components/billing/ChapaCheckoutModal';
import { OrderStatusBanner } from '@/components/billing/OrderStatusBanner';
import { colors } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useOrderStatus } from '@/hooks/billing/useOrderStatus';
import { useTheme } from '@/hooks/use-theme';

export default function OrderStatusScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const params = useLocalSearchParams<{ orderId?: string; checkoutUrl?: string }>();
  const orderId = params.orderId ?? null;
  const checkoutUrl = params.checkoutUrl;

  const { order, isLoading, refresh, isTerminal, isChapaOrder, verifyChapa } = useOrderStatus(orderId);
  const { refreshEntitlements } = useEntitlements();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (order?.status === 'VERIFIED' || order?.status === 'FULFILLED') {
      refreshEntitlements();
    }
  }, [order?.status, refreshEntitlements]);

  // Auto-open checkout modal when order has a checkout URL
  useEffect(() => {
    if (!orderId) return;
    const url = checkoutUrl ?? order?.provider_checkout_url;
    if (!url) return;
    if (!order || (order.status !== 'AWAITING_PAYMENT' && order.status !== 'CREATED')) return;
    setShowCheckoutModal(true);
  }, [orderId, checkoutUrl, order?.provider_checkout_url, order?.status]);

  const returnUrl = Linking.createURL('payments/chapa/callback', { scheme: 'qaliyedating' });

  const handleCheckoutReturned = useCallback(() => {
    setShowCheckoutModal(false);
    if (!hasVerifiedRef.current) {
      hasVerifiedRef.current = true;
      verifyChapa();
    }
  }, [verifyChapa]);

  const handleCheckoutClose = useCallback(() => {
    setShowCheckoutModal(false);
    if (!hasVerifiedRef.current) {
      hasVerifiedRef.current = true;
      verifyChapa();
    }
  }, [verifyChapa]);

  const handleDone = useCallback(() => {
    router.replace('/(app)/balances' as any);
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: top }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: th.backgroundElement }]}
          onPress={handleDone}
          accessibilityRole="button"
          accessibilityLabel={t('common.back', 'Back')}
        >
          <Ionicons name="chevron-back" size={20} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>
          {t('billing.orderStatusTitle', 'Payment Status')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !order ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !order ? (
          <View style={styles.centered}>
            <Text style={[styles.errorText, { color: th.textSecondary }]}>
              {t('billing.orderNotFound', 'Order not found.')}
            </Text>
          </View>
        ) : (
          <>
            <OrderStatusBanner
              status={order.status}
              textColor={th.text}
              secondaryColor={th.textSecondary}
            />

            {order.status === 'REJECTED' && order.status_reason && order.status_reason.toLowerCase().includes('transaction used in another app') ? (
              <Text style={[styles.statusReason, { color: colors.danger }]}>
                {t('billing.transactionUsedInAnotherApp', 'This transaction was already used in another application. Please use a new transaction.')}
              </Text>
            ) : order.status_reason ? (
              <Text style={[styles.statusReason, { color: th.textSecondary }]}>
                {order.status_reason}
              </Text>
            ) : null}

            <View style={[styles.detailCard, { backgroundColor: th.surface, borderColor: th.border }]}>
              <DetailRow label={t('billing.orderReference', 'Order ref')} value={order.order_reference} textColor={th.text} secondaryColor={th.textSecondary} />
              <DetailRow label={t('billing.amount', 'Amount')} value={`${(order.expected_amount_minor_units / 100).toFixed(2)} ${order.expected_currency}`} textColor={th.text} secondaryColor={th.textSecondary} />
              <DetailRow label={t('billing.paymentMethod', 'Method')} value={order.payment_method_display_name} textColor={th.text} secondaryColor={th.textSecondary} />
              {order.expires_at && (
                <DetailRow
                  label={t('billing.orderExpires', 'Expires')}
                  value={new Date(order.expires_at).toLocaleString()}
                  textColor={th.text}
                  secondaryColor={th.textSecondary}
                />
              )}
            </View>

            {(order.status === 'AWAITING_PAYMENT' || order.status === 'CREATED') && (checkoutUrl || order.provider_checkout_url) && (
              <View style={styles.pollingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.pollingText, { color: th.textSecondary }]}>
                  {showCheckoutModal
                    ? t('billing.openingCheckout', 'Complete your payment...')
                    : t('billing.verifyingPayment', 'Verifying your payment...')}
                </Text>
              </View>
            )}

            {isChapaOrder && !isTerminal && (order.status === 'VERIFICATION_PENDING') && (
              <View style={styles.pollingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.pollingText, { color: th.textSecondary }]}>
                  {t('billing.verifyingPayment', 'Verifying your payment...')}
                </Text>
              </View>
            )}

            {!isTerminal && (
              <Pressable
                style={[styles.refreshBtn, { borderColor: th.border, backgroundColor: th.surface }]}
                onPress={refresh}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                    <Text style={[styles.refreshText, { color: colors.primary }]}>
                      {t('billing.checkStatus', 'Check status')}
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {(order.status === 'REJECTED' || order.status === 'EXPIRED' || order.status === 'CANCELLED') && (

              <Pressable
                style={styles.primaryBtn}
                onPress={handleDone}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>
                  {order.status === 'CANCELLED'
                    ? t('billing.returnToOffers', 'Return to offers')
                    : t('billing.tryAgain', 'Try a new order')}
                </Text>
              </Pressable>
            )}

            {(order.status === 'VERIFIED' || order.status === 'FULFILLED') && (
              <Pressable style={styles.primaryBtn} onPress={handleDone} accessibilityRole="button">
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>{t('billing.done', 'Done')}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {(() => {
        const url = checkoutUrl ?? order?.provider_checkout_url;
        if (!url || !isChapaOrder) return null;
        return (
          <ChapaCheckoutModal
            visible={showCheckoutModal}
            checkoutUrl={url}
            returnUrl={returnUrl}
            onClose={handleCheckoutClose}
            onReturned={handleCheckoutReturned}
          />
        );
      })()}
    </View>
  );
}

function DetailRow({ label, value, textColor, secondaryColor }: {
  label: string;
  value: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: secondaryColor }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  centered: { paddingVertical: 60, alignItems: 'center' },
  errorText: { fontSize: 14, textAlign: 'center' },
  statusReason: { fontSize: 13, fontStyle: 'italic', paddingHorizontal: 4 },
  detailCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 14,
  },
  refreshText: { fontSize: 15, fontWeight: '600' },
  pollingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  pollingText: { fontSize: 14, fontWeight: '500' },
});
