import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { OrderListItem, OrderStatus } from '@/types/billing';

export type OrderAction = 'resume' | 'retry' | 'detail' | 'refresh';

type Props = {
  order: OrderListItem;
  onAction: (action: OrderAction, order: OrderListItem) => void;
  textColor: string;
  secondaryColor: string;
  surfaceColor: string;
  borderColor: string;
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: 'Preparing payment',
  AWAITING_PAYMENT: 'Payment required',
  VERIFICATION_PENDING: 'Verifying payment',
  MANUAL_REVIEW: 'Under review',
  ADMIN_REVIEW: 'Admin review',
  REVIEW_REQUIRED: 'Review required',
  RECEIPT_SUBMITTED: 'Receipt submitted',
  VERIFIED: 'Payment confirmed',
  FULFILLED: 'Payment confirmed',
  REJECTED: 'Payment declined',
  EXPIRED: 'Order expired',
  CANCELLED: 'Order cancelled',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  CREATED: colors.warning,
  AWAITING_PAYMENT: colors.warning,
  VERIFICATION_PENDING: colors.warning,
  MANUAL_REVIEW: colors.warning,
  ADMIN_REVIEW: colors.warning,
  REVIEW_REQUIRED: colors.warning,
  RECEIPT_SUBMITTED: colors.warning,
  VERIFIED: colors.success,
  FULFILLED: colors.success,
  REJECTED: colors.danger,
  EXPIRED: colors.danger,
  CANCELLED: colors.danger,
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString();
}

export function OrderCard({
  order,
  onAction,
  textColor,
  secondaryColor,
  surfaceColor,
  borderColor,
}: Props) {
  const statusColor = STATUS_COLORS[order.status] ?? secondaryColor;

  return (
    <Pressable
      style={[
        styles.card,
        { backgroundColor: surfaceColor, borderColor },
      ]}
      onPress={() => onAction('detail', order)}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.order_reference} ${order.status}`}
    >
      <View style={styles.header}>
        <View style={styles.left}>
          <Text style={[styles.displayName, { color: textColor }]} numberOfLines={1}>
            {order.display_name}
          </Text>
          <Text style={[styles.productType, { color: secondaryColor }]}>
            {order.product_type === 'SUBSCRIPTION' ? 'Subscription' : 'Credits'}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.price, { color: textColor }]}>{order.display_price}</Text>
        </View>
      </View>

      <View style={[styles.statusRow, { backgroundColor: statusColor + '12' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusLabel, { color: statusColor }]}>
          {STATUS_LABELS[order.status] ?? order.status}
        </Text>
      </View>

      <View style={styles.metaGrid}>
        <Meta label="Reference" value={order.order_reference} textColor={textColor} secondaryColor={secondaryColor} />
        <Meta label="Method" value={order.payment_method_display_name} textColor={textColor} secondaryColor={secondaryColor} />
        {order.expires_at && (
          <Meta label="Expires" value={formatDate(order.expires_at)} textColor={textColor} secondaryColor={secondaryColor} />
        )}
        <Meta label="Created" value={formatDate(order.created_at)} textColor={textColor} secondaryColor={secondaryColor} />
      </View>

      <View style={styles.actions}>
        {order.can_resume_payment && (
          <ActionButton
            icon="open-outline"
            label="Resume Payment"
            onPress={() => onAction('resume', order)}
            primary
          />
        )}
        {(order.status === 'VERIFICATION_PENDING' || order.status === 'MANUAL_REVIEW' || order.status === 'ADMIN_REVIEW' || order.status === 'REVIEW_REQUIRED') && (
          <ActionButton
            icon="refresh-outline"
            label="Refresh Status"
            onPress={() => onAction('refresh', order)}
          />
        )}
        {order.can_create_new_order && (
          <ActionButton
            icon="cart-outline"
            label="Try Again"
            onPress={() => onAction('retry', order)}
          />
        )}
        {order.status === 'VERIFIED' || order.status === 'FULFILLED' ? (
          <ActionButton
            icon="checkmark-circle"
            label="Payment confirmed"
            disabled
          />
        ) : null}
      </View>
    </Pressable>
  );
}

function Meta({
  label,
  value,
  textColor,
  secondaryColor,
}: {
  label: string;
  value: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: secondaryColor }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: textColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  primary,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.actionBtn,
        primary && styles.actionBtnPrimary,
        disabled && styles.actionBtnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={14}
        color={primary && !disabled ? '#fff' : disabled ? '#9CA3AF' : colors.primary}
      />
      <Text
        style={[
          styles.actionText,
          primary && !disabled && styles.actionTextPrimary,
          disabled && styles.actionTextDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  left: { flex: 1 },
  right: { alignItems: 'flex-end' },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
  },
  productType: {
    fontSize: 12,
    marginTop: 2,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    minWidth: 130,
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionBtnDisabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  actionTextPrimary: {
    color: '#fff',
  },
  actionTextDisabled: {
    color: '#9CA3AF',
  },
});
