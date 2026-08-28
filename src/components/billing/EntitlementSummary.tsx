import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { ActionLimitAndCost, EntitlementResponse } from '@/types/billing';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';

type Props = {
  entitlements: EntitlementResponse;
  textColor: string;
  secondaryColor: string;
  surfaceColor: string;
  borderColor: string;
};

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const ACTION_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  LIKE: 'heart',
  SUPER_LIKE: 'star',
  REWIND: 'arrow-undo',
  BOOST: 'rocket',
  VOICE_MESSAGE: 'mic',
  IMAGE_MESSAGE: 'image',
};

const ACTION_LABEL: Record<string, string> = {
  LIKE: 'Likes',
  SUPER_LIKE: 'Super Likes',
  REWIND: 'Rewinds',
  BOOST: 'Boosts',
  VOICE_MESSAGE: 'Voice Msgs',
  IMAGE_MESSAGE: 'Image Msgs',
};

const ACTION_ORDER = ['LIKE', 'SUPER_LIKE', 'REWIND', 'BOOST', 'VOICE_MESSAGE', 'IMAGE_MESSAGE'];

function formatActionLabel(code: string): string {
  return ACTION_LABEL[code] ?? code
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLimitValue(action: ActionLimitAndCost, creditsAvailable: number): string {
  const limit = action.limit;
  if (limit === null || limit === undefined) return 'Unlimited';
  const remaining = action.remaining ?? 0;
  const total = remaining + creditsAvailable;
  return `${total}`;
}

export function EntitlementSummary({
  entitlements,
  textColor,
  secondaryColor,
  surfaceColor,
  borderColor,
}: Props) {
  const { plan, subscription } = entitlements;
  const isPremium = isPremiumPlan(plan);
  const isFreePremium = isFreePremiumPlan(plan);

  const lacMap = entitlements.limits_and_costs ?? {};
  const entries: [string, ActionLimitAndCost][] = ACTION_ORDER
    .filter((code) => lacMap[code])
    .map((code) => [code, lacMap[code]] as [string, ActionLimitAndCost]);

  const rows: [string, ActionLimitAndCost][][] = [];
  for (let i = 0; i < entries.length; i += 2) {
    rows.push(entries.slice(i, i + 2));
  }

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.planRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: isPremium ? (isFreePremium ? colors.warning : colors.primary) : '#6B7280' },
          ]}
        >
          <Ionicons
            name={isPremium ? (isFreePremium ? 'gift' : 'diamond') : 'person-outline'}
            size={12}
            color="#fff"
          />
          <Text style={styles.badgeText}>{isPremium ? (isFreePremium ? 'Free Premium' : 'Premium') : 'Free'}</Text>
        </View>

        {isPremium && subscription?.expires_at && (
          <Text style={[styles.expiry, { color: secondaryColor }]}>
            {subscription.auto_renew ? 'Renews' : 'Expires'}{' '}
            {formatDate(subscription.expires_at)}
          </Text>
        )}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.gridRow}>
          {row.map(([code, action]) => {
            const creditsAvailable = entitlements.credits.credit_balance;
            return (
            <LimitCard
              key={code}
              icon={ACTION_ICON[code] ?? 'help-circle-outline'}
              label={formatActionLabel(code)}
              value={formatLimitValue(action, creditsAvailable)}
              textColor={textColor}
              secondaryColor={secondaryColor}
              borderColor={borderColor}
            />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function LimitCard({
  icon,
  label,
  value,
  textColor,
  secondaryColor,
  borderColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  textColor: string;
  secondaryColor: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={[styles.cardLabel, { color: secondaryColor }]}>{label}</Text>
      </View>
      <Text style={[styles.cardValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  expiry: {
    fontSize: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
