import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import type { EntitlementResponse, QuotaInfo } from '@/types/billing';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';

const CREDIT_ITEMS: { key: keyof EntitlementResponse['credits']; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'super_likes_available', label: 'Super Likes', icon: 'star' },
  { key: 'rewinds_available', label: 'Rewinds', icon: 'arrow-undo' },
  { key: 'boosts_available', label: 'Boosts', icon: 'rocket' },
];

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

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatQuotaRemaining(quota: QuotaInfo): string {
  const limit = quota.limit;
  if (limit === null || limit === undefined) return 'Unlimited';
  return `${quota.remaining ?? 0}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size));
  }
  return rows;
}

export default function BalancesScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const { entitlements, isLoading } = useEntitlements();
  const { top: safeTop } = useSafeAreaInsets();
  const isDark = mode === 'dark';

  const iconBg = isDark ? th.backgroundSelected : '#F3EEFF';
  const borderCol = isDark ? 'rgba(46,31,80,0.22)' : 'rgba(233,221,248,0.5)';
  const textCol = th.text;
  const mutedCol = th.textSecondary;

  if (isLoading || !entitlements) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { plan, subscription } = entitlements;
  const isPremium = isPremiumPlan(plan);
  const isFreePremium = isFreePremiumPlan(plan);
  const planLabel = isPremium ? (isFreePremium ? 'Free Premium' : 'Premium') : 'Free';
  const planIcon = isPremium ? (isFreePremium ? 'gift' : 'diamond') : 'person-outline';
  const planColor = isPremium ? (isFreePremium ? colors.warning : colors.primary) : '#6B7280';

  const limitEntries = Object.entries(entitlements.limits) as [string, QuotaInfo][];
  const quotaRows = chunk(limitEntries, 2);
  const creditRows = chunk(CREDIT_ITEMS, 2);

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <View style={[styles.header, { paddingTop: safeTop + 8 }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: th.surface, borderColor: borderCol }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textCol }]}>Balances</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Subscription Status Card */}
        <View
          style={[
            styles.subCard,
            {
              backgroundColor: th.surface,
              borderColor: borderCol,
              ...Platform.select({
                ios: { shadowColor: '#8A2CFF', shadowOpacity: isDark ? 0.15 : 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
                android: { elevation: 3 },
              }) as any,
            },
          ]}
        >
          <View style={styles.subCardTop}>
            <View style={[styles.planBadge, { backgroundColor: planColor }]}>
              <Ionicons name={planIcon as any} size={14} color="#fff" />
              <Text style={styles.planBadgeText}>{planLabel}</Text>
            </View>
            {isPremium && subscription?.expires_at && (
              <Text style={[styles.subExpiry, { color: mutedCol }]}>
                {subscription.auto_renew ? 'Renews' : 'Expires'} {formatDate(subscription.expires_at)}
              </Text>
            )}
          </View>

          {!isPremium && (
            <Pressable
              style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(app)/premium' as any)}
              accessibilityLabel="Upgrade to Premium"
              accessibilityRole="button"
            >
              <Ionicons name="diamond" size={15} color="#fff" />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </Pressable>
          )}
        </View>

        {/* Subscription Daily Balances */}
        <View style={[styles.sectionWrap, { backgroundColor: isDark ? 'rgba(138,44,255,0.08)' : th.surface }]}>
          <View style={styles.sectionInner}>
            <Text style={[styles.sectionTitle, { color: mutedCol }]}>Subscription Daily Balances</Text>
            <View style={styles.grid}>
              {quotaRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map(([key, quota]) => {
                    const value = formatQuotaRemaining(quota);
                    const label = LIMIT_LABEL[key] ?? key;
                    const icon = LIMIT_ICON[key] ?? 'help-circle-outline';
                    return (
                      <View
                        key={key}
                        style={[
                          styles.balanceCard, { backgroundColor: th.surface, borderColor: borderCol }]}
                      >
                        <View style={[styles.balanceIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                          <Ionicons name={icon} size={18} color={colors.primary} />
                        </View>
                        <View style={styles.balanceInfo}>
                          <Text style={[styles.balanceLabel, { color: mutedCol }]}>{label}</Text>
                          <Text style={[styles.balanceValue, { color: textCol }]}>{value}</Text>
                        </View>
                      </View>
                    );
                  })}
                  {row.length === 1 && <View style={styles.gridSpacer} />}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Credit Balances */}
        <View style={[styles.sectionWrap, { backgroundColor: isDark ? 'rgba(244,163,22,0.08)' : th.surface }]}>
          <View style={styles.sectionInner}>
            <Text style={[styles.sectionTitle, { color: mutedCol }]}>Credit Balances</Text>
            <View style={styles.grid}>
              {creditRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((item) => {
                    const value = `${entitlements.credits[item.key] ?? 0}`;
                    return (
                      <View
                        key={item.key}
                        style={[
                          styles.balanceCard, { backgroundColor: th.surface, borderColor: borderCol }]}
                      >
                        <View style={[styles.balanceIconWrap, { backgroundColor: iconBg, borderColor: borderCol }]}>
                          <Ionicons name={item.icon} size={18} color={colors.primary} />
                        </View>
                        <View style={styles.balanceInfo}>
                          <Text style={[styles.balanceLabel, { color: mutedCol }]}>{item.label}</Text>
                          <Text style={[styles.balanceValue, { color: textCol }]}>{value}</Text>
                        </View>
                      </View>
                    );
                  })}
                  {row.length === 1 && <View style={styles.gridSpacer} />}
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  // Subscription card
  subCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 18,
    gap: 14,
    marginTop: 8,
  },
  subCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  subExpiry: {
    fontSize: 13,
    fontWeight: '500',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  // Section wrapper
  sectionWrap: {
    marginTop: 24,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 },
    }) as any,
  },
  sectionInner: {
    padding: 16,
  },
  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  // Grid
  grid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridSpacer: {
    flex: 1,
  },
  balanceCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  balanceInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
