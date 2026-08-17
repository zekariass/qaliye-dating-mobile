import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
  const planLabel = isFreePremium ? 'Free Premium' : 'Premium';
  const planIcon = isFreePremium ? 'gift' : 'diamond';
  const planColor = isFreePremium ? colors.warning : colors.primary;
  const creditsEnabled = entitlements.country_settings?.credits_enabled ?? true;

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
        {isPremium && (
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
                {subscription?.expires_at && (
                  <Text style={[styles.planExpiry, { color: th.textSecondary }]}>
                    {subscription.auto_renew ? 'Renews' : 'Expires'} {formatDate(subscription.expires_at)}
                  </Text>
                )}
              </View>
            </View>

            {!isFreePremium && (
              <View style={[styles.activeBadge, { borderColor: `${colors.success}35` }]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.activeBadgeText, { color: th.text }]}>Active subscription</Text>
              </View>
            )}
          </LinearGradient>
        )}

        {/* Credits */}
        {creditsEnabled && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet-outline" size={16} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: th.text }]}>Your Credits</Text>
            </View>
            <View style={[styles.creditHeroCard, { backgroundColor: th.surface, borderColor: th.border }]}>
              <View style={[styles.creditHeroIconRing, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}25` }]}>
                <Ionicons name="diamond" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.creditHeroValue, { color: colors.primary }]}>
                {entitlements.credits.credit_balance.toLocaleString()}
              </Text>
              <Text style={[styles.creditHeroLabel, { color: th.textSecondary }]}>Credits</Text>
              <Pressable
                style={[styles.buyCreditsBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(app)/credits-shop' as any)}
                accessibilityLabel="Buy credits"
                accessibilityRole="button"
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.buyCreditsBtnText}>Buy Credits</Text>
              </Pressable>
            </View>
          </View>
        )}

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
  creditHeroCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 24,
    gap: 10,
  },
  creditHeroIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  creditHeroValue: {
    fontSize: 36,
    fontWeight: '900',
  },
  creditHeroLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  buyCreditsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    marginTop: 8,
  },
  buyCreditsBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
