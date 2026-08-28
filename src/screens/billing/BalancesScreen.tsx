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
import type { ActionLimitAndCost } from '@/types/billing';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';

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

function formatPeriodSuffix(periodType: string | null | undefined): string {
  switch (periodType) {
    case 'DAY':          return 'per day';
    case 'MONTH':        return 'per month';
    case 'BILLING_CYCLE': return 'per billing cycle';
    case 'WEEK':         return 'per week';
    case 'YEAR':         return 'per year';
    default:             return '';
  }
}

function formatResetTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  const s = date.getUTCSeconds();
  if (h === 0 && m === 0 && s === 0) return 'Resets at midnight';
  if (h === 23 && m === 59 && s === 59) {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + 1);
    if (next.getUTCMonth() !== date.getUTCMonth()) return 'Resets at end of month';
    return 'Resets at end of day';
  }
  return `Resets at ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function pluralize(word: string, count: number): string {
  if (count === 1) return word.replace(/s$/, '');
  return word;
}

function formatCostLine(label: string, action?: ActionLimitAndCost): string {
  if (!action) return 'Free';
  const limitValue       = action.limit;
  const actualCreditCost = action.actual_credit_cost ?? 0;
  const memberCreditCost = action.member_credit_cost ?? 0;

  // ── Same cost in & out of quota — simple per-action cost ────────────────
  if (memberCreditCost === actualCreditCost) {
    if (memberCreditCost === 0) return 'Free';
    const creditWord = memberCreditCost === 1 ? 'credit' : 'credits';
    const actionNoun = pluralize(label.toLowerCase(), 1);
    return `Cost: ${memberCreditCost} ${creditWord} for each ${actionNoun}`;
  }

  // ── Finite quota (limit != null) — two-tier pricing ─────────────────────
  if (limitValue != null) {
    const actionNoun  = pluralize(label.toLowerCase(), limitValue);
    const firstPart   = memberCreditCost > 0
      ? `First ${limitValue} ${actionNoun} at ${memberCreditCost} ${memberCreditCost === 1 ? 'credit' : 'credits'} each`
      : `First ${limitValue} ${actionNoun} free`;

    if (action.apply_credit_after_limit) {
      // Credits can buy more after the free/quota allotment is used
      const creditWord = actualCreditCost === 1 ? 'credit' : 'credits';
      return `Cost: ${firstPart}, then ${actualCreditCost} ${creditWord} each`;
    }
    // No credits after limit — must wait for reset
    return `Cost: ${firstPart}, then wait until reset`;
  }

  // ── Unlimited (limit == null) — per-action cost or free ─────────────────
  if (memberCreditCost > 0) {
    const creditWord = memberCreditCost === 1 ? 'credit' : 'credits';
    return `Cost: ${memberCreditCost} ${creditWord} each`;
  }
  return 'Free';
}

const QUOTA_META: Record<string, { label: string; icon: string; color: string }> = {
  LIKE:              { label: 'Likes',            icon: 'heart-outline',      color: colors.secondary    },
  SUPER_LIKE:        { label: 'Super Likes',       icon: 'star-outline',       color: colors.warning      },
  REWIND:            { label: 'Rewinds',           icon: 'refresh-outline',    color: colors.primary      },
  BOOST:             { label: 'Boosts',            icon: 'rocket-outline',     color: '#FF6B35'           },
  VOICE_MESSAGE:     { label: 'Voice Messages',    icon: 'mic-outline',        color: colors.verifiedBlue },
  IMAGE_MESSAGE:     { label: 'Image Messages',    icon: 'image-outline',      color: colors.primary      },
  MESSAGE:           { label: 'Messages',          icon: 'chatbubble-outline', color: colors.primary      },
  SUPER_MESSAGE:     { label: 'Super Messages',    icon: 'sparkles-outline',   color: colors.warning      },
  SEE_WHO_LIKED_YOU: { label: 'See Who Liked You', icon: 'eye-outline',        color: colors.primary      },
};

const QUOTA_ORDER = [
  'LIKE',
  'SUPER_LIKE',
  'REWIND',
  'BOOST',
  'VOICE_MESSAGE',
  'IMAGE_MESSAGE',
  'MESSAGE',
  'SUPER_MESSAGE',
  'SEE_WHO_LIKED_YOU',
];

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
  default: {},
});

// ─── QuotaRow ─────────────────────────────────────────────────────────────────

function QuotaRow({ actionCode, action, isLast }: {
  actionCode: string; action: ActionLimitAndCost; isLast: boolean;
}) {
  const { colors: th } = useTheme();
  const meta          = QUOTA_META[actionCode];
  const isUnlimited   = action.limit === null;
  const used          = action.used ?? 0;
  const limit         = action.limit ?? 1;
  const remaining     = action.remaining ?? 0;
  const progress      = isUnlimited ? 0 : Math.min(used / limit, 1);
  const periodSuffix  = formatPeriodSuffix(action.period_type);
  const costLine      = formatCostLine(meta.label, action);
  // Green when remaining > 0, red when exhausted
  const barColor      = isUnlimited ? meta.color : (remaining > 0 ? colors.success : colors.danger);

  return (
    <>
      <View style={quotaRowStyles.row}>
        <View style={[quotaRowStyles.iconWrap, { backgroundColor: `${meta.color}15` }]}>
          <Ionicons name={meta.icon as any} size={16} color={meta.color} />
        </View>
        <View style={quotaRowStyles.info}>
          {/* Label */}
          <Text style={[quotaRowStyles.label, { color: th.text }]}>{meta.label}</Text>

          {isUnlimited ? (
            <>
              <Text style={[quotaRowStyles.unlimitedText, { color: colors.success }]}>Unlimited</Text>
              <Text style={[quotaRowStyles.subText, { color: th.textSecondary }]}>
                {costLine}
              </Text>
            </>
          ) : (
            <>
              {/* used / limit per {period} */}
              <Text style={[quotaRowStyles.usage, { color: th.textSecondary }]}>
                {used.toLocaleString()} / {limit.toLocaleString()}{periodSuffix ? ` ${periodSuffix}` : ''}
              </Text>

              {/* Progress bar + remaining text */}
              <View style={quotaRowStyles.barRow}>
                <View style={[quotaRowStyles.track, { backgroundColor: `${barColor}20` }]}>
                  <View style={[quotaRowStyles.fill, { backgroundColor: barColor, width: `${Math.round(progress * 100)}%` }]} />
                </View>
                <Text style={[quotaRowStyles.remaining, { color: barColor }]}>
                  {remaining > 0 ? `${remaining} left` : 'Wait until reset'}
                </Text>
              </View>

              {/* Resets at {resets_at} */}
              {action.resets_at && (
                <Text style={[quotaRowStyles.subText, { color: th.textSecondary }]}>
                  {formatResetTime(action.resets_at)}
                </Text>
              )}

              {/* Cost — always shown */}
              <Text style={[quotaRowStyles.subText, { color: th.textSecondary }]}>
                {costLine}
              </Text>
            </>
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
  info:          { flex: 1, gap: 5 },
  label:         { fontSize: 14, fontWeight: '700' },
  usage:         { fontSize: 12, fontWeight: '500' },
  barRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track:         { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill:          { height: 6, borderRadius: 3 },
  remaining:     { fontSize: 11, fontWeight: '700' },
  unlimitedText: { fontSize: 13, fontWeight: '700' },
  subText:       { fontSize: 11, fontWeight: '500' },
  divider:       { height: 1, marginHorizontal: 16 },
});

// ─── BalancesScreen ───────────────────────────────────────────────────────────

export default function BalancesScreen() {
  const router  = useRouter();
  const { colors: th }  = useTheme();
  const { entitlements, isLoading, isRefetching, refreshEntitlements } = useEntitlements();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();

  if (isLoading || !entitlements) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { plan, subscription, credits, limits_and_costs, active_boost } = entitlements;
  const isPremium         = isPremiumPlan(plan);
  const isFreePremium     = isFreePremiumPlan(plan);
  const planLabel         = isFreePremium ? 'Free Premium' : isPremium ? 'Premium' : 'Free';
  const planIcon          = isFreePremium ? 'gift-outline' : isPremium ? 'diamond-outline' : 'person-circle-outline';
  const planColor         = isFreePremium ? colors.warning : isPremium ? colors.primary : th.textSecondary;
  const creditsEnabled    = entitlements.country_settings?.credits_enabled ?? true;
  const subscriptionEnabled = entitlements.country_settings?.subscription_enabled ?? true;

  // Boost progress: fraction of total duration still remaining
  const boostTotalSeconds = (entitlements.boost_duration_minutes ?? 30) * 60;
  const boostProgress = active_boost && boostTotalSeconds > 0
    ? Math.min(active_boost.remaining_seconds / boostTotalSeconds, 1)
    : 0;

  // Render the 6 known actions in canonical order, pulling each from the
  // merged `limits_and_costs` map. Unknown actions from the API are ignored.
  const lacMap = limits_and_costs ?? {};
  const quotaEntries: [string, ActionLimitAndCost][] = QUOTA_ORDER
    .filter((code) => code in QUOTA_META && lacMap[code])
    .map((code) => [code, lacMap[code]] as [string, ActionLimitAndCost]);

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
          style={[styles.iconBtn, { backgroundColor: th.backgroundElement, opacity: isRefetching ? 0.5 : 1 }]}
          onPress={() => refreshEntitlements()}
          disabled={isRefetching}
          accessibilityLabel="Refresh balances"
          accessibilityRole="button"
        >
          {isRefetching
            ? <ActivityIndicator size="small" color={th.text} />
            : <Ionicons name="refresh-outline" size={20} color={th.text} />
          }
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
        ) : subscriptionEnabled ? (
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
            <Pressable
              style={[styles.upgradePill, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(app)/premium' as any)}
              accessibilityRole="button"
              accessibilityLabel="Go Premium"
            >
              <Ionicons name="diamond-outline" size={14} color="#fff" />
              <Text style={styles.upgradePillText}>Go Premium</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Active Boost ───────────────────────────────────────────────────── */}
        {active_boost && active_boost.remaining_seconds > 0 && (
          <LinearGradient
            colors={['#FF6B3522', '#FF6B350A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.boostCard, { borderColor: '#FF6B3538' }]}
          >
            <View style={styles.boostHeaderRow}>
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
            </View>
            <View style={[styles.boostTrack, { backgroundColor: '#FF6B3520' }]}>
              <View style={[styles.boostFill, { width: `${Math.round(boostProgress * 100)}%` }]} />
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
              {quotaEntries.map(([code, action], idx) => (
                <QuotaRow
                  key={code}
                  actionCode={code}
                  action={action}
                  isLast={idx === quotaEntries.length - 1}
                />
              ))}
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
    borderRadius: radius.lg, borderWidth: 1, padding: 16, gap: 12,
  },
  boostHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  boostTrack: {
    height: 6, borderRadius: 3, overflow: 'hidden',
  },
  boostFill: {
    height: 6, borderRadius: 3, backgroundColor: '#FF6B35',
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
