import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { EntitlementResponse, QuotaInfo } from '@/types/billing';
import { isPremiumPlan } from '@/types/billing';

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

const LIMIT_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  likes: 'heart',
  super_likes: 'star',
  rewinds: 'arrow-undo',
  boosts: 'rocket',
  voiceChatMsgs: 'mic',
  imageChatMsgs: 'image',
};

const LIMIT_LABEL: Record<string, string> = {
  likes: 'Likes',
  super_likes: 'Super Likes',
  rewinds: 'Rewinds',
  boosts: 'Boosts',
  voiceChatMsgs: 'Voice Msgs',
  imageChatMsgs: 'Image Msgs',
};

function formatLimitKey(key: string): string {
  return LIMIT_LABEL[key] ?? key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const CREDIT_KEY_MAP: Record<string, keyof EntitlementResponse['credits']> = {
  super_likes: 'super_likes_available',
  rewinds: 'rewinds_available',
  boosts: 'boosts_available',
};

function formatLimitValue(quota: QuotaInfo, creditsAvailable: number): string {
  const limit = quota.limit;
  if (limit === null || limit === undefined) return 'Unlimited';
  const remaining = quota.remaining ?? 0;
  const total = remaining + creditsAvailable;
  if (creditsAvailable > 0) {
    return `${total}`;
  }
  return `${remaining}/${limit}`;
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

  const limitEntries = Object.entries(entitlements.limits);
  const rows: [string, QuotaInfo][][] = [];
  for (let i = 0; i < limitEntries.length; i += 2) {
    rows.push(limitEntries.slice(i, i + 2) as [string, QuotaInfo][]);
  }

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={styles.planRow}>
        <View
          style={[
            styles.badge,
            { backgroundColor: isPremium ? colors.primary : '#6B7280' },
          ]}
        >
          <Ionicons
            name={isPremium ? 'diamond' : 'person-outline'}
            size={12}
            color="#fff"
          />
          <Text style={styles.badgeText}>{isPremium ? 'Premium' : 'Free'}</Text>
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
          {row.map(([key, quota]) => {
            const creditKey = CREDIT_KEY_MAP[key];
            const creditsAvailable = creditKey ? entitlements.credits[creditKey] : 0;
            return (
            <LimitCard
              key={key}
              icon={LIMIT_ICON[key] ?? 'help-circle-outline'}
              label={formatLimitKey(key)}
              value={formatLimitValue(quota, creditsAvailable)}
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
    padding: 14,
    gap: 10,
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
