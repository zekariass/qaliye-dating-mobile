import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import type { EntitlementResponse, QuotaInfo } from '@/types/billing';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';

type CreditItem = {
  key: keyof EntitlementResponse['credits'];
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  accent: string;
};

const CREDIT_ITEMS: CreditItem[] = [
  { key: 'super_likes_available', label: 'Super Likes', icon: 'star', accent: colors.heartPink },
  { key: 'rewinds_available', label: 'Rewinds', icon: 'arrow-undo', accent: colors.verifiedBlue },
  { key: 'boosts_available', label: 'Boosts', icon: 'rocket', accent: colors.primary },
];

const LIMIT_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  likes: 'heart',
  super_likes: 'star',
  rewinds: 'arrow-undo',
  boosts: 'rocket',
  voice_chat_msgs: 'mic',
  image_chat_msgs: 'image',
  voiceChatMsgs: 'mic',
  imageChatMsgs: 'image',
};

const LIMIT_LABEL: Record<string, string> = {
  likes: 'Likes',
  super_likes: 'Super Likes',
  rewinds: 'Rewinds',
  boosts: 'Boosts',
  voice_chat_msgs: 'Voice Msgs',
  image_chat_msgs: 'Image Msgs',
  voiceChatMsgs: 'Voice Msgs',
  imageChatMsgs: 'Image Msgs',
};

const LIMIT_ACCENT: Record<string, string> = {
  likes: colors.heartPink,
  super_likes: colors.heartPink,
  rewinds: colors.verifiedBlue,
  boosts: colors.primary,
  voice_chat_msgs: colors.secondary,
  image_chat_msgs: colors.primary,
  voiceChatMsgs: colors.secondary,
  imageChatMsgs: colors.primary,
};

function CustomIcon({ name, size, color }: { name: React.ComponentProps<typeof Ionicons>['name']; size: number; color: string }) {
  if (name === 'arrow-undo') {
    return <Text style={{ fontSize: size * 0.9, fontWeight: '700', color }}>↺</Text>;
  }
  return <Ionicons name={name} size={size} color={color} />;
}

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
  const { colors: th } = useTheme();
  const { entitlements, isLoading } = useEntitlements();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

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

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: safeTop }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>Balances</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: safeBottom + 16 }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <LinearGradient
          colors={[`${colors.primary}18`, `${colors.primaryLight}10`, th.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.planCard, { borderColor: `${planColor}40` }]}
        >
          <View style={styles.planCardRow}>
            <View style={[styles.planIconRing, { backgroundColor: `${planColor}20`, borderColor: `${planColor}35` }]}>
              <Ionicons name={planIcon as any} size={28} color={planColor} />
            </View>
            <View style={styles.planInfo}>
              <View style={[styles.planBadge, { backgroundColor: planColor }]}>
                <Ionicons name={planIcon as any} size={14} color="#fff" />
                <Text style={styles.planBadgeText}>{planLabel}</Text>
              </View>
              {isPremium && subscription?.expires_at && (
                <Text style={[styles.planExpiry, { color: th.textSecondary }]}>
                  {subscription.auto_renew ? 'Renews' : 'Expires'} {formatDate(subscription.expires_at)}
                </Text>
              )}
            </View>
          </View>

          {!isPremium && (
            <Pressable
              style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(app)/premium' as any)}
              accessibilityLabel="Upgrade to Premium"
              accessibilityRole="button"
            >
              <Ionicons name="diamond" size={18} color="#fff" />
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </Pressable>
          )}

          {isPremium && !isFreePremium && (
            <View style={[styles.activeBadge, { borderColor: `${colors.success}35` }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[styles.activeBadgeText, { color: th.text }]}>Active subscription</Text>
            </View>
          )}
        </LinearGradient>

        {/* Credits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: th.text }]}>Your Credits</Text>
          </View>
          <View style={styles.creditGrid}>
            {CREDIT_ITEMS.map((item) => {
              const value = `${entitlements.credits[item.key] ?? 0}`;
              const unlimited = false;
              return (
                <View
                  key={item.key}
                  style={[
                    styles.creditCard,
                    { backgroundColor: th.surface, borderColor: th.border, shadowColor: item.accent },
                  ]}
                >
                  <View style={[styles.creditIconRing, { backgroundColor: `${item.accent}15`, borderColor: `${item.accent}25` }]}>
                    <CustomIcon name={item.icon} size={20} color={item.accent} />
                  </View>
                  <Text style={[styles.creditValue, { color: th.text }]}>{unlimited ? '∞' : value}</Text>
                  <Text style={[styles.creditLabel, { color: th.textSecondary }]}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Daily limits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: th.text }]}>Daily Balances</Text>
          </View>
          <View style={styles.limitsList}>
            {quotaRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.limitsRow}>
                {row.map(([key, quota]) => {
                  const value = formatQuotaRemaining(quota);
                  const label = LIMIT_LABEL[key] ?? key;
                  const icon = LIMIT_ICON[key] ?? 'help-circle-outline';
                  const accent = LIMIT_ACCENT[key] ?? colors.primary;
                  return (
                    <View
                      key={key}
                      style={[
                        styles.limitCard,
                        { backgroundColor: th.surface, borderColor: th.border, shadowColor: accent },
                      ]}
                    >
                      <View style={styles.limitTop}>
                        <View style={[styles.limitIconRing, { backgroundColor: `${accent}15`, borderColor: `${accent}25` }]}>
                          <CustomIcon name={icon} size={16} color={accent} />
                        </View>
                        <Text style={[styles.limitValue, { color: th.text }]}>{value}</Text>
                      </View>
                      <Text style={[styles.limitLabel, { color: th.textSecondary }]}>{label}</Text>
                    </View>
                  );
                })}
                {row.length === 1 && <View style={{ flex: 1 }} />}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 24, gap: 14 },
  planCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  planCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  planInfo: { flex: 1, gap: 4 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  planBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  planExpiry: {
    fontSize: 13,
    fontWeight: '500',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  upgradeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: `${colors.success}10`,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  creditGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  creditCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  creditIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  creditValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  creditLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  limitsList: { gap: 8 },
  limitsRow: { flexDirection: 'row', gap: 8 },
  limitCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 6,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  limitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  limitIconRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  limitValue: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'right',
  },
  limitLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
