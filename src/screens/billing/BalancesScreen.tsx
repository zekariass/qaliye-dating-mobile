import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useTheme } from '@/hooks/use-theme';
import type { QuotaInfo } from '@/types/billing';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';
import { formatPeriodType } from '@/utils/entitlements';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatBoostTime(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m remaining` : `${m}m remaining`;
}

const QUOTA_META: Record<string, { label: string; icon: string; color: string }> = {
  likes:           { label: 'Likes',          icon: 'heart-outline',   color: colors.secondary    },
  super_likes:     { label: 'Super Likes',     icon: 'star-outline',    color: colors.warning      },
  rewinds:         { label: 'Rewinds',         icon: 'refresh-outline', color: colors.primary      },
  boosts:          { label: 'Boosts',          icon: 'rocket-outline',  color: '#FF6B35'           },
  voice_chat_msgs: { label: 'Voice Messages',  icon: 'mic-outline',     color: colors.verifiedBlue },
  image_chat_msgs: { label: 'Image Messages',  icon: 'image-outline',   color: colors.primary      },
};

const QUOTA_ORDER = ['likes', 'super_likes', 'rewinds', 'boosts', 'voice_chat_msgs', 'image_chat_msgs'];

// Map limit keys (used in `limits`) to canonical action codes (used in `costs`)
const LIMIT_KEY_TO_ACTION_CODE: Record<string, string> = {
  likes:           'LIKE',
  super_likes:     'SUPER_LIKE',
  rewinds:         'REWIND',
  boosts:          'BOOST',
  voice_chat_msgs: 'VOICE_MESSAGE',
  image_chat_msgs: 'IMAGE_MESSAGE',
};

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
  default: {},
});

// ─── QuotaRow ─────────────────────────────────────────────────────────────────

function QuotaRow({ quotaKey, quota, periodLabel, isLast }: {
  quotaKey: string; quota: QuotaInfo; periodLabel: string; isLast: boolean;
}) {
  const { colors: th } = useTheme();
  const meta        = QUOTA_META[quotaKey];
  const isUnlimited = quota.limit === null;
  const used        = quota.used ?? 0;
  const limit       = quota.limit ?? 1;
  const progress    = isUnlimited ? 0 : Math.min(used / limit, 1);
  const barColor    =
    progress >= 0.95 ? colors.danger
    : progress >= 0.80 ? colors.warning
    : meta.color;

  return (
    <>
      <View style={quotaRowStyles.row}>
        <View style={[quotaRowStyles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={16} color={meta.color} />
        </View>
        <View style={quotaRowStyles.info}>
          <View style={quotaRowStyles.topRow}>
            <Text style={[quotaRowStyles.label, { color: th.text }]}>{meta.label}</Text>
            {isUnlimited ? (
              <View style={[quotaRowStyles.unlimitedChip, { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}25` }]}>
                <Ionicons name="infinite" size={11} color={colors.success} />
                <Text style={[quotaRowStyles.unlimitedText, { color: colors.success }]}>Unlimited</Text>
              </View>
            ) : (
              <Text style={[quotaRowStyles.count, { color: barColor }]}>
                {used.toLocaleString()} / {limit.toLocaleString()}
              </Text>
            )}
          </View>
          {!isUnlimited && (
            <View style={[quotaRowStyles.track, { backgroundColor: `${barColor}20` }]}>
              <View style={[quotaRowStyles.fill, { backgroundColor: barColor, width: `${Math.round(progress * 100)}%` }]} />
            </View>
          )}
          {!isUnlimited && periodLabel && (
            <Text style={[quotaRowStyles.reset, { color: th.textSecondary }]}>
              Resets {periodLabel}
            </Text>
          )}
        </View>
      </View>
      {!isLast && <View style={[quotaRowStyles.divider, { backgroundColor: th.border }]} />}
    </>
  );
}

const quotaRowStyles = StyleSheet.create({
  row:           { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  iconWrap:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  info:          { flex: 1, gap: 6 },
  topRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label:         { fontSize: 14, fontWeight: '600' },
  count:         { fontSize: 13, fontWeight: '700' },
  unlimitedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  unlimitedText: { fontSize: 11, fontWeight: '700' },
  track:         { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill:          { height: 5, borderRadius: 3 },
  reset:         { fontSize: 11, fontWeight: '500', marginTop: -2 },
  divider:       { height: 1, marginHorizontal: 16 },
});

// ─── BalancesScreen ───────────────────────────────────────────────────────────

export default function BalancesScreen() {
  const router  = useRouter();
  const { colors: th }  = useTheme();
  const { entitlements, isLoading, refreshEntitlements } = useEntitlements();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  if (isLoading || !entitlements) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { plan, subscription, credits, limits, active_boost } = entitlements;
  const isPremium         = isPremiumPlan(plan);
  const isFreePremium     = isFreePremiumPlan(plan);
  const planLabel         = isFreePremium ? 'Free Premium' : isPremium ? 'Premium' : 'Free';
  const planIcon          = isFreePremium ? 'gift-outline' : isPremium ? 'diamond-outline' : 'person-circle-outline';
  const planColor         = isFreePremium ? colors.warning : isPremium ? colors.primary : th.textSecondary;
  const creditsEnabled    = entitlements.country_settings?.credits_enabled ?? true;
  const subscriptionEnabled = entitlements.country_settings?.subscription_enabled ?? true;

  // Sort and filter quota entries to only ones we have metadata for
  const quotaEntries = Object.entries(limits ?? {})
    .filter(([key]) => key in QUOTA_META)
    .sort(([a], [b]) => QUOTA_ORDER.indexOf(a) - QUOTA_ORDER.indexOf(b));

  return (
    <View style={[styles.screen, { backgroundColor: th.background, paddingTop: safeTop }]}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
        <Pressable
          style={[styles.iconBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => refreshEntitlements()}
          accessibilityLabel="Refresh balances"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={20} color={th.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottom + 32 }]}
        showsVerticalScrollIndicator={false}
        bounces
      >

        {/* ── Plan Card ──────────────────────────────────────────────────────── */}
        {isPremium ? (
          <LinearGradient
            colors={
              isFreePremium
                ? [`${colors.warning}22`, `${colors.warning}0A`, `${th.background}00`]
                : [`${colors.primary}1C`, `${colors.primaryLight}0E`, `${th.background}00`]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.planCard, { borderColor: `${planColor}38` }, cardShadow]}
          >
            <View style={styles.planRow}>
              <View style={[styles.planIconRing, { backgroundColor: `${planColor}18`, borderColor: `${planColor}30` }]}>
                <Ionicons name={planIcon as any} size={26} color={planColor} />
              </View>
              <View style={styles.planInfo}>
                <View style={styles.planNameRow}>
                  <View style={[styles.planBadge, { backgroundColor: planColor }]}>
                    <Ionicons name={planIcon as any} size={12} color="#fff" />
                    <Text style={styles.planBadgeText}>{planLabel}</Text>
                  </View>
                  {!isFreePremium && (
                    <View style={[styles.activeChip, { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}28` }]}>
                      <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                      <Text style={[styles.activeChipText, { color: colors.success }]}>Active</Text>
                    </View>
                  )}
                </View>
                {subscription?.billing_interval_count != null && subscription?.billing_interval_unit && (
                  <Text style={[styles.planInterval, { color: th.textSecondary }]}>
                    {subscription.billing_interval_count === 1 ? 'Monthly plan' : `${subscription.billing_interval_count}-month plan`}
                  </Text>
                )}
                {subscription?.expires_at && (
                  <Text style={[styles.planExpiry, { color: th.textSecondary }]}>
                    {subscription.auto_renew ? 'Renews' : 'Expires'} · {formatDate(subscription.expires_at)}
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.freePlanCard, { backgroundColor: th.surface, borderColor: th.border }, cardShadow]}>
            <View style={styles.freePlanLeft}>
              <View style={[styles.planIconRing, { backgroundColor: `${th.textSecondary}14`, borderColor: `${th.textSecondary}22` }]}>
                <Ionicons name="person-circle-outline" size={26} color={th.textSecondary} />
              </View>
              <View>
                <Text style={[styles.freePlanTitle, { color: th.text }]}>Free Plan</Text>
                <Text style={[styles.freePlanSub, { color: th.textSecondary }]}>Limited features</Text>
              </View>
            </View>
            {subscriptionEnabled && (
              <Pressable
                style={[styles.upgradePill, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(app)/premium' as any)}
                accessibilityRole="button"
                accessibilityLabel="Go Premium"
              >
                <Ionicons name="diamond-outline" size={14} color="#fff" />
                <Text style={styles.upgradePillText}>Go Premium</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* ── Active Boost ───────────────────────────────────────────────────── */}
        {active_boost && active_boost.remaining_seconds > 0 && (
          <LinearGradient
            colors={['#FF6B3522', '#FF6B350A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.boostCard, { borderColor: '#FF6B3538' }]}
          >
            <View style={[styles.boostIconRing, { backgroundColor: '#FF6B3522' }]}>
              <Ionicons name="rocket" size={22} color="#FF6B35" />
            </View>
            <View style={styles.boostTextWrap}>
              <Text style={[styles.boostTitle, { color: th.text }]}>Boost Active</Text>
              <Text style={[styles.boostTimer, { color: '#FF6B35' }]}>
                {formatBoostTime(active_boost.remaining_seconds)}
              </Text>
            </View>
            <View style={[styles.liveBadge, { backgroundColor: '#FF6B3518', borderColor: '#FF6B3538' }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </LinearGradient>
        )}

        {/* ── Credits ────────────────────────────────────────────────────────── */}
        {creditsEnabled && (
          <View style={styles.section}>
            <View style={styles.sectionLabel}>
              <Ionicons name="wallet-outline" size={15} color={colors.primary} />
              <Text style={[styles.sectionLabelText, { color: th.text }]}>Credits</Text>
            </View>
            <LinearGradient
              colors={[`${colors.primary}16`, `${colors.primaryLight}0A`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.creditCard, { borderColor: `${colors.primary}28` }, cardShadow]}
            >
              {/* Balance hero */}
              <View style={styles.creditBalanceRow}>
                <View style={[styles.creditIconRing, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}28` }]}>
                  <Ionicons name="diamond" size={28} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.creditValue, { color: colors.primary }]}>
                    {credits.credit_balance.toLocaleString()}
                  </Text>
                  <Text style={[styles.creditValueLabel, { color: th.textSecondary }]}>
                    Available Credits
                  </Text>
                </View>
              </View>

            </LinearGradient>

            {/* Buy Credits — full-width centered CTA below the card */}
            <Pressable
              style={({ pressed }) => [styles.buyBtnWrap, { opacity: pressed ? 0.88 : 1 }]}
              onPress={() => router.push('/(app)/credits-shop' as any)}
              accessibilityLabel="Buy credits"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['#A020F0', '#6D35FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buyBtnGradient}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.buyBtnText}>Buy Credits</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* ── Usage / Quotas ─────────────────────────────────────────────────── */}
        {quotaEntries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionLabel}>
              <Ionicons name="stats-chart-outline" size={15} color={colors.primary} />
              <Text style={[styles.sectionLabelText, { color: th.text }]}>Usage</Text>
            </View>
            <View style={[styles.listCard, { backgroundColor: th.surface, borderColor: th.border }, cardShadow]}>
              {quotaEntries.map(([key, quota], idx) => {
                const actionCode = LIMIT_KEY_TO_ACTION_CODE[key];
                const costInfo   = actionCode ? entitlements.costs?.[actionCode] : undefined;
                const periodLabel = formatPeriodType(costInfo?.period_type);
                return (
                  <QuotaRow
                    key={key}
                    quotaKey={key}
                    quota={quota}
                    periodLabel={periodLabel}
                    isLast={idx === quotaEntries.length - 1}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* ── Upgrade CTA (free users only) ─────────────────────────────────── */}
        {!isPremium && subscriptionEnabled && (
          <Pressable
            style={({ pressed }) => [styles.ctaBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={() => router.push('/(app)/premium' as any)}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Premium"
          >
            <LinearGradient
              colors={['#A020F0', '#6D35FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Ionicons name="diamond-outline" size={20} color="#fff" />
              <Text style={styles.ctaText}>Upgrade to Premium</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  // Plan card (premium)
  planCard: {
    borderRadius: radius.lg, borderWidth: 1, padding: 18,
  },
  planRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planIconRing: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  planInfo:    { flex: 1, gap: 5 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  planBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  activeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  activeDot:      { width: 6, height: 6, borderRadius: 3 },
  activeChipText: { fontSize: 11, fontWeight: '700' },
  planInterval:   { fontSize: 13, fontWeight: '500' },
  planExpiry:     { fontSize: 12, fontWeight: '500' },

  // Plan card (free)
  freePlanCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: radius.lg, borderWidth: 1, padding: 16,
  },
  freePlanLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  freePlanTitle: { fontSize: 15, fontWeight: '800' },
  freePlanSub:   { fontSize: 12, fontWeight: '500', marginTop: 1 },
  upgradePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
  },
  upgradePillText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Active boost
  boostCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: radius.lg, borderWidth: 1, padding: 16,
  },
  boostIconRing: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  boostTextWrap: { flex: 1 },
  boostTitle:    { fontSize: 14, fontWeight: '800' },
  boostTimer:    { fontSize: 13, fontWeight: '600', marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B35' },
  liveText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: '#FF6B35' },

  // Section labels
  section:         { gap: 8 },
  sectionLabel:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabelText: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

  // Credits card
  creditCard:       { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  creditBalanceRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20 },
  creditIconRing: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  creditValue:      { fontSize: 38, fontWeight: '900', lineHeight: 42 },
  creditValueLabel: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  buyBtnWrap: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: 10,
  },
  buyBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15,
  },
  buyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

  // Shared list card (used by quota)
  listCard:      { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },

  // Upgrade CTA
  ctaBtn:      { borderRadius: radius.lg, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
});
