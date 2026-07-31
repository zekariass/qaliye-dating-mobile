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
    View
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
  transaction_already_used: 'This transaction has already been used for a payment. Please use a new transaction.',
  transaction_under_review: 'This transaction is currently under review. Please wait for the review to complete or use a different transaction.',
  transaction_rejected: 'This transaction was previously rejected. Please use a new transaction.',
  transaction_expired: 'This transaction has expired. Please make a new payment and try again.',
  transaction_cancelled: 'This transaction was previously cancelled. Please use a new transaction.',
};

const TERMINAL_TRANSACTION_ERRORS = new Set([
  'transaction_already_used',
  'transaction_rejected',
  'transaction_expired',
  'transaction_cancelled',
]);

function extractErrorMessage(e: unknown): string {
  const axiosErr = e as { response?: { status?: number; data?: { message?: string; error?: string | { code?: string; message?: string; reason?: string }; detail?: string; reason?: string } }; message?: string };
  const errObj = axiosErr?.response?.data?.error;
  const reason = (typeof errObj === 'object' && errObj !== null ? errObj.reason : undefined) ?? axiosErr?.response?.data?.reason;
  const backendMsg = typeof errObj === 'object' && errObj !== null
    ? (errObj.message ?? errObj.code)
    : (errObj ?? axiosErr?.response?.data?.message ?? axiosErr?.response?.data?.detail);
  if (backendMsg && ERROR_MESSAGES[backendMsg]) {
    return ERROR_MESSAGES[backendMsg];
  }
  if (reason && ERROR_MESSAGES[reason]) {
    return ERROR_MESSAGES[reason];
  }
  if (backendMsg) {
    return backendMsg;
  }
  if (axiosErr?.response?.status === 403) {
    return 'Access denied. This payment reference may have been used by another user.';
  }
  return axiosErr?.message ?? 'Something went wrong. Please try again.';
}

function isTerminalTransactionError(e: unknown): boolean {
  const axiosErr = e as { response?: { data?: { error?: string | { code?: string; reason?: string }; reason?: string } } };
  const errObj = axiosErr?.response?.data?.error;
  const reason = (typeof errObj === 'object' && errObj !== null ? errObj.reason : undefined) ?? axiosErr?.response?.data?.reason;
  const code = typeof errObj === 'object' && errObj !== null ? errObj.code : errObj;
  return TERMINAL_TRANSACTION_ERRORS.has(code ?? '') || TERMINAL_TRANSACTION_ERRORS.has(reason ?? '');
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
            if (isTerminalTransactionError(e)) {
              setFieldValues({});
            }
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
            if (isTerminalTransactionError(e)) {
              setFieldValues({});
            }
            themedError(
              t('billing.verifyFailed', 'Verification failed'),
              msg,
            );
          },
        },
      );
    }
  }, [order, isManualTransferMode, selectedMethod, fields, fieldValues, isExpired, verifyExisting, verifyManualTransfer, offerId, methodId, t]);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const copyToClipboard = useCallback((value: string, fieldLabel?: string) => {
    ExpoClipboard.setStringAsync(value);
    if (fieldLabel) {
      setCopiedField(fieldLabel);
      setTimeout(() => setCopiedField(null), 2000);
    }
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

  const currentStepIndex = step === 'form' ? 1 : 2;

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

        <StepIndicator currentStep={currentStepIndex} textColor={th.text} secondaryColor={th.textSecondary} surfaceColor={th.surface} borderColor={th.border} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {step === 'form' && selectedMethod && (
          <>
            <View style={[styles.instructionCard, { backgroundColor: th.surface, borderColor: th.border }]}>
              <View style={styles.instructionHeader}>
                <View style={[styles.instructionIconCircle, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.instructionTitle, { color: th.text }]}>
                  {t('billing.paymentInstructions', 'Payment Instructions')}
                </Text>
              </View>

              {instructionsHtml ? (
                <View style={[styles.instructionsBody, { backgroundColor: th.backgroundElement, borderRadius: 10 }]}>
                  <HtmlText html={instructionsHtml} color={th.text} secondaryColor={th.textSecondary} />
                </View>
              ) : null}

              <View style={[styles.divider, { backgroundColor: th.border }]} />

              {order && (
                <InstructionRow
                  label={t('billing.orderRef', 'Order reference')}
                  value={order.order_reference}
                  onCopy={(v) => copyToClipboard(v, 'orderRef')}
                  textColor={th.text}
                  secondaryColor={th.textSecondary}
                  copied={copiedField === 'orderRef'}
                />
              )}
              <View style={styles.instrHorizontal}>
                <View style={styles.instrHalf}>
                  <InstructionRow
                    label={t('billing.amount', 'Amount')}
                    value={amountDisplay}
                    onCopy={(v) => copyToClipboard(v, 'amount')}
                    textColor={th.text}
                    secondaryColor={th.textSecondary}
                    copied={copiedField === 'amount'}
                  />
                </View>
                <View style={styles.instrHalf}>
                  <InstructionRow
                    label={t('billing.paymentMethod', 'Method')}
                    value={order?.payment_method_display_name ?? selectedMethod.display_name}
                    textColor={th.text}
                    secondaryColor={th.textSecondary}
                  />
                </View>
              </View>
            </View>

            {secondsLeft !== null && !isExpired && warnExpiry && (
              <View style={[styles.noteCard, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
                <Ionicons name="time-outline" size={16} color={colors.warning} />
                <Text style={[styles.noteText, { color: th.text }]}>
                  {t('billing.orderExpiringSoon', 'Your order expires soon. Please complete your payment quickly.')}
                </Text>
              </View>
            )}

            {secondsLeft !== null && isExpired && (
              <View style={[styles.noteCard, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '30' }]}>
                <Ionicons name="hourglass-outline" size={16} color={colors.danger} />
                <Text style={[styles.noteText, { color: th.text }]}>
                  {t('billing.orderExpiredMsg', 'This order has expired. Please start a new order.')}
                </Text>
              </View>
            )}

            <View style={[styles.noteCard, { backgroundColor: colors.verifiedBlue + '10', borderColor: colors.verifiedBlue + '28' }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.verifiedBlue} />
              <Text style={[styles.noteText, { color: th.textSecondary }]}>
                {t('billing.payFirstNote', 'Complete your payment using the instructions above, then fill in the verification details below.')}
              </Text>
            </View>

            <View style={[styles.verifyCard, { backgroundColor: th.surface, borderColor: colors.primary + '30' }]}>
              <View style={styles.verifyHeader}>
                <View style={styles.verifyIconCircle}>
                  <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                </View>
                <Text style={[styles.verifyTitle, { color: th.text }]}>
                  {t('billing.verifyPaymentTitle', 'Verify Your Payment')}
                </Text>
              </View>

              {fields.length > 0 ? (
                fields.map((field) => {
                  const isFocused = focusedField === field.name;
                  const hasValue = (fieldValues[field.name] ?? '').length > 0;
                  return (
                  <View key={field.name} style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: th.text }]}>
                      {field.label}
                      {field.required && <Text style={{ color: colors.danger }}> *</Text>}
                    </Text>
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          borderColor: isFocused ? colors.primary : (hasValue ? colors.primary + '50' : th.border),
                          backgroundColor: isFocused ? colors.primary + '08' : th.backgroundElement,
                        },
                      ]}
                    >
                      <Ionicons
                        name={field.type === 'number' || field.type === 'tel' ? 'keypad-outline' : 'text-outline'}
                        size={16}
                        color={isFocused ? colors.primary : th.textMuted}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: th.text }]}
                        value={fieldValues[field.name] ?? ''}
                        onChangeText={(v) => handleFieldChange(field.name, v)}
                        placeholder={field.hint ?? field.label}
                        placeholderTextColor={th.textMuted}
                        keyboardType={field.type === 'number' || field.type === 'tel' ? 'numeric' : 'default'}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={field.max_length}
                        onFocus={() => setFocusedField(field.name)}
                        onBlur={() => setFocusedField(null)}
                      />
                      {hasValue && (
                        <Pressable
                          onPress={() => handleFieldChange(field.name, '')}
                          accessibilityRole="button"
                          accessibilityLabel="Clear"
                          hitSlop={8}
                        >
                          <Ionicons name="close-circle" size={16} color={th.textMuted} />
                        </Pressable>
                      )}
                    </View>
                    {field.hint && (
                      <Text style={[styles.fieldHint, { color: isFocused ? colors.primary : th.textSecondary }]}>{field.hint}</Text>
                    )}
                  </View>
                  );
                })
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
                  <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
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
          <View style={[styles.statusCard, { backgroundColor: th.surface, borderColor: colors.danger + '30' }]}>
            <View style={styles.statusIconWrap}>
              <View style={[styles.statusIconCircle, { backgroundColor: colors.danger + '15' }]}>
                <Ionicons name="close-circle-outline" size={32} color={colors.danger} />
              </View>
            </View>
            <Text style={[styles.statusTitle, { color: th.text }]}>
              {t('billing.noAccess', 'No Access')}
            </Text>
            <Text style={[styles.statusBody, { color: th.textSecondary }]}>
              {t('billing.noAccessMsg', 'You do not have access to this payment. Please check your reference and try again.')}
            </Text>
            <Pressable
              style={[styles.primaryBtn, { marginTop: 8 }]}
              onPress={() => router.back()}
              accessibilityRole="button"
            >
              <Ionicons name="arrow-back-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {t('billing.goBack', 'Go Back')}
              </Text>
            </Pressable>
          </View>
        )}

        {step === 'status' && !order && !orderError && (
          <View style={[styles.statusCard, { backgroundColor: th.surface, borderColor: th.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.statusBody, { color: th.textSecondary, textAlign: 'center', marginTop: 12 }]}>
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

            {order.status === 'REJECTED' && order.status_reason && order.status_reason.toLowerCase().includes('transaction used in another app') && (
              <View style={[styles.noteCard, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '30' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={[styles.noteText, { color: th.text }]}>
                  {t('billing.transactionUsedInAnotherApp', 'This transaction was already used in another application. Please use a new transaction.')}
                </Text>
              </View>
            )}

            <View style={[styles.detailCard, { backgroundColor: th.surface, borderColor: th.border }]}>
              <DetailRow label={t('billing.orderRef', 'Order ref')} value={order.order_reference} textColor={th.text} secondaryColor={th.textSecondary} />
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

            {(order.status === 'VERIFICATION_PENDING' || order.status === 'REVIEW_REQUIRED' || order.status === 'MANUAL_REVIEW' || order.status === 'ADMIN_REVIEW' || order.status === 'RECEIPT_SUBMITTED') && (
              <View style={[styles.pollingCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.pollingText, { color: th.textSecondary }]}>
                  {(isPolling || loadingOrder)
                    ? t('billing.checkingStatus', 'Checking status...')
                    : t('billing.autoChecking', 'We\'ll automatically check for updates.')}
                </Text>
              </View>
            )}

            {order.can_contact_support && (order.status === 'REJECTED' || order.status === 'MANUAL_REVIEW' || order.status === 'ADMIN_REVIEW' || order.status === 'REVIEW_REQUIRED') && (
              <Pressable
                style={[styles.refreshBtn, { borderColor: th.border }]}
                onPress={() => router.push('/(app)/support-conversation' as any)}
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

            {(order.status === 'VERIFIED' || order.status === 'FULFILLED') && (
              <Pressable
                style={[styles.primaryBtn, { marginTop: 4 }]}
                onPress={() => router.back()}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.primaryBtnText}>
                  {t('billing.done', 'Done')}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InstructionRow({
  label, value, onCopy, textColor, secondaryColor, copied,
}: {
  label: string;
  value: string;
  onCopy?: (v: string) => void;
  textColor: string;
  secondaryColor: string;
  copied?: boolean;
}) {
  return (
    <View style={styles.instrRow}>
      <Text style={[styles.instrLabel, { color: secondaryColor }]}>{label}</Text>
      <View style={styles.instrValueRow}>
        <Text style={[styles.instrValue, { color: textColor }]}>{value}</Text>
        {onCopy && (
          <Pressable onPress={() => onCopy(value)} accessibilityRole="button" accessibilityLabel={`Copy ${label}`} hitSlop={8}>
            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? colors.success : secondaryColor} />
          </Pressable>
        )}
      </View>
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

function StepIndicator({ currentStep, textColor, secondaryColor, surfaceColor, borderColor }: {
  currentStep: number;
  textColor: string;
  secondaryColor: string;
  surfaceColor: string;
  borderColor: string;
}) {
  const steps = [
    { label: 'Instructions', icon: 'document-text-outline' as const },
    { label: 'Verify', icon: 'shield-checkmark-outline' as const },
    { label: 'Status', icon: 'pulse-outline' as const },
  ];
  return (
    <View style={[styles.stepIndicator, { backgroundColor: surfaceColor, borderColor }]}>
      {steps.map((s, i) => {
        const stepNum = i + 1;
        const isComplete = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        return (
          <View key={s.label} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: isComplete || isCurrent ? colors.primary : 'transparent',
                  borderColor: isComplete || isCurrent ? colors.primary : borderColor,
                },
              ]}
            >
              {isComplete ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : isCurrent ? (
                <Text style={styles.stepNum}>{stepNum}</Text>
              ) : (
                <Text style={[styles.stepNum, { color: secondaryColor }]}>{stepNum}</Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                { color: isCurrent || isComplete ? textColor : secondaryColor },
                isCurrent && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {s.label}
            </Text>
            {i < steps.length - 1 && (
              <View style={[styles.stepConnector, { backgroundColor: isComplete ? colors.primary : borderColor }]} />
            )}
          </View>
        );
      })}
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
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  stepCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  stepLabel: { fontSize: 11, fontWeight: '500' },
  stepConnector: {
    height: 2,
    flex: 1,
    marginHorizontal: 3,
    borderRadius: 1,
  },
  content: { paddingHorizontal: 14, paddingTop: 8, gap: 10 },
  instructionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 9,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionTitle: { fontSize: 14, fontWeight: '800' },
  instructionsBody: {
    padding: 10,
    gap: 6,
  },
  cardBody: { fontSize: 12, lineHeight: 16 },
  divider: { height: 1 },
  instrRow: { gap: 2 },
  instrHorizontal: { flexDirection: 'row', gap: 12 },
  instrHalf: { flex: 1 },
  instrLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  instrValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  instrValue: { fontSize: 13, fontWeight: '700', flex: 1 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 16 },
  verifyCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 10,
  },
  verifyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  verifyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyTitle: { fontSize: 15, fontWeight: '800' },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  fieldHint: { fontSize: 11, lineHeight: 14 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    gap: 8,
  },
  inputIcon: { marginRight: 0 },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 12,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '500' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 12,
  },
  refreshText: { fontSize: 14, fontWeight: '600' },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  statusIconWrap: { marginBottom: 2 },
  statusIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  statusBody: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  detailCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  pollingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  pollingText: { flex: 1, fontSize: 12, fontWeight: '500' },
});
