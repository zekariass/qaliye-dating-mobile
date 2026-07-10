import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { OrderStatus } from '@/types/billing';

type Props = {
  status: OrderStatus;
  textColor: string;
  secondaryColor: string;
};

type StatusConfig = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  bgColor: string;
  title: string;
  body: string;
};

const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  CREATED: {
    icon: 'sync-outline',
    iconColor: colors.verifiedBlue,
    bgColor: colors.verifiedBlue + '18',
    title: 'Order Created',
    body: 'Your order has been created. Please complete your payment.',
  },
  AWAITING_PAYMENT: {
    icon: 'time-outline',
    iconColor: colors.warning,
    bgColor: colors.warning + '18',
    title: 'Awaiting Payment',
    body: 'Complete your payment using the instructions below.',
  },
  VERIFICATION_PENDING: {
    icon: 'sync-outline',
    iconColor: colors.verifiedBlue,
    bgColor: colors.verifiedBlue + '18',
    title: 'Verifying Payment',
    body: 'We are verifying your payment. This usually takes a few minutes.',
  },
  MANUAL_REVIEW: {
    icon: 'shield-checkmark-outline',
    iconColor: colors.warning,
    bgColor: colors.warning + '18',
    title: 'Under Review',
    body: 'Your payment is being reviewed by our team. Premium or credits will activate after approval.',
  },
  ADMIN_REVIEW: {
    icon: 'shield-outline',
    iconColor: colors.warning,
    bgColor: colors.warning + '18',
    title: 'Admin Review',
    body: 'Your payment is under manual admin review. This may take up to 24 hours.',
  },
  REVIEW_REQUIRED: {
    icon: 'alert-circle-outline',
    iconColor: colors.warning,
    bgColor: colors.warning + '18',
    title: 'Review Required',
    body: 'Additional review is required for your payment. Our team will process it shortly.',
  },
  RECEIPT_SUBMITTED: {
    icon: 'document-attach-outline',
    iconColor: colors.verifiedBlue,
    bgColor: colors.verifiedBlue + '18',
    title: 'Receipt Submitted',
    body: 'Your receipt has been submitted and is pending review.',
  },
  VERIFIED: {
    icon: 'checkmark-circle',
    iconColor: colors.success,
    bgColor: colors.success + '18',
    title: 'Payment Confirmed',
    body: 'Your purchase has been activated. Enjoy your subscription or credits!',
  },
  FULFILLED: {
    icon: 'checkmark-done-circle',
    iconColor: colors.success,
    bgColor: colors.success + '18',
    title: 'Purchase Complete',
    body: 'Your purchase has been fulfilled and is ready to use.',
  },
  REJECTED: {
    icon: 'close-circle-outline',
    iconColor: colors.danger,
    bgColor: colors.danger + '18',
    title: 'Payment Could Not Be Confirmed',
    body: 'We could not verify this payment. Please try again or contact support.',
  },
  EXPIRED: {
    icon: 'hourglass-outline',
    iconColor: colors.textMuted,
    bgColor: '#9CA3AF18',
    title: 'Order Expired',
    body: 'This payment order has expired. Please start a new order.',
  },
  CANCELLED: {
    icon: 'ban-outline',
    iconColor: colors.textMuted,
    bgColor: '#9CA3AF18',
    title: 'Order Cancelled',
    body: 'This order was cancelled. You can return to payment options.',
  },
};

export function OrderStatusBanner({ status, textColor, secondaryColor }: Props) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <View style={[styles.container, { backgroundColor: config.bgColor }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={config.icon} size={24} color={config.iconColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: textColor }]}>{config.title}</Text>
        <Text style={[styles.body, { color: secondaryColor }]}>{config.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 14,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    paddingTop: 2,
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
});
