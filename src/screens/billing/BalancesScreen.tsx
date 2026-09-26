import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useLikeActions } from '@/hooks/discovery/useLikeActions';
import { useTheme } from '@/hooks/use-theme';
import type { ActionLimitAndCost, ActionVariantLimitAndCost } from '@/types/billing';
import { isFreePremiumPlan, isPremiumPlan } from '@/types/billing';
import type { LikeActionVariantDto } from '@/types/discovery';
import { likeVariantResetHint } from '@/utils/likeVariants';

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

function formatPeriodLabel(periodType: string | null | undefined): string {
  switch (periodType) {
    case 'DAY':           return 'per day';
    case 'MONTH':         return 'per month';
    case 'BILLING_CYCLE': return 'per cycle';
    case 'WEEK':          return 'per week';
    case 'YEAR':          return 'per year';
    case 'LIFETIME':      return 'per recipient';
    default:              return '';
  }
}

const PER_RECIPIENT_ACTIONS = new Set(['MESSAGE', 'VOICE_MESSAGE', 'IMAGE_MESSAGE']);

const QUOTA_META: Record<string, { label: string; icon: string; color: string }> = {
  LIKE:              { label: 'Likes',                  icon: 'heart-outline',      color: colors.secondary    },
  SUPER_LIKE:        { label: 'Super Likes',             icon: 'star-outline',       color: colors.warning      },
  REWIND:            { label: 'Rewinds',                 icon: 'refresh-outline',    color: colors.primary      },
  BOOST:             { label: 'Boosts',                  icon: 'rocket-outline',     color: '#FF6B35'           },
  VOICE_MESSAGE:     { label: 'Voice Messages',          icon: 'mic-outline',        color: colors.verifiedBlue },
  IMAGE_MESSAGE:     { label: 'Image Messages',          icon: 'image-outline',      color: colors.primary      },
  MESSAGE:           { label: 'Messages',                icon: 'chatbubble-outline', color: colors.primary      },
  SUPER_MESSAGE:     { label: 'Before-Match Messages',   icon: 'sparkles-outline',   color: colors.warning      },
  SEE_WHO_LIKED_YOU: { label: 'See Who Liked You',       icon: 'eye-outline',        color: colors.primary      },
};

const QUOTA_ORDER = [
  'MESSAGE', 'VOICE_MESSAGE', 'IMAGE_MESSAGE',
  'LIKE', 'SUPER_LIKE',
  'REWIND', 'BOOST', 'SUPER_MESSAGE', 'SEE_WHO_LIKED_YOU',
];

const ACTION_DEFINITIONS: Record<string, { title: string; description: string }> = {
  LIKE:              { title: 'Like',                   description: 'Expressing interest in a profile to create a potential match.' },
  SUPER_LIKE:        { title: 'Super Like',              description: 'Highlighting your profile to let someone know you are extremely interested before they swipe.' },
  REWIND:            { title: 'Rewind',                  description: 'Reversing your last swipe or action to undo an accidental pass or like.' },
  BOOST:             { title: 'Boost',                   description: "Temporarily increasing your profile's visibility to get more views and matches." },
  VOICE_MESSAGE:     { title: 'Voice Message',           description: 'Sending an audio recording instead of text in a chat.' },
  IMAGE_MESSAGE:     { title: 'Image Message',           description: 'Sending a photo or picture within a chat conversation.' },
  MESSAGE:           { title: 'Message',                 description: 'Sending a standard text communication to a matched user.' },
  SUPER_MESSAGE:     { title: 'Before-Match Message',    description: 'Sending a message to someone prior to matching to grab their attention.' },
  SEE_WHO_LIKED_YOU: { title: 'See Who Liked You',       description: 'Viewing a list of users who have already liked your profile before you swipe on them.' },
};

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 2 },
  default: {},
});

// ─── VariantIcon ──────────────────────────────────────────────────────────────
// Inline here to avoid importing from LikeVariantButtons (avoids circular deps)
function VariantIconImg({ variant, size }: { variant: LikeActionVariantDto; size: number }) {
  const [failed, setFailed] = useState(false);
  if (!variant.icon || failed) {
    return <Ionicons name="heart" size={size} color={colors.secondary} />;
  }
  return (
    <Image
      source={{ uri: variant.icon }}
      style={{ width: size, height: size }}
      contentFit="contain"
      onError={() => setFailed(true)}
    />
  );
}

// ─── UsageBar ─────────────────────────────────────────────────────────────────
function UsageBar({ used, limit, color }: { used: number; limit: number; color: string }) {
  const { colors: th } = useTheme();
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const isNearLimit = pct >= 0.8;
  const barColor = isNearLimit ? colors.warning : color;
  return (
    <View style={[usageBarStyles.track, { backgroundColor: th.border }]}>
      <View style={[usageBarStyles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: barColor }]} />
    </View>
  );
}
const usageBarStyles = StyleSheet.create({
  track: { height: 4, borderRadius: 2, overflow: 'hidden', flex: 1 },
  fill:  { height: 4, borderRadius: 2 },
});

// ─── QuotaRow ─────────────────────────────────────────────────────────────────

type ActionDefinition = { title: string; description: string };

/**
 * A single row in the Usage section. Shows:
 *  - icon + label
 *  - pill chips: limit/period, credit cost
 *  - usage bar + "X / Y used" for periodic limits
 *  - note line (reset hint when blocked, remaining count otherwise)
 */
function QuotaRow({
  label, icon, accentColor,
  limit, used, remaining, periodType, memberCreditCost, actualCreditCost,
  applyCreditsAfterLimit, isPerRecipient,
  blocked, note, definition, isLast,
  onInfo,
}: {
  label: string;
  icon: ReactNode;
  accentColor: string;
  limit: number | null;
  used: number;
  remaining: number | null;
  periodType: string;
  memberCreditCost: number;
  actualCreditCost: number;
  applyCreditsAfterLimit: boolean;
  isPerRecipient: boolean;
  blocked?: boolean;
  note?: { text: string; color?: string } | null;
  definition?: ActionDefinition | null;
  isLast: boolean;
  onInfo: (def: ActionDefinition) => void;
}) {
  const { colors: th } = useTheme();
  const isUnlimited = limit === null;
  const periodLabel = formatPeriodLabel(periodType);
  const showBar = !isUnlimited && !isPerRecipient && limit != null && limit > 0;
  const usedDisplay = used ?? 0;

  return (
    <>
      <View style={qStyles.row}>
        {/* Icon */}
        <View style={[qStyles.iconWrap, { backgroundColor: `${accentColor}15` }]}>
          {icon}
        </View>

        {/* Body */}
        <View style={qStyles.body}>
          {/* Label row */}
          <View style={qStyles.labelRow}>
            <Text style={[qStyles.label, { color: th.text }]}>{label}</Text>
            {definition && (
              <Pressable onPress={() => onInfo(definition)} hitSlop={8} accessibilityRole="button">
                <View style={[qStyles.helpDot, { borderColor: th.border }]}>
                  <Text style={[qStyles.helpDotText, { color: th.textMuted }]}>?</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Chips row: limit + cost */}
          <View style={qStyles.chipsRow}>
            {isUnlimited ? (
              <View style={[qStyles.chip, { backgroundColor: `${colors.success}14`, borderColor: `${colors.success}30` }]}>
                <Ionicons name="infinite-outline" size={11} color={colors.success} />
                <Text style={[qStyles.chipText, { color: colors.success }]}>Unlimited</Text>
              </View>
            ) : (
              <View style={[qStyles.chip, { backgroundColor: `${accentColor}12`, borderColor: `${accentColor}28` }]}>
                <Text style={[qStyles.chipText, { color: accentColor }]}>
                  {limit?.toLocaleString()}{periodLabel ? ` ${periodLabel}` : ''}
                </Text>
              </View>
            )}
            {memberCreditCost > 0 && (
              <View style={[qStyles.chip, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
                <Ionicons name="diamond" size={10} color={colors.primary} />
                <Text style={[qStyles.chipText, { color: colors.primary }]}>
                  {memberCreditCost} {memberCreditCost === 1 ? 'credit' : 'credits'} each
                </Text>
              </View>
            )}
            {!isUnlimited && applyCreditsAfterLimit && actualCreditCost > 0 && memberCreditCost === 0 && (
              <View style={[qStyles.chip, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}25` }]}>
                <Ionicons name="diamond" size={10} color={colors.primary} />
                <Text style={[qStyles.chipText, { color: colors.primary }]}>
                  {actualCreditCost} cr after limit
                </Text>
              </View>
            )}
          </View>

          {/* Usage bar + counter */}
          {showBar && (
            <View style={qStyles.barRow}>
              <UsageBar used={usedDisplay} limit={limit!} color={accentColor} />
              <Text style={[qStyles.barLabel, { color: th.textMuted }]}>
                {usedDisplay} / {limit!.toLocaleString()}
              </Text>
            </View>
          )}

          {/* Note line (reset hint or remaining) */}
          {note && (
            <Text style={[qStyles.note, { color: note.color ?? th.textMuted }]}>
              {blocked && <Ionicons name="lock-closed-outline" size={10} color={note.color ?? th.textMuted} />}
              {blocked ? '  ' : ''}{note.text}
            </Text>
          )}
        </View>
      </View>
      {!isLast && <View style={[qStyles.divider, { backgroundColor: th.border }]} />}
    </>
  );
}

const qStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  iconWrap:  { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  body:      { flex: 1, gap: 6 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label:     { fontSize: 14, fontWeight: '700', flex: 1 },
  helpDot:   { width: 17, height: 17, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  helpDotText: { fontSize: 10, fontWeight: '700', lineHeight: 12 },
  chipsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  chipText:  { fontSize: 11, fontWeight: '600' },
  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  barLabel:  { fontSize: 11, fontWeight: '600', minWidth: 52, textAlign: 'right' },
  note:      { fontSize: 12, fontWeight: '500' },
  divider:   { height: 1, marginHorizontal: 16 },
});

// ─── ActionQuotaRow ───────────────────────────────────────────────────────────

function ActionQuotaRow({ actionCode, action, isLast, onInfo }: {
  actionCode: string; action: ActionLimitAndCost; isLast: boolean;
  onInfo: (def: ActionDefinition) => void;
}) {
  const meta = QUOTA_META[actionCode];
  const isPerRecipient = PER_RECIPIENT_ACTIONS.has(actionCode);
  return (
    <QuotaRow
      label={meta.label}
      icon={<Ionicons name={meta.icon as any} size={17} color={meta.color} />}
      accentColor={meta.color}
      limit={action.limit}
      used={action.used}
      remaining={action.remaining}
      periodType={action.period_type ?? ''}
      memberCreditCost={action.member_credit_cost ?? 0}
      actualCreditCost={action.actual_credit_cost ?? 0}
      applyCreditsAfterLimit={action.apply_credit_after_limit}
      isPerRecipient={isPerRecipient}
      definition={ACTION_DEFINITIONS[actionCode] ?? null}
      isLast={isLast}
      onInfo={onInfo}
    />
  );
}

// ─── LikeVariantQuotaRow ──────────────────────────────────────────────────────

/**
 * Quota row for a single LIKE variant (Rose, Fire, …) — remote variant icon.
 *
 * Limit/usage fields are merged from two sources:
 *  1. `GET /discovery/like-actions` per-variant fields (limit, used,
 *     remaining, resets_at, period_type, blocked) — authoritative when the
 *     backend ships them. `undefined` = field absent → fall back.
 *  2. `limits_and_costs.LIKE.variants[code]` from the entitlements payload —
 *     used when the like-actions fields aren't present.
 */
function LikeVariantQuotaRow({ variant, quota, isLast, onInfo }: {
  variant: LikeActionVariantDto;
  quota?: ActionVariantLimitAndCost | null;
  isLast: boolean;
  onInfo: (def: ActionDefinition) => void;
}) {
  const limit       = variant.limit !== undefined ? variant.limit : (quota?.limit ?? null);
  const used        = variant.used ?? quota?.used ?? 0;
  const remaining   = variant.remaining !== undefined ? variant.remaining : (quota?.remaining ?? null);
  const resetsAt    = variant.resets_at !== undefined ? variant.resets_at : (quota?.resets_at ?? null);
  const periodType  = variant.period_type !== undefined ? (variant.period_type ?? '') : (quota?.period_type ?? '');
  const memberCost  = variant.credits > 0 ? variant.credits : (quota?.member_credit_cost ?? 0);
  const actualCost  = quota?.actual_credit_cost ?? memberCost;
  // Credits can still be charged after the free limit is exhausted.
  const applyAfter  = remaining === 0
    && (quota?.apply_credit_after_limit ?? (variant.blocked === false || memberCost > 0));
  const blocked     = variant.blocked === true
    || (remaining === 0 && limit != null && !applyAfter);

  const remainingSuffix = (
    { DAY: 'today', WEEK: 'this week', MONTH: 'this month', BILLING_CYCLE: 'this cycle', YEAR: 'this year' } as Record<string, string>
  )[periodType];

  const note = blocked
    ? { text: likeVariantResetHint({ ...variant, period_type: periodType || null, resets_at: resetsAt }), color: colors.warning }
    : remaining != null
      ? { text: `${remaining} left${remainingSuffix ? ` ${remainingSuffix}` : ''}` }
      : null;

  return (
    <QuotaRow
      label={variant.name || 'Like'}
      icon={<VariantIconImg variant={variant} size={20} />}
      accentColor={colors.secondary}
      limit={limit}
      used={used}
      remaining={remaining}
      periodType={periodType}
      memberCreditCost={memberCost}
      actualCreditCost={actualCost}
      applyCreditsAfterLimit={applyAfter}
      isPerRecipient={false}
      blocked={blocked}
      note={note}
      definition={variant.description
        ? { title: variant.name || 'Like', description: variant.description }
        : null}
      isLast={isLast}
      onInfo={onInfo}
    />
  );
}

// ─── BalancesScreen ───────────────────────────────────────────────────────────

export default function BalancesScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const { entitlements, isLoading, isRefetching, refreshEntitlements } = useEntitlements();
  const { variants: likeVariants } = useLikeActions();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const [infoDefinition, setInfoDefinition] = useState<ActionDefinition | null>(null);

  if (isLoading || !entitlements) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { plan, subscription, credits, limits_and_costs, active_boost } = entitlements;
  const isPremium           = isPremiumPlan(plan);
  const isFreePremium       = isFreePremiumPlan(plan);
  const planLabel           = isFreePremium ? 'Free Premium' : isPremium ? 'Premium' : 'Free';
  const planIcon            = isFreePremium ? 'gift-outline' : isPremium ? 'diamond-outline' : 'person-circle-outline';
  const planColor           = isFreePremium ? colors.warning : isPremium ? colors.primary : th.textSecondary;
  const creditsEnabled      = entitlements.country_settings?.credits_enabled ?? true;
  const subscriptionEnabled = entitlements.country_settings?.subscription_enabled ?? true;

  const boostTotalSeconds = (entitlements.boost_duration_minutes ?? 30) * 60;
  const boostProgress = active_boost && boostTotalSeconds > 0
    ? Math.min(active_boost.remaining_seconds / boostTotalSeconds, 1)
    : 0;

  const lacMap = limits_and_costs ?? {};
  const showLikeVariants = likeVariants.length > 0;
  const likeEntry = lacMap.LIKE;
  const likeVariantQuotas = likeEntry?.variants ?? {};

  type QuotaItem =
    | { kind: 'action'; code: string; action: ActionLimitAndCost }
    | { kind: 'variant'; variant: LikeActionVariantDto; quota: ActionVariantLimitAndCost | null };

  const quotaItems: QuotaItem[] = [];
  for (const code of QUOTA_ORDER) {
    if (code === 'LIKE' && showLikeVariants) {
      for (const v of likeVariants) {
        quotaItems.push({
          kind: 'variant',
          variant: v,
          // Per-variant quota from entitlements; fall back to the parent LIKE
          // entry so limits still render when no per-variant entry exists.
          quota: likeVariantQuotas[v.code] ?? likeEntry ?? null,
        });
      }
      continue;
    }
    if (code === 'SUPER_LIKE' && showLikeVariants) continue;
    if (!(code in QUOTA_META) || !lacMap[code]) continue;
    quotaItems.push({ kind: 'action', code, action: lacMap[code] });
  }

  return (
    <View style={[styles.screen, { backgroundColor: th.backgroundElement, paddingTop: safeTop }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: th.surface, borderBottomColor: th.border }]}>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: th.backgroundElement }]}
          onPress={() => router.replace('/(app)/(tabs)/profile' as any)}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottom + 40 }]}
        showsVerticalScrollIndicator={false}
        bounces
      >

        {/* ── Plan Card ── */}
        {isPremium ? (
          <LinearGradient
            colors={
              isFreePremium
                ? [`${colors.warning}22`, `${colors.warning}0A`, `${th.backgroundElement}00`]
                : [`${colors.primary}1C`, `${colors.primaryLight}0E`, `${th.backgroundElement}00`]
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

        {/* ── Active Boost ── */}
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

        {/* ── Credits ── */}
        {creditsEnabled && (
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <View style={[styles.blockIconBadge, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="diamond-outline" size={13} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.primary }]}>Credits</Text>
            </View>
            <LinearGradient
              colors={[`${colors.primary}16`, `${colors.primaryLight}0A`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.creditCard, { borderColor: `${colors.primary}28` }, cardShadow]}
            >
              <View style={styles.creditRow}>
                <View style={[styles.creditIconRing, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}28` }]}>
                  <Ionicons name="diamond" size={26} color={colors.primary} />
                </View>
                <View style={styles.creditTextCol}>
                  <Text style={[styles.creditValue, { color: colors.primary }]}>
                    {credits.credit_balance.toLocaleString()}
                  </Text>
                  <Text style={[styles.creditLabel, { color: th.textSecondary }]}>Available credits</Text>
                </View>
                <Pressable
                  style={[styles.buyPill, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/(app)/credits-shop' as any)}
                  accessibilityLabel="Buy credits"
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={styles.buyPillText}>Buy</Text>
                </Pressable>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── Usage / Quotas ── */}
        {quotaItems.length > 0 && (
          <View style={styles.block}>
            <View style={styles.blockHeader}>
              <View style={[styles.blockIconBadge, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="stats-chart-outline" size={13} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.primary }]}>Usage & Limits</Text>
            </View>
            <View style={[styles.listCard, { backgroundColor: th.surface, borderColor: th.border }, cardShadow]}>
              {quotaItems.map((item, idx) => {
                const isLast = idx === quotaItems.length - 1;
                return item.kind === 'variant' ? (
                  <LikeVariantQuotaRow
                    key={`like-variant-${item.variant.code}`}
                    variant={item.variant}
                    quota={item.quota}
                    isLast={isLast}
                    onInfo={setInfoDefinition}
                  />
                ) : (
                  <ActionQuotaRow
                    key={item.code}
                    actionCode={item.code}
                    action={item.action}
                    isLast={isLast}
                    onInfo={setInfoDefinition}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* ── Upgrade CTA ── */}
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

      {/* ── Action definition modal ── */}
      <Modal
        transparent
        animationType="fade"
        visible={infoDefinition !== null}
        onRequestClose={() => setInfoDefinition(null)}
      >
        <Pressable style={infoModalStyles.overlay} onPress={() => setInfoDefinition(null)}>
          <View style={[infoModalStyles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
            <View style={infoModalStyles.header}>
              <Text style={[infoModalStyles.title, { color: th.text }]}>
                {infoDefinition?.title ?? ''}
              </Text>
              <Pressable onPress={() => setInfoDefinition(null)} accessibilityLabel="Close" accessibilityRole="button">
                <Ionicons name="close" size={20} color={th.textSecondary} />
              </Pressable>
            </View>
            <Text style={[infoModalStyles.description, { color: th.textSecondary }]}>
              {infoDefinition?.description ?? ''}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Info modal styles ────────────────────────────────────────────────────────

const infoModalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: { width: '100%', maxWidth: 360, borderRadius: radius.lg, borderWidth: 1, padding: 20 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  title:       { fontSize: 16, fontWeight: '800', flex: 1 },
  description: { fontSize: 14, lineHeight: 21 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800' },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: 20 },

  // Section block
  block:       { gap: spacing.sm },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 2 },
  blockIconBadge: {
    width: 22, height: 22, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  blockTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },

  // Plan card (premium)
  planCard: { borderRadius: radius.lg, borderWidth: 1, padding: 18 },
  planRow:      { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  planBadgeText:  { color: '#fff', fontSize: 12, fontWeight: '800' },
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
  freePlanLeft:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  freePlanTitle:   { fontSize: 15, fontWeight: '800' },
  freePlanSub:     { fontSize: 12, fontWeight: '500', marginTop: 1 },
  upgradePill:     {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
  },
  upgradePillText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Boost card
  boostCard:      { borderRadius: radius.lg, borderWidth: 1, padding: 16, gap: 12 },
  boostHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  boostIconRing:  {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  boostTextWrap:  { flex: 1 },
  boostTitle:     { fontSize: 14, fontWeight: '800' },
  boostTimer:     { fontSize: 13, fontWeight: '600', marginTop: 2 },
  boostTrack:     { height: 6, borderRadius: 3, overflow: 'hidden' },
  boostFill:      { height: 6, borderRadius: 3, backgroundColor: '#FF6B35' },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  liveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF6B35' },
  liveText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: '#FF6B35' },

  // Credits card
  creditCard:    { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  creditRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  creditIconRing: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  creditTextCol: { flex: 1 },
  creditValue:   { fontSize: 34, fontWeight: '900', lineHeight: 38 },
  creditLabel:   { fontSize: 13, fontWeight: '500', marginTop: 2 },
  buyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
  },
  buyPillText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Quota list card
  listCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },

  // Upgrade CTA
  ctaBtn:      { borderRadius: radius.lg, overflow: 'hidden' },
  ctaGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
});
