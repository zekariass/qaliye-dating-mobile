import { Ionicons } from '@expo/vector-icons';
import * as ExpoClipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HtmlText } from '@/components/billing/HtmlText';
import { OrderStatusBanner } from '@/components/billing/OrderStatusBanner';
import { themedError } from '@/components/common/ThemedAlert';
import { colors } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useManualTransferVerify } from '@/hooks/billing/useManualTransferVerify';
import { useOffers } from '@/hooks/billing/useOffers';
import { useOrderStatus } from '@/hooks/billing/useOrderStatus';
import { usePaymentOptions } from '@/hooks/billing/usePaymentOptions';
import { useVerifyPayment } from '@/hooks/billing/useVerifyPayment';
import { useTheme } from '@/hooks/use-theme';
import type { VerificationField } from '@/types/billing';

type Step = 'form' | 'status';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'This payment reference has already been used by another user. Please check your transaction number and try again.',
  invalid_reference: 'The transaction reference you entered is invalid. Please verify and try again.',
  already_verified: 'This payment has already been verified.',
  duplicate_submission: 'A verification has already been submitted for this payment.',
};

function extractErrorMessage(e: unknown): string {
  const axiosErr = e as { response?: { status?: number; data?: { message?: string; error?: string | { code?: string; message?: string }; detail?: string } }; message?: string };
  const errObj = axiosErr?.response?.data?.error;
  const backendMsg = typeof errObj === 'object' && errObj !== null
    ? (errObj.message ?? errObj.code)
    : (errObj ?? axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.detail);
  if (backendMsg && ERROR_MESSAGES[backendMsg]) {
    return ERROR_MESSAGES[backendMsg];
  }
  if (backendMsg) {
    return backendMsg;
  }
  if (axiosErr?.response?.status === 403) {
    return 'Access denied. This payment reference may have been used by another user.';
  }
  return axiosErr?.message ?? 'Something went wrong. Please try again.';
}

function useExpiryCountdown(expiresAt: string | undefined) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    setSecondsLeft(calc());
    const id = setInterval(() => setSecondsLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return secondsLeft;
}

export default function ManualPaymentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const params = useLocalSearchParams<{ orderId?: string; methodId?: string; offerId?: string; initialStep?: string }>();
  const orderId = params.orderId ?? '';
  const methodId = params.methodId ?? '';
  const offerId = params.offerId ?? '';
  const isManualTransferMode = !orderId && !!methodId && !!offerId;
  const initialStep: Step = params.initialStep === 'status' ? 'status' : 'form';

  const [step, setStep] = useState<Step>(initialStep);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const hasRefreshedEntitlements = useRef(false);

  const effectiveOrderId = orderId || createdOrderId;
  const { order, isLoading: loadingOrder, isPolling, error: orderError, refresh } = useOrderStatus(effectiveOrderId);
  const { paymentMethods } = usePaymentOptions(isManualTransferMode ? 'MANUAL_TRANSFER' : undefined);
  const { mutate: verifyExisting, isPending: isVerifyingExisting } = useVerifyPayment(orderId || 'pending');
  const { mutate: verifyManualTransfer, isPending: isVerifyingManual } = useManualTransferVerify();
  const { allOffers, invalidateOffers } = useOffers();
  const { refreshEntitlements } = useEntitlements();

  const isVerifying = isVerifyingExisting || isVerifyingManual;

  const selectedMethod = useMemo(
    () => {
      if (order) {
        return paymentMethods.find((m) => m.id === order.payment_method_id) ?? null;
      }
      if (isManualTransferMode) {
        return paymentMethods.find((m) => m.id === methodId) ?? null;
      }
      return null;
    },
    [order, paymentMethods, isManualTransferMode, methodId],
  );

  const selectedOffer = useMemo(
    () => (isManualTransferMode ? (allOffers.find((o) => o.id === offerId) ?? null) : null),
    [isManualTransferMode, allOffers, offerId],
  );

  const instructionsHtml = useMemo(
    () => order?.payment_instructions?.instruction_text || selectedMethod?.payment_instructions || null,
    [order, selectedMethod],
  );

  const fields: VerificationField[] = selectedMethod?.verification_params?.fields ?? [];

  const amountDisplay = useMemo(() => {
    if (order) {
      return `${(order.expected_amount_minor_units / 100).toFixed(2)} ${order.expected_currency}`;
    }
    if (isManualTransferMode && selectedOffer) {
      return selectedOffer.display_price;
    }
    return '';
  }, [order, isManualTransferMode, selectedOffer]);

  const secondsLeft = useExpiryCountdown(order?.expires_at);
  const isExpired = secondsLeft !== null && secondsLeft <= 0;
  const warnExpiry = secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 300;

  useEffect(() => {
    if (
      !hasRefreshedEntitlements.current &&
      (order?.status === 'VERIFIED' || order?.status === 'FULFILLED')
    ) {
      hasRefreshedEntitlements.current = true;
      refreshEntitlements();
    }
  }, [order?.status, refreshEntitlements]);

  const handleFieldChange = useCallback((name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleVerify = useCallback(() => {
    if (!order && !isManualTransferMode) return;
    if (isManualTransferMode && !selectedMethod) return;

    for (const field of fields) {
      const val = fieldValues[field.name]?.trim() ?? '';
      if (field.required && !val) {
        themedError(t('billing.fieldRequired', '{{label}} is required', { label: field.label }));
        return;
      }
      if (field.pattern && val) {
        try {
          const regex = new RegExp(field.pattern);
          if (!regex.test(val)) {
            themedError(t('billing.fieldInvalid', '{{label}} format is invalid', { label: field.label }));
            return;
          }
        } catch {}
      }
      if (field.min_length && val.length < field.min_length) {
        themedError(t('billing.fieldTooShort', '{{label}} must be at least {{n}} characters', { label: field.label, n: String(field.min_length) }));
        return;
      }
      if (field.max_length && val.length > field.max_length) {
        themedError(t('billing.fieldTooLong', '{{label}} must be at most {{n}} characters', { label: field.label, n: String(field.max_length) }));
        return;
      }
    }

    if (isExpired) {
      themedError(
        t('billing.orderExpiredTitle', 'Order Expired'),
        t('billing.orderExpiredMsg', 'This order has expired. Please start a new order.'),
      );
      return;
    }

    const verificationFields: Record<string, string> = {};
    for (const field of fields) {
      const val = fieldValues[field.name]?.trim();
      if (val) verificationFields[field.name] = val;
    }

    if (isManualTransferMode) {
      console.log('[ManualPaymentScreen] verifyManualTransfer call:', {
        payment_offer_id: offerId,
        payment_method_id: methodId,
        verification_data: verificationFields,
        fieldValues,
        fields,
      });
      verifyManualTransfer(
        {
          payment_offer_id: offerId,
          payment_method_id: methodId,
          verification_data: verificationFields,
        },
        {
          onSuccess: (response) => {
            setCreatedOrderId(response.order_id);
            setStep('status');
            invalidateOffers();
          },
          onError: (e) => {
            const msg = extractErrorMessage(e);
            themedError(
              t('billing.verifyFailed', 'Verification failed'),
              msg,
            );
          },
        },
      );
    } else {
      verifyExisting(
        {
          verification_fields: verificationFields,
          submitted_amount_minor_units: order!.expected_amount_minor_units,
          submitted_currency: order!.expected_currency,
        },
        {
          onSuccess: () => {
            setStep('status');
            invalidateOffers();
          },
          onError: (e) => {
            const msg = extractErrorMessage(e);
            themedError(
              t('billing.verifyFailed', 'Verification failed'),
              msg,
            );
          },
        },
      );
    }
  }, [order, isManualTransferMode, selectedMethod, fields, fieldValues, isExpired, verifyExisting, verifyManualTransfer, offerId, methodId, t]);

  const copyToClipboard = useCallback((value: string) => {
    ExpoClipboard.setStringAsync(value);
  }, []);

  if (!orderId && !isManualTransferMode) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background, paddingTop: top }]}>
        <Text style={{ color: th.textSecondary, fontSize: 14 }}>
          {t('billing.orderNotFound', 'Order not found.')}
        </Text>
      </View>
    );
  }

  if (isManualTransferMode && !selectedMethod) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background, paddingTop: top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (orderId && loadingOrder && !order) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background, paddingTop: top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: th.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={[styles.topArea, { paddingTop: top }]}>
        <View style={styles.header}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: th.backgroundElement }]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={th.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: th.text }]}>
            {t('billing.manualPaymentTitle', 'Manual Payment')}
          </Text>
          <View style={{ width: 36 }} />
        </View>

      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {step === 'form' && selectedMethod && (
          <>
            <View style={[styles.card, { backgroundColor: '#1E3A5F', borderColor: '#2C5282' }]}>
              <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>
                {t('billing.paymentInstructions', 'Payment Instructions')}
              </Text>

              {instructionsHtml ? (
                <HtmlText html={instructionsHtml} color="#FFFFFF" secondaryColor="#B3D9F2" />
              ) : null}

              <View style={[styles.divider, { backgroundColor: '#2C5282' }]} />

              <InstructionRow
                label={t('billing.amount', 'Amount')}
                value={amountDisplay}
                onCopy={copyToClipboard}
                textColor="#FFFFFF"
                secondaryColor="#B3D9F2"
              />
              {order && (
                <InstructionRow
                  label={t('billing.orderRef', 'Order reference')}
                  value={order.order_reference}
                  onCopy={copyToClipboard}
                  textColor="#FFFFFF"
                  secondaryColor="#B3D9F2"
                />
              )}
              <InstructionRow
                label={t('billing.paymentMethod', 'Payment method')}
                value={order?.payment_method_display_name ?? selectedMethod.display_name}
                textColor="#FFFFFF"
                secondaryColor="#B3D9F2"
              />
            </View>

            <View style={[styles.noteCard, { backgroundColor: colors.verifiedBlue + '12', borderColor: colors.verifiedBlue + '30' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.verifiedBlue} />
              <Text style={[styles.noteText, { color: th.text }]}>
                {t('billing.payFirstNote', 'Complete your payment using the instructions above, then fill in the verification details below.')}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
              <Text style={[styles.cardTitle, { color: th.text }]}>
                {t('billing.verifyPaymentTitle', 'Verify Your Payment')}
              </Text>

              {fields.length > 0 ? (
                fields.map((field) => (
                  <View key={field.name} style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: th.text }]}>
                      {field.label}
                      {field.required && <Text style={{ color: colors.danger }}> *</Text>}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        { color: th.text, borderColor: th.border, backgroundColor: th.backgroundElement },
                      ]}
                      value={fieldValues[field.name] ?? ''}
                      onChangeText={(v) => handleFieldChange(field.name, v)}
                      placeholder={field.hint ?? field.label}
                      placeholderTextColor={th.textMuted}
                      keyboardType={field.type === 'number' || field.type === 'tel' ? 'numeric' : 'default'}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={field.max_length}
                    />
                    {field.hint && (
                      <Text style={[styles.fieldHint, { color: th.textSecondary }]}>{field.hint}</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={[styles.cardBody, { color: th.textSecondary }]}>
                  {t('billing.noVerificationFields', 'No additional details required for this payment method.')}
                </Text>
              )}
            </View>

            <Pressable
              style={[styles.primaryBtn, (isVerifying || isExpired) && styles.disabledBtn]}
              onPress={handleVerify}
              disabled={isVerifying || isExpired}
              accessibilityRole="button"
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {t('billing.submitVerification', 'Submit Verification')}
                  </Text>
                </>
              )}
            </Pressable>

            {isExpired && (
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => router.back()}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                  {t('billing.startNewOrder', 'Start a New Order')}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {step === 'status' && !order && orderError && (
          <View style={[styles.card, { backgroundColor: th.surface, borderColor: colors.danger + '30', padding: 24, gap: 0 }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ backgroundColor: colors.danger + '15', borderRadius: 40, padding: 14, marginBottom: 12 }}>
                <Ionicons name="close-circle-outline" size={36} color={colors.danger} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: th.text, textAlign: 'center', marginBottom: 6 }}>
                {t('billing.noAccess', 'No Access')}
              </Text>
              <Text style={{ fontSize: 13, color: th.textSecondary, textAlign: 'center', lineHeight: 19 }}>
                {t('billing.noAccessMsg', 'You do not have access to this payment. Please check your reference and try again.')}
              </Text>
            </View>
            <Pressable
              style={[styles.primaryBtn, { marginTop: 4 }]}
              onPress={() => router.back()}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {t('billing.goBack', 'Go Back')}
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'status' && !order && !orderError && (
          <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border, paddingVertical: 32 }]}>
            <Text style={[styles.cardBody, { color: th.textSecondary, textAlign: 'center' }]}>
              {t('billing.loadingOrder', 'Loading order status...')}
            </Text>
          </View>
        )}

        {step === 'status' && order && (
          <>
            {(order.verification_count ?? 0) > 1 ? (
              <View style={[styles.noteCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={[styles.noteText, { color: th.text }]}>
                  {t('billing.alreadyVerified', 'This payment was verified before. Please verify a new payment.')}
                </Text>
              </View>
            ) : (
              <OrderStatusBanner status={order.status} textColor={th.text} secondaryColor={th.textSecondary} />
            )}

            {order.can_contact_support && (order.status === 'REJECTED' || order.status === 'MANUAL_REVIEW' || order.status === 'ADMIN_REVIEW' || order.status === 'REVIEW_REQUIRED') && (
              <Pressable
                style={[styles.refreshBtn, { borderColor: th.border }]}
                onPress={() => router.push('/(app)/support' as any)}
                accessibilityRole="button"
              >
                <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                <Text style={[styles.refreshText, { color: colors.primary }]}>
                  {t('billing.contactSupport', 'Contact Support')}
                </Text>
              </Pressable>
            )}

            {(order.status === 'REJECTED' || order.status === 'EXPIRED' || order.status === 'CANCELLED') && (
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => router.back()}
                accessibilityRole="button"
              >
                <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
                  {t('billing.startNewOrder', 'Start a New Order')}
                </Text>
              </Pressable>
            )}

            {order.status === 'VERIFICATION_PENDING' && (
              <Pressable
                style={[styles.refreshBtn, { borderColor: th.border, opacity: (isPolling || loadingOrder) ? 0.5 : 1 }]}
                onPress={refresh}
                disabled={isPolling || loadingOrder}
                accessibilityRole="button"
              >
                {(isPolling || loadingOrder) ? (
                  <>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.refreshText, { color: colors.primary }]}>
                      {t('billing.checking', 'Checking...')}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color={colors.primary} />
                    <Text style={[styles.refreshText, { color: colors.primary }]}>
                      {t('billing.checkStatus', 'Check Status')}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InstructionRow({
  label, value, onCopy, textColor, secondaryColor,
}: {
  label: string;
  value: string;
  onCopy?: (v: string) => void;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={styles.instrRow}>
      <Text style={[styles.instrLabel, { color: secondaryColor }]}>{label}</Text>
      <View style={styles.instrValueRow}>
        <Text style={[styles.instrValue, { color: textColor }]}>{value}</Text>
        {onCopy && (
          <Pressable onPress={() => onCopy(value)} accessibilityRole="button" accessibilityLabel="Copy">
            <Ionicons name="copy-outline" size={16} color={secondaryColor} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topArea: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  expiryText: { fontSize: 12, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardBody: { fontSize: 13, lineHeight: 18 },
  divider: { height: 1 },
  instrRow: { gap: 2 },
  instrLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  instrValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  instrValue: { fontSize: 14, fontWeight: '600', flex: 1 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  amountLabel: { fontSize: 13 },
  amountValue: { fontSize: 15, fontWeight: '700' },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  fieldHint: { fontSize: 12, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '500' },
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
});
