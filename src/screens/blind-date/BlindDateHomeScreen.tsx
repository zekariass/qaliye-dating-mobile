import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlindDateBottomNav, { useBlindDateTheme } from '@/components/blind-date/BlindDateBottomNav';
import JoinedBlindDatesView from '@/components/blind-date/JoinedBlindDatesView';
import SessionSwipeCard, {
  type SessionSwipeCardHandle,
  type SessionSwipeDirection,
} from '@/components/blind-date/SessionSwipeCard';
import { themedAlert, themedError } from '@/components/common/ThemedAlert';
import { bdColors, bdGradients } from '@/constants/blindDateTheme';
import { colors } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useBlindDateConfiguration } from '@/hooks/blindDate/useBlindDateConfiguration';
import { useDiscoverSessions } from '@/hooks/blindDate/useDiscoverSessions';
import { useJoinSession } from '@/hooks/blindDate/useJoinSession';
import {
  useMyBlindDateSessions
} from '@/hooks/blindDate/useMyBlindDateSessions';
import { useMyParticipations } from '@/hooks/blindDate/useMyParticipations';
import { useWinnerPhotoUrl } from '@/hooks/blindDate/useSessionResults';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type {
  BlindDateMySessionDto,
  BlindDateSessionSummaryDto
} from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';
import { blindDateErrorMessage } from '@/utils/blindDateErrors';
import { getCostForAction, isInsufficientCreditsError } from '@/utils/entitlements';
import { getSwipeCardWidth, rs, useTabletScale } from '@/utils/responsive';

// ─── Layout constants ─────────────────────────────────────────────────────────

const SCREEN_W  = Dimensions.get('window').width;
const SCREEN_H  = Dimensions.get('window').height;
const IS_TABLET = SCREEN_W >= 500;
// Tablet: same 93%-of-screen width the discovery swipe card uses — the old
// 560px cap left the screens phone-width and centered on iPads.
const CONTENT_W = IS_TABLET ? getSwipeCardWidth(SCREEN_W) : SCREEN_W;
const OUTER_PAD = 16;


type HomeTab = 'open' | 'mine' | 'participating';

// Row union for the list-based My Own tab.
type Row =
  | { kind: 'loading' }
  | { kind: 'error'; onRetry: () => void }
  | { kind: 'empty' }
  | { kind: 'mySession'; session: BlindDateMySessionDto };

// Join failures that mean the session is no longer joinable → drop the card.
const TERMINAL_JOIN_ERRORS = new Set([
  'session_not_open',
  'session_expired',
  'session_full',
  'join_window_closed',
  'no_open_round',
  'session_not_found',
  'blocked',
  'creator_disabled_blind_date',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t('blindDate.time.justNow');
  if (mins < 60) return i18n.t('blindDate.time.minutesAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return i18n.t('blindDate.time.hoursAgo', { count: hrs });
  const days = Math.floor(hrs / 24);
  return i18n.t('blindDate.time.daysAgo', { count: days });
}

function sessionTitle(session: BlindDateSessionSummaryDto): string {
  return session.title?.trim() || i18n.t('blindDate.common.blindDate');
}

const cardShadow = Platform.select({
  ios: {
    shadowColor:   '#1B1C32',
    shadowOpacity: 0.09,
    shadowRadius:  18,
    shadowOffset:  { width: 0, height: 5 },
  },
  android: { elevation: 4 },
  default: {},
});

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ title, onHelp, onProfile }: { title: string; onHelp: () => void; onProfile: () => void }) {
  const { t } = useTranslation();
  const { textPrimary, textMuted } = useBlindDateTheme();
  const scale = useTabletScale();
  return (
    <View style={styles.headerWrap}>
      <View style={styles.header}>
        {/* Left: blind date icon + title */}
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/blind-date-icon.png')}
            style={[styles.headerIcon, { width: rs(34, scale), height: rs(34, scale) }]}
            resizeMode="contain"
          />
          <Text style={[styles.headerTitle, { color: textPrimary, fontSize: rs(18, scale) }]}>{title}</Text>
        </View>

        {/* Right: profile + help buttons */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { width: rs(36, scale), height: rs(36, scale), borderRadius: rs(18, scale) }]}
            onPress={onProfile}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('blindDate.nav.profile')}
          >
            <LinearGradient
              colors={bdGradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerIconBtnInner, { borderRadius: rs(18, scale) }]}
            >
              <Ionicons name="person" size={rs(18, scale)} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, { height: rs(36, scale), borderRadius: rs(18, scale) }]}
            onPress={onHelp}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('blindDate.home.helpA11y')}
          >
            <LinearGradient
              colors={bdGradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.headerBtnInner, { borderRadius: rs(18, scale), paddingHorizontal: rs(14, scale), gap: rs(5, scale) }]}
            >
              <Ionicons name="help" size={rs(14, scale)} color="#FFF" />
              <Text style={[styles.headerBtnText, { fontSize: rs(13, scale) }]}>
                {t('blindDate.home.help')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Subtitle */}
      <Text style={[styles.headerSub, { color: textMuted, fontSize: rs(12.5, scale) }]}>
        {t('blindDate.home.headerSubtitle')}
      </Text>
    </View>
  );
}

// ─── My session card (creator side) ───────────────────────────────────────────

type SessionCardTone = {
  /** Status pill label + colors. */
  label: string;
  fg: string;
  bg: string;
  /** Accent driving the card border, round block and CTA. */
  accent: string;
  /** Round-block background (light / dark). */
  blockBg: string;
  blockBgDark: string;
  /** Round-block icon. */
  icon: keyof typeof Ionicons.glyphMap;
};

const TONE_ENDED: Pick<SessionCardTone, 'accent' | 'blockBg' | 'blockBgDark'> = {
  accent: '#8A93A6',
  blockBg: '#F1F2F6',
  blockBgDark: 'rgba(138,147,166,0.12)',
};

/**
 * Visual tone for a My Sessions card, driven by status + final outcome:
 * live glows violet, the reveal stage glows gold, a matched card goes rose,
 * and terminated sessions cool to slate / amber / red.
 */
function sessionCardTone(session: BlindDateMySessionDto): SessionCardTone {
  const outcome = session.outcome ?? session.final_decision?.outcome ?? null;
  const matched = outcome === 'MATCHED' || outcome === 'ALREADY_MATCHED';
  switch (session.status) {
    case 'OPEN':
      return {
        label: i18n.t('blindDate.status.active'), fg: '#16A34A', bg: 'rgba(34,197,94,0.14)',
        accent: bdColors.primary,
        blockBg: '#F2E7FF', blockBgDark: 'rgba(138,44,255,0.10)', icon: 'heart',
      };
    case 'REVEAL':
      return {
        label: i18n.t('blindDate.status.reveal'), fg: '#B45309', bg: 'rgba(245,158,11,0.16)',
        accent: bdColors.gold,
        blockBg: '#FDF0D3', blockBgDark: 'rgba(245,158,11,0.12)', icon: 'eye',
      };
    case 'COMPLETED':
      if (matched) {
        return {
          label: i18n.t('blindDate.status.matched'), fg: '#D92C85', bg: 'rgba(255,79,163,0.15)',
          accent: colors.secondary,
          blockBg: '#FFE4F3', blockBgDark: 'rgba(255,79,163,0.14)', icon: 'heart',
        };
      }
      if (outcome === 'EXPIRED') {
        return {
          label: i18n.t('blindDate.status.expired'), fg: '#B45309', bg: 'rgba(245,158,11,0.15)',
          ...TONE_ENDED, icon: 'time-outline',
        };
      }
      return {
        label: i18n.t('blindDate.status.noMatch'), fg: '#6B7280', bg: 'rgba(107,114,128,0.15)',
        ...TONE_ENDED, icon: 'heart-dislike-outline',
      };
    case 'EXPIRED':
      return {
        label: i18n.t('blindDate.status.expired'), fg: '#B45309', bg: 'rgba(245,158,11,0.15)',
        ...TONE_ENDED, icon: 'time-outline',
      };
    case 'CANCELLED':
      return {
        label: i18n.t('blindDate.status.cancelled'), fg: '#DC2626', bg: 'rgba(239,68,68,0.13)',
        ...TONE_ENDED, icon: 'close-circle-outline',
      };
    default:
      return {
        label: i18n.t('blindDate.status.ended'), fg: '#6B7280', bg: 'rgba(107,114,128,0.15)',
        ...TONE_ENDED, icon: 'flag-outline',
      };
  }
}

function MySessionCard({
  session,
  ownPhotoUrl,
  onPress,
}: {
  session: BlindDateMySessionDto;
  ownPhotoUrl: string | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { card, textPrimary, textMuted, border, isDark } = useBlindDateTheme();
  const tone = sessionCardTone(session);
  const awaiting = session.awaiting_review_count ?? null;
  const round = session.current_round_number ?? session.rounds?.length ?? 1;
  // `/sessions/mine` returns joined rows too — label them accordingly.
  const isParticipant = session.role === 'PARTICIPANT';
  // Creator rows show the user's OWN photo (blurred — it's a blind date).
  // Joined rows show the host's preview photo, also blurred.
  const photoUrl = isParticipant
    ? session.creator?.primary_photo?.signed_url ?? null
    : ownPhotoUrl;

  const isLive = session.status === 'OPEN' || session.status === 'REVEAL';
  // Ended cards (closed/expired/cancelled/completed) get a quieter, greyed-out
  // look so live Blind Dates pop first — except matched cards, which keep
  // their rose glow as a celebration.
  const ended = !isLive;
  // `/sessions/mine` exposes the outcome inside `final_decision`; the flat
  // `outcome` field is only a defensive/forward-compatible fallback.
  const outcome = session.outcome ?? session.final_decision?.outcome ?? null;
  const matched = outcome === 'MATCHED' || outcome === 'ALREADY_MATCHED';
  // Truly terminated sessions (no match) get dimmed; matched stays vibrant.
  const dimmed = ended && !matched;

  // Matched with a revealed finalist → the thumb shows the winner's real
  // photo instead of the caller's blurred own photo. `null` while results
  // load, on error, or when there is no winner — all fall back to blurred.
  const winnerPhotoUrl = useWinnerPhotoUrl(matched && !isParticipant ? session.id : null);
  const winnerRevealed = matched && !!winnerPhotoUrl;
  const thumbUrl = winnerRevealed ? winnerPhotoUrl : photoUrl;

  // Reference: filled rose CTA while the session is live, outlined otherwise.
  const { ctaLabel, ctaFilled } = isParticipant
    ? session.status === 'OPEN'
      ? { ctaLabel: t('blindDate.home.continueRound', { number: round }), ctaFilled: true }
      : session.status === 'REVEAL'
        ? { ctaLabel: t('blindDate.home.viewReveal'), ctaFilled: true }
        : { ctaLabel: t('blindDate.home.viewResults'), ctaFilled: false }
    : session.status === 'OPEN'
      ? { ctaLabel: t('blindDate.home.manage'), ctaFilled: true }
      : session.status === 'REVEAL'
        ? { ctaLabel: t('blindDate.home.viewReveal'), ctaFilled: true }
        : session.status === 'COMPLETED'
          ? { ctaLabel: t('blindDate.home.viewResults'), ctaFilled: false }
          : { ctaLabel: t('blindDate.home.viewDetails'), ctaFilled: false };

  const roundLabel = session.status === 'COMPLETED'
    ? t('blindDate.home.outcome')
    : t('blindDate.home.currentRound');
  const roundValue =
    session.status === 'REVEAL'
      ? t('blindDate.home.finalReveal')
      : session.status === 'COMPLETED'
        ? matched
          ? t('blindDate.status.matched')
          : outcome === 'EXPIRED'
            ? t('blindDate.status.expired')
            : t('blindDate.status.noMatch')
        : t('blindDate.common.round', { number: round });

  return (
    <TouchableOpacity
      style={[
        styles.myCard,
        cardShadow,
        {
          backgroundColor: card,
          borderColor: dimmed
            ? border
            : isDark
              ? `${tone.accent}73`
              : `${tone.accent}59`,
        },
        dimmed && styles.myCardEnded,
      ]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
    >
      {/* Thumbnail — blurred photo (blind date), the revealed winner's photo
          once matched, or a rose gradient placeholder */}
      <View style={[styles.myThumb, dimmed && { opacity: 0.55 }]}>
        {thumbUrl ? (
          <>
            <Image
              source={{ uri: thumbUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={winnerRevealed ? 0 : 100}
            />
            {!winnerRevealed && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,8,40,0.4)' }]} />
            )}
          </>
        ) : (
          <LinearGradient
            colors={bdGradients.hero as unknown as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        <Ionicons name="heart" size={24} color="rgba(255,255,255,0.9)" />
        <View
          style={[
            styles.myThumbHeart,
            matched && { backgroundColor: colors.secondary },
          ]}
        >
          <Ionicons name={matched ? 'heart' : 'lock-closed'} size={11} color="#FFF" />
        </View>
      </View>

      {/* Body */}
      <View style={styles.myBody}>
        <View style={styles.myTitleRow}>
          <Text
            style={[styles.myTitle, { color: dimmed ? textMuted : textPrimary }]}
            numberOfLines={2}
          >
            {sessionTitle(session)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isParticipant && (
              <View style={[styles.statusPill, { backgroundColor: isDark ? 'rgba(138,147,166,0.18)' : '#EEF1F6' }]}>
                <Text style={[styles.statusPillText, { color: textMuted }]}>{t('blindDate.home.joinedBadge')}</Text>
              </View>
            )}
            <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: tone.fg }]} />
              <Text style={[styles.statusPillText, { color: tone.fg }]}>{tone.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.myMetaRow}>
          <Ionicons name="people-outline" size={13} color={textMuted} />
          <Text style={[styles.myMetaText, { color: textMuted }]}>
            {t('blindDate.common.participants', { count: session.participant_count })}
          </Text>
          <Ionicons name="calendar-outline" size={13} color={textMuted} style={{ marginLeft: 10 }} />
          <Text style={[styles.myMetaText, { color: textMuted }]}>
            {t('blindDate.home.createdAgo', { time: formatRelativeTime(session.created_at) })}
          </Text>
        </View>
        {!isParticipant && awaiting !== null && awaiting > 0 && (
          <View style={styles.myMetaRow}>
            <Ionicons name="hourglass-outline" size={12} color="#F59E0B" />
            <Text style={[styles.myMetaText, { color: '#F59E0B' }]}>
              {t('blindDate.home.waitingForReview', { count: awaiting })}
            </Text>
          </View>
        )}

        {/* Round info + CTA — stacked, each full width (no overlap) */}
        <View
          style={[
            styles.roundBlock,
            { backgroundColor: isDark ? tone.blockBgDark : tone.blockBg },
          ]}
        >
          <Ionicons
            name={tone.icon}
            size={16}
            color={dimmed ? textMuted : tone.accent}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.roundKicker, { color: textMuted }]}>{roundLabel}</Text>
            <Text
              style={[styles.roundValue, { color: dimmed ? textMuted : tone.accent }]}
            >
              {roundValue}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.myCta,
            ctaFilled
              ? [styles.myCtaFilled, { backgroundColor: tone.accent }]
              : [styles.myCtaOutline, { borderColor: dimmed ? textMuted : tone.accent }],
          ]}
          onPress={onPress}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.myCtaText,
              { color: ctaFilled ? '#FFF' : dimmed ? textPrimary : tone.accent },
            ]}
          >
            {ctaLabel}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={ctaFilled ? '#FFF' : dimmed ? textMuted : tone.accent}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── My Own tools row (create + question set entry points) ───────────────────

function MineToolsRow({
  onCreate,
  onManageQuestions,
}: {
  onCreate: () => void;
  onManageQuestions: () => void;
}) {
  const { t } = useTranslation();
  const { isDark } = useBlindDateTheme();
  return (
    <View style={styles.mineTools}>
      {/* Question Set — soft rose outline (left, per reference) */}
      <TouchableOpacity
        style={[
          styles.mineToolBtn,
          styles.mineToolOutline,
          {
            borderColor: bdColors.primary,
            backgroundColor: isDark ? 'rgba(138,44,255,0.10)' : '#F2E7FF',
          },
        ]}
        onPress={onManageQuestions}
        activeOpacity={0.75}
        accessibilityRole="button"
      >
        <Ionicons name="list" size={16} color={bdColors.primary} />
        <Text style={[styles.mineToolText, { color: bdColors.primary }]}>{t('blindDate.home.questionSet')}</Text>
      </TouchableOpacity>

      {/* Create New — filled rose gradient (right) */}
      <TouchableOpacity
        style={styles.mineToolBtn}
        onPress={onCreate}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={bdGradients.hero as unknown as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
        />
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={styles.mineToolTextPrimary}>{t('blindDate.home.createNew')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── States ───────────────────────────────────────────────────────────────────

function CardSkeleton() {
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[styles.skeletonCard, pulseStyle]}>
      <View style={styles.skelBadgeRow}>
        <View style={styles.skelPill} />
        <View style={styles.skelPill} />
      </View>
      <View style={styles.skelCenter}>
        <View style={styles.skelCircle} />
      </View>
      <View style={styles.skelBottom}>
        <View style={[styles.skelLine, { width: 70, height: 26 }]} />
        <View style={[styles.skelLine, { width: 110 }]} />
        <View style={styles.skelChipRow}>
          <View style={styles.skelChip} />
          <View style={styles.skelChip} />
          <View style={styles.skelChip} />
        </View>
        <View style={[styles.skelLine, { width: '100%' }]} />
        <View style={styles.skelButton} />
      </View>
    </Animated.View>
  );
}

/** Branded illustration for the empty stack — gentle floating bob. */
function FloatingArtwork() {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withTiming(-10, { duration: 1700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));
  return (
    <Animated.View style={[styles.emptyArtWrap, style]} pointerEvents="none">
      <Image
        source={require('@/assets/images/blind-date-logo.png')}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
    </Animated.View>
  );
}

/** Hosted-tab empty state — dramatic dark spotlight treatment for the gender artwork. */
function HostedEmptyState({ onPrimary }: { onPrimary: () => void }) {
  const { t } = useTranslation();
  const { data: myProfile } = useCurrentProfile();
  const gender = (myProfile?.gender as 'MALE' | 'FEMALE' | null) ?? null;

  // Gentle floating bob
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withTiming(-12, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const artStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  const source =
    gender === 'FEMALE'
      ? require('@/assets/images/blind-date-man-unknown.png')
      : require('@/assets/images/blind-date-girl-unknown.png');

  return (
    <View style={styles.hostedEmpty}>
      {/* Dark romantic background */}
      <LinearGradient
        colors={['#1C0836', '#0D0524', '#0A0318']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating artwork — large and centred */}
      <Animated.View style={[styles.hostedArtWrap, artStyle]} pointerEvents="none">
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" />
      </Animated.View>

      {/* Bottom copy + CTA */}
      <View style={styles.hostedCopy}>
        <Text style={styles.hostedEyebrow}>{t('blindDate.home.emptyEyebrow')}</Text>
        <Text style={styles.hostedTitle}>{t('blindDate.home.emptyHostedTitle')}</Text>
        <Text style={styles.hostedSub}>
          {t('blindDate.home.emptyHostedSub')}
        </Text>
        <TouchableOpacity
          style={styles.hostedBtn}
          onPress={onPrimary}
          activeOpacity={0.88}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#FF4FA3', '#C044FF', '#7B2BFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.hostedBtnInner}
          >
            <Ionicons name="add-circle-outline" size={17} color="#FFF" />
            <Text style={styles.hostedBtnText}>{t('blindDate.common.startBlindDate')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyState({ tab, onPrimary, onRefresh }: { tab: 'open' | 'mine'; onPrimary: () => void; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  if (tab === 'open') {
    // Branded artwork backdrop — soft violet wash, floating illustration,
    // and a clean bottom-anchored copy block.
    return (
      <View style={[styles.emptyWrap, styles.emptyWrapArt]}>
        <LinearGradient
          colors={[...(isDark ? bdGradients.darkHero : bdGradients.soft)]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <FloatingArtwork />
        <View style={styles.emptyArtCopy}>
          <Text style={styles.emptyEyebrow}>{t('blindDate.home.emptyEyebrow')}</Text>
          <Text style={[styles.emptyTitle, { color: th.text }]}>{t('blindDate.home.emptyOpenTitle')}</Text>
          <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
            {t('blindDate.home.emptyOpenSub')}
          </Text>
          <View style={styles.emptyBtnRow}>
            <TouchableOpacity
              style={styles.emptyBtnArt}
              onPress={onPrimary}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[...bdGradients.hero]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyBtnArtInner}
              >
                <Ionicons name="add-circle-outline" size={15} color="#FFF" />
                <Text style={styles.emptyBtnText} numberOfLines={1}>{t('blindDate.common.startBlindDate')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.emptyBtnSecondary, { borderColor: th.border }]}
              onPress={onRefresh}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Ionicons name="refresh" size={15} color={th.text} />
              <Text style={[styles.emptyBtnSecondaryText, { color: th.text }]} numberOfLines={1}>{t('blindDate.common.refresh')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return <HostedEmptyState onPrimary={onPrimary} />;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.primary} />
      <Text style={[styles.errorTitle, { color: th.text }]}>{t('common.somethingWentWrong')}</Text>
      <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
        {t('blindDate.home.loadErrorSub')}
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onRetry} activeOpacity={0.8} accessibilityRole="button">
        <Text style={styles.emptyBtnText}>{t('blindDate.common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── How It Works modal ───────────────────────────────────────────────────────

type HowStep = { icon: keyof typeof Ionicons.glyphMap; titleKey: string; bodyKey: string };

const HOW_STEPS_PARTICIPANT: HowStep[] = [
  {
    icon: 'compass-outline',
    titleKey: 'blindDate.howItWorks.participantSteps.step1Title',
    bodyKey: 'blindDate.howItWorks.participantSteps.step1Body',
  },
  {
    icon: 'chatbubble-ellipses-outline',
    titleKey: 'blindDate.howItWorks.participantSteps.step2Title',
    bodyKey: 'blindDate.howItWorks.participantSteps.step2Body',
  },
  {
    icon: 'layers-outline',
    titleKey: 'blindDate.howItWorks.participantSteps.step3Title',
    bodyKey: 'blindDate.howItWorks.participantSteps.step3Body',
  },
  {
    icon: 'heart-outline',
    titleKey: 'blindDate.howItWorks.participantSteps.step4Title',
    bodyKey: 'blindDate.howItWorks.participantSteps.step4Body',
  },
];

const HOW_STEPS_CREATOR: HowStep[] = [
  {
    icon: 'create-outline',
    titleKey: 'blindDate.howItWorks.creatorSteps.step1Title',
    bodyKey: 'blindDate.howItWorks.creatorSteps.step1Body',
  },
  {
    icon: 'eye-off-outline',
    titleKey: 'blindDate.howItWorks.creatorSteps.step2Title',
    bodyKey: 'blindDate.howItWorks.creatorSteps.step2Body',
  },
  {
    icon: 'people-outline',
    titleKey: 'blindDate.howItWorks.creatorSteps.step3Title',
    bodyKey: 'blindDate.howItWorks.creatorSteps.step3Body',
  },
  {
    icon: 'heart-outline',
    titleKey: 'blindDate.howItWorks.creatorSteps.step4Title',
    bodyKey: 'blindDate.howItWorks.creatorSteps.step4Body',
  },
];

function HowItWorksModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { sheetBg, textPrimary, textMuted, purple, chipBg } = useBlindDateTheme();
  const insets = useSafeAreaInsets();
  const maxHeight = Dimensions.get('window').height - insets.top - insets.bottom - 40;
  const [role, setRole] = useState<'participant' | 'creator'>('participant');
  const steps = role === 'participant' ? HOW_STEPS_PARTICIPANT : HOW_STEPS_CREATOR;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View
          style={[styles.modalCard, { backgroundColor: sheetBg, marginBottom: insets.bottom + 24, maxHeight }]}
        >
          <View style={styles.modalHandle} />
          <TouchableOpacity
            style={[styles.sheetClose, { backgroundColor: chipBg }]}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('blindDate.common.close')}
          >
            <Ionicons name="close" size={16} color={textMuted} />
          </TouchableOpacity>
          <ScrollView
            style={{ flexShrink: 1 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
          {/* Gamified hero — gradient orb with sparkle accents */}
          <View style={styles.joinOrbWrap}>
            <Ionicons
              name="sparkles"
              size={18}
              color={bdColors.primary}
              style={[styles.joinSparkle, { top: 4, left: -6 }]}
            />
            <Ionicons
              name="sparkles"
              size={14}
              color="#FF4FA3"
              style={[styles.joinSparkle, { bottom: 6, right: -8 }]}
            />
            <LinearGradient colors={bdGradients.hero} style={styles.joinOrb}>
              <Ionicons name="heart-half" size={40} color="#FFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.joinTitle, { color: textPrimary }]}>{t('blindDate.howItWorks.title')}</Text>
          <Text style={[styles.joinSub, { color: textMuted }]}>
            {role === 'participant'
              ? t('blindDate.howItWorks.subParticipant')
              : t('blindDate.howItWorks.subCreator')}
          </Text>

          {/* Role toggle — Participant joins a session, Creator hosts one */}
          <View style={[styles.roleTabs, { backgroundColor: chipBg }]}>
            {(['participant', 'creator'] as const).map((r) => {
              const active = role === r;
              const label = r === 'participant'
                ? t('blindDate.howItWorks.participant')
                : t('blindDate.howItWorks.creator');
              const icon = r === 'participant' ? 'person-outline' : 'sparkles-outline';
              return (
                <TouchableOpacity
                  key={r}
                  style={styles.roleTab}
                  onPress={() => setRole(r)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t('blindDate.howItWorks.stepsA11y', { role: label })}
                >
                  {active ? (
                    <LinearGradient colors={bdGradients.hero} style={styles.roleTabInner}>
                      <Ionicons name={icon} size={13} color="#FFF" />
                      <Text style={styles.roleTabTextActive}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.roleTabInner}>
                      <Ionicons name={icon} size={13} color={textMuted} />
                      <Text style={[styles.roleTabText, { color: textMuted }]}>{label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.howStepsWrap}>
            {steps.map((step, i) => (
              <View key={step.titleKey} style={styles.stepRow}>
                <View style={styles.stepIconCol}>
                  <LinearGradient colors={bdGradients.hero} style={styles.stepNumCircle}>
                    <Ionicons name={step.icon} size={17} color="#FFF" />
                  </LinearGradient>
                  {i < steps.length - 1 && (
                    <View style={[styles.stepLine, { backgroundColor: `${purple}30` }]} />
                  )}
                </View>
                <View style={styles.stepTextCol}>
                  <Text style={[styles.stepTitle, { color: textPrimary }]}>
                    {i + 1}. {t(step.titleKey)}
                  </Text>
                  <Text style={[styles.stepBody, { color: textMuted }]}>{t(step.bodyKey)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.joinPrivacyRow, { backgroundColor: chipBg }]}>
            <Ionicons name="lock-closed" size={15} color={purple} />
            <Text style={[styles.joinPrivacyText, { color: purple }]}>
              {t('blindDate.howItWorks.privacy')}
            </Text>
          </View>

          <TouchableOpacity style={styles.joinCta} onPress={onClose} activeOpacity={0.85} accessibilityRole="button">
            <LinearGradient
              colors={bdGradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.joinCtaInner}
            >
              <Ionicons name="checkmark-circle" size={19} color="#FFF" />
              <Text style={styles.joinCtaText}>{t('blindDate.howItWorks.gotIt')}</Text>
            </LinearGradient>
          </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Join confirmation sheet ──────────────────────────────────────────────────

function JoinConfirmSheet({
  session,
  cost,
  joining,
  onConfirm,
  onCancel,
}: {
  session: BlindDateSessionSummaryDto | null;
  cost: number | null;
  joining: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { sheetBg, textPrimary, textMuted, purple, chipBg } = useBlindDateTheme();
  const insets = useSafeAreaInsets();
  if (!session) return null;

  // Only surface a cost pill when joining actually costs credits.
  const costLabel = cost != null && cost > 0 ? t('blindDate.common.credits', { count: cost }) : null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onCancel}>
        <View
          style={[styles.modalCard, { backgroundColor: sheetBg, marginBottom: insets.bottom + 24 }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.modalHandle} />

          {/* Gamified hero — gradient heart orb with sparkle accents */}
          <View style={styles.joinOrbWrap}>
            <Ionicons
              name="sparkles"
              size={18}
              color={bdColors.primary}
              style={[styles.joinSparkle, { top: 4, left: -6 }]}
            />
            <Ionicons
              name="sparkles"
              size={14}
              color="#FF4FA3"
              style={[styles.joinSparkle, { bottom: 6, right: -8 }]}
            />
            <LinearGradient colors={bdGradients.hero} style={styles.joinOrb}>
              <Ionicons name="heart" size={40} color="#FFF" />
            </LinearGradient>
          </View>

          <Text style={[styles.joinTitle, { color: textPrimary }]}>{t('blindDate.home.joinTitle')}</Text>
          <Text style={[styles.joinSub, { color: textMuted }]}>
            {t('blindDate.home.joinSub')}
          </Text>

          <View style={[styles.joinPrivacyRow, { backgroundColor: chipBg }]}>
            <Ionicons name="lock-closed" size={15} color={purple} />
            <Text style={[styles.joinPrivacyText, { color: purple }]}>
              {t('blindDate.home.joinPrivacy')}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.joinCta}
            onPress={onConfirm}
            disabled={joining}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={bdGradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.joinCtaInner}
            >
              {joining ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="heart" size={19} color="#FFF" />
                  <Text style={styles.joinCtaText}>{t('blindDate.home.joinNow')}</Text>
                  {costLabel && (
                    <View style={styles.costPill}>
                      <Ionicons name="diamond" size={12} color="#FFF" />
                      <Text style={styles.costPillText}>{costLabel}</Text>
                    </View>
                  )}
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            disabled={joining}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelBtnText, { color: textMuted }]}>{t('blindDate.common.notNow')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BlindDateHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bg, card, border, textPrimary, textMuted } = useBlindDateTheme();
  const { tab } = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab] = useState<HomeTab>((tab as HomeTab) ?? 'open');
  const [howVisible, setHowVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { configuration, refetch: refetchConfig } = useBlindDateConfiguration();
  // null while loading or on error — only a definitively `false` blocks the screen.
  const blindDateDisabled = configuration?.enabled === false;
  // An RN Modal renders above EVERYTHING — including screens pushed on top
  // (e.g. Settings opened from the gate). Only show it while this screen is
  // focused so it stays strictly a home-screen gate.
  const [screenFocused, setScreenFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      void refetchConfig();
      return () => setScreenFocused(false);
    }, [refetchConfig]),
  );
  const { entitlements, refreshEntitlements } = useEntitlements();
  const joinMutation = useJoinSession();


  const discover = useDiscoverSessions();
  const mySessions = useMyBlindDateSessions({ enabled: activeTab === 'mine' });
  const me = useCurrentProfile();
  const ownPhotoUrl = me.data?.primary_photo_url ?? null;
  const participations = useMyParticipations({ enabled: activeTab === 'participating' });

  // ── Card stack state ──────────────────────────────────────────────────────
  // Passed/joined sessions are hidden locally — passing is a UI-level action.
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(new Set());
  const [joinTarget, setJoinTarget] = useState<BlindDateSessionSummaryDto | null>(null);
  const [joining, setJoining] = useState(false);
  const topCardRef = useRef<SessionSwipeCardHandle>(null);

  const visibleSessions = useMemo(
    () => discover.items.filter((s) => !dismissedIds.has(s.id)),
    [discover.items, dismissedIds],
  );

  // Prefetch the next page before the stack runs dry. Also fires at an empty
  // stack so pagination continues while pages remain. The isFetchNextPageError
  // guard stops a failed fetch from re-firing every render (the deps here are
  // primitives, so this effect re-evaluates on every render otherwise).
  useEffect(() => {
    if (
      activeTab === 'open' &&
      visibleSessions.length <= 2 &&
      discover.hasNextPage &&
      !discover.isFetchingNextPage &&
      !discover.isFetchNextPageError
    ) {
      discover.fetchNextPage();
    }
  }, [
    activeTab,
    visibleSessions.length,
    discover.hasNextPage,
    discover.isFetchingNextPage,
    discover.isFetchNextPageError,
    discover.fetchNextPage,
  ]);

  const languageNameFor = useCallback(
    (code: string): string | null =>
      configuration?.supported_languages?.find((l) => l.code === code)?.name ?? null,
    [configuration],
  );

  const dismissSession = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Called by the card after its fly-off animation completes.
  const handleCardDismissed = useCallback(
    (direction: SessionSwipeDirection, session: BlindDateSessionSummaryDto) => {
      if (direction === 'left') {
        dismissSession(session.id);
      } else {
        // Right swipe = join intent → confirm before the paid action.
        setJoinTarget(session);
      }
    },
    [dismissSession],
  );

  const handleJoinCancel = useCallback(() => {
    setJoinTarget(null);
    topCardRef.current?.reset();
  }, []);

  // After a paid join, show the "You're in!" celebration screen first, then
  // let the participant flow continue from Round 1 intro.
  const openParticipantFlow = useCallback(
    (sessionId: string, participantId?: string, newJoin = false) => {
      router.push({
        pathname: '/(app)/blind-date-participant' as never,
        params: participantId
          ? { sessionId, participantId, ...(newJoin ? { joined: '1' } : {}) }
          : { sessionId },
      });
    },
    [router],
  );

  const handleJoinConfirm = useCallback(async () => {
    const session = joinTarget;
    if (!session) return;
    setJoining(true);
    try {
      const join = await joinMutation.mutateAsync({ sessionId: session.id });
      refreshEntitlements();
      dismissSession(session.id);
      setJoinTarget(null);
      openParticipantFlow(join.session_id, join.participant_id, true);
    } catch (err) {
      setJoinTarget(null);
      if (isInsufficientCreditsError(err)) {
        topCardRef.current?.reset();
        return;
      }
      const { code } = extractApiError(err);
      // Unjoinable sessions are removed from the stack; everything else restores.
      if (TERMINAL_JOIN_ERRORS.has(code.toLowerCase())) {
        dismissSession(session.id);
      } else {
        topCardRef.current?.reset();
      }
      // error.message mirrors the machine code — show the localized mapping.
      themedError(t('blindDate.home.joinErrorTitle'), blindDateErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }, [joinTarget, joinMutation, refreshEntitlements, dismissSession, openParticipantFlow, t]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const q = activeTab === 'open' ? discover : activeTab === 'mine' ? mySessions : participations;
    void q.refetch().finally(() => setRefreshing(false));
  }, [activeTab, discover, mySessions, participations]);

  // Refreshing an exhausted stack restores passed cards and refetches.
  const handleRefreshStack = useCallback(() => {
    setDismissedIds(new Set());
    void discover.refetch();
  }, [discover]);

  const handleCreate = useCallback(() => {
    if (mySessions.activeSession) {
      themedAlert({
        title: t('blindDate.home.activeSessionTitle'),
        message: t('blindDate.home.activeSessionMessage'),
        icon: 'information-circle-outline',
        iconColor: colors.primary,
      });
      return;
    }
    router.push('/(app)/blind-date-create' as never);
  }, [mySessions.activeSession, router, t]);

  // Disabled gate: leaving is the only way out besides opening Settings.
  const handleGateBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(app)/(tabs)/profile' as never);
    }
  }, [router]);

  // ── List rows for the My Own tab ─────────────────────────────────────────
  // `/sessions/mine` returns joined sessions too — this tab is "blind dates
  // I created" only; joined sessions live in the Participating tab.
  const hostedSessions = useMemo(
    () => mySessions.items.filter((s) => s.role !== 'PARTICIPANT'),
    [mySessions.items],
  );

  // A fetched page can contain only PARTICIPANT rows, so the hosted filter can
  // yield nothing while unfetched pages still hold created sessions. Keep
  // pulling pages until hosted rows appear or pages run out — onEndReached
  // alone can't be trusted here because a still-empty list may not refire it.
  useEffect(() => {
    if (
      activeTab === 'mine' &&
      hostedSessions.length === 0 &&
      mySessions.hasNextPage &&
      !mySessions.isFetchingNextPage &&
      !mySessions.isFetchNextPageError
    ) {
      mySessions.fetchNextPage();
    }
  }, [
    activeTab,
    hostedSessions.length,
    mySessions.hasNextPage,
    mySessions.isFetchingNextPage,
    mySessions.isFetchNextPageError,
    mySessions.fetchNextPage,
  ]);

  const rows = useMemo<Row[]>(() => {
    if (hostedSessions.length === 0) {
      // Still pulling pages for hosted sessions (or about to) — not "empty".
      if (
        mySessions.isLoading ||
        mySessions.isFetchingNextPage ||
        (mySessions.hasNextPage && !mySessions.isFetchNextPageError)
      ) {
        return [{ kind: 'loading' }];
      }
      if (mySessions.isError) return [{ kind: 'error', onRetry: mySessions.refetch }];
      return [{ kind: 'empty' }];
    }
    return hostedSessions.map((s): Row => ({ kind: 'mySession', session: s }));
  }, [
    hostedSessions,
    mySessions.isLoading,
    mySessions.isError,
    mySessions.isFetchingNextPage,
    mySessions.hasNextPage,
    mySessions.isFetchNextPageError,
    mySessions.refetch,
  ]);

  const renderRow = useCallback(({ item }: { item: Row }) => {
    switch (item.kind) {
      case 'loading':
        return (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        );
      case 'error':
        return <ErrorState onRetry={item.onRetry} />;
      case 'empty':
        return (
          <EmptyState
            tab="mine"
            onPrimary={handleCreate}
            onRefresh={handleRefresh}
          />
        );
      case 'mySession':
        return (
          <MySessionCard
            session={item.session}
            ownPhotoUrl={ownPhotoUrl}
            onPress={() => {
              const s = item.session;
              // `/sessions/mine` returns both created and joined rows —
              // only creators can open the manage/review screen (it calls
              // the creator-only roster endpoint). Manage is only useful
              // while there's something to *do*: OPEN (review/advance
              // rounds) or REVEAL (submit the final decision). Every other
              // terminal status (COMPLETED, CLOSED, CANCELLED, EXPIRED)
              // opens the dedicated results/summary screen instead.
              if (s.role === 'PARTICIPANT') {
                openParticipantFlow(s.id, s.participant_id ?? undefined);
              } else if (s.status === 'OPEN' || s.status === 'REVEAL') {
                router.push({
                  pathname: '/(app)/blind-date-manage' as never,
                  params: { sessionId: s.id },
                });
              } else {
                router.push({
                  pathname: '/(app)/blind-date-results' as never,
                  params: { sessionId: s.id },
                });
              }
            }}
          />
        );
      default:
        return null;
    }
  }, [handleCreate, handleRefresh, router, openParticipantFlow, ownPhotoUrl]);

  const keyExtractor = useCallback((item: Row, index: number) => {
    switch (item.kind) {
      case 'mySession': return `m-${item.session.id}`;
      default: return `row-${item.kind}-${index}`;
    }
  }, []);

  const handleEndReached = useCallback(() => {
    if (mySessions.hasNextPage && !mySessions.isFetchingNextPage) mySessions.fetchNextPage();
  }, [mySessions]);

  const joinCost = getCostForAction('BLIND_DATE_PARTICIPATE', entitlements);
  const joinCostLabel =
    joinCost === null || joinCost === 0 ? '' : t('blindDate.common.credits', { count: joinCost });
  const listBottomPad = 16;

  /** The top-most visible session — drives the external Pass/Join buttons. */
  const topSession = visibleSessions[0] ?? null;

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8 }}>
        <Header
          title={
            activeTab === 'mine'
              ? t('blindDate.home.titleMine')
              : activeTab === 'participating'
                ? t('blindDate.home.titleJoined')
                : t('blindDate.common.blindDate')
          }
          onHelp={() => setHowVisible(true)}
          onProfile={() => router.push('/(app)/(tabs)/profile' as never)}
        />
      </View>

      {/* ── Discover: swipe card stack ────────────────────────────────────── */}
      {activeTab === 'open' && (
        <View style={styles.openContent}>
          {/* Card stack */}
          <View style={[styles.stackArea, { width: CONTENT_W }]}>
            {discover.isLoading && discover.items.length === 0 ? (
              <CardSkeleton />
            ) : discover.isError && discover.items.length === 0 ? (
              <ErrorState onRetry={discover.refetch} />
            ) : visibleSessions.length === 0 &&
              (discover.isFetchingNextPage ||
                (discover.hasNextPage && !discover.isFetchNextPageError)) ? (
              // Stack ran dry but more pages exist — the prefetch effect is
              // firing (or in flight); show the skeleton, not the empty state.
              <CardSkeleton />
            ) : visibleSessions.length === 0 ? (
              <EmptyState tab="open" onPrimary={handleCreate} onRefresh={handleRefreshStack} />
            ) : (
              visibleSessions
                .slice(0, 3)
                .map((session, idx) => ({ session, depth: idx }))
                .reverse()
                .map(({ session, depth }) => {
                  const isTop = depth === 0;
                  return (
                    <View
                      key={session.id}
                      style={[styles.stackCardWrap, { zIndex: 10 - depth }]}
                      pointerEvents={isTop ? 'auto' : 'none'}
                    >
                      <SessionSwipeCard
                        ref={isTop ? topCardRef : null}
                        session={session}
                        isTop={isTop}
                        depth={depth}
                        languageName={languageNameFor(session.language_code)}
                        viewerCountry={me.data?.address?.country_name ?? null}
                        onDismiss={handleCardDismissed}
                      />
                    </View>
                  );
                })
            )}
          </View>

          {/* External Pass / Join buttons — shown only when there are cards */}
          {topSession && (
            <View style={styles.externalActions}>
              {/* Pass button */}
              <View style={styles.externalActionCol}>
                <TouchableOpacity
                  style={styles.passBtn}
                  onPress={() => topCardRef.current?.swipeOut('left')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('blindDate.home.passA11y')}
                >
                  <Ionicons name="close" size={30} color={bdColors.primary} />
                </TouchableOpacity>
                <Text style={[styles.externalActionLabel, { color: textMuted }]}>{t('blindDate.home.pass')}</Text>
              </View>

              {/* Join button */}
              <View style={styles.externalActionCol}>
                <TouchableOpacity
                  style={styles.extJoinBtn}
                  onPress={() => topCardRef.current?.swipeOut('right')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('blindDate.home.joinA11y')}
                >
                  <Ionicons name="heart" size={30} color="#FFF" />
                </TouchableOpacity>
                {joinCostLabel ? (
                  <Text style={[styles.externalActionLabel, { color: textMuted }]}>
                    {joinCostLabel}
                  </Text>
                ) : (
                  <Text style={[styles.externalActionLabel, { color: textMuted }]}>{t('blindDate.home.join')}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── My Own: sessions list ────────────────────────────────────────── */}
      {activeTab === 'mine' && (
        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          renderItem={renderRow}
          ListHeaderComponent={
            <MineToolsRow
              onCreate={handleCreate}
              onManageQuestions={() => router.push('/(app)/blind-date-questions' as never)}
            />
          }
          ListFooterComponent={
            mySessions.isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad, width: CONTENT_W, alignSelf: 'center' }]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {/* ── Joined: progress dashboard ────────────────────────────────────── */}
      {activeTab === 'participating' && (
        <JoinedBlindDatesView
          items={participations.items}
          isLoading={participations.isLoading}
          isError={participations.isError}
          hasNextPage={!!participations.hasNextPage}
          isFetchingNextPage={participations.isFetchingNextPage}
          fetchNextPage={() => participations.fetchNextPage()}
          refetch={participations.refetch}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          languageNameFor={languageNameFor}
          onOpen={(item) => openParticipantFlow(item.session_id, item.participant_id)}
          onExplore={() => setActiveTab('open')}
        />
      )}

      {/* ── Blind Date bottom navigation ──────────────────────────────────── */}
      <BlindDateBottomNav
        activeTab={activeTab}
        onHome={() => router.replace('/(app)/(tabs)' as never)}
        onExplore={() => setActiveTab('open')}
        onMine={() => setActiveTab('mine')}
        onJoined={() => setActiveTab('participating')}
        onMatches={() => router.push('/(app)/(tabs)/matches' as never)}
      />

      <HowItWorksModal visible={howVisible} onClose={() => setHowVisible(false)} />
      <JoinConfirmSheet
        session={joinTarget}
        cost={joinCost}
        joining={joining}
        onConfirm={handleJoinConfirm}
        onCancel={handleJoinCancel}
      />

      {/* ── Disabled gate — covers everything until Blind Date is re-enabled ── */}
      <Modal
        visible={blindDateDisabled && screenFocused}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={handleGateBack}
      >
        <View style={styles.gateBackdrop}>
          <View style={[styles.gateCard, { backgroundColor: card, borderColor: border }]}>
            <LinearGradient colors={bdGradients.hero} style={styles.gateOrb}>
              <Ionicons name="eye-off-outline" size={34} color="#FFF" />
            </LinearGradient>
            <Text style={[styles.gateTitle, { color: textPrimary }]}>
              {t('blindDate.home.gateTitle')}
            </Text>
            <Text style={[styles.gateSub, { color: textMuted }]}>
              {t('blindDate.home.gateSub')}
            </Text>
            <TouchableOpacity
              style={styles.gatePrimary}
              onPress={() => router.push('/(app)/settings' as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('blindDate.home.openSettings')}
            >
              <LinearGradient
                colors={bdGradients.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gatePrimaryInner}
              >
                <Ionicons name="settings-outline" size={18} color="#FFF" />
                <Text style={styles.gatePrimaryText}>{t('blindDate.home.openSettings')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gateGhost}
              onPress={handleGateBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('blindDate.common.goBack')}
            >
              <Text style={[styles.gateGhostText, { color: textMuted }]}>{t('blindDate.common.goBack')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  headerWrap: {
    paddingHorizontal: OUTER_PAD,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    ...Platform.select({
      ios:     { shadowColor: bdColors.primary, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  headerIconBtnInner: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtn: {
    height: 36,
    borderRadius: 18,
    ...Platform.select({
      ios:     { shadowColor: bdColors.primary, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
      default: {},
    }),
  },
  headerBtnInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  headerBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  headerIcon: {
    width: 34,
    height: 34,
  },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.4 },
  headerSub: { fontSize: 12.5, fontWeight: '500', letterSpacing: 0.1 },

  // Discover tab: card stack + external actions
  openContent: { flex: 1, paddingTop: 8, paddingBottom: 0 },
  stackArea: {
    flex: 1,
    alignSelf: 'center',
    position: 'relative',
    justifyContent: 'center',
  },
  stackCardWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  // External Pass / Join action buttons (below the card)
  externalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 56,
    paddingVertical: 18,
  },
  externalActionCol: { alignItems: 'center', gap: 6 },
  externalActionLabel: { fontSize: 11, fontWeight: '700' },
  passBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: bdColors.primary,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 4 },
    }),
  },
  extJoinBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bdColors.primary,
    ...Platform.select({
      ios: { shadowColor: bdColors.primary, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 8 },
    }),
  },

  // Skeleton
  skeletonCard: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: '#241A3F',
    overflow: 'hidden',
    padding: 18,
  },
  skelBadgeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  skelPill: { width: 74, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)' },
  skelCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skelCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.10)' },
  skelBottom: { gap: 8 },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.14)' },
  skelChipRow: { flexDirection: 'row', gap: 6 },
  skelChip: { width: 84, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)' },
  skelButton: { height: 42, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', marginTop: 4 },

  // List cards (mine / participating)
  listContent: { paddingHorizontal: OUTER_PAD, paddingTop: 14 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  loadingWrap: { paddingVertical: 60, alignItems: 'center' },

  // My-session card — reference layout (thumb left, body right)
  myCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 12,
    gap: 12,
  },
  myCardEnded: { opacity: 0.78 },
  myThumb: {
    width: 88,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 108,
  },
  myThumbHeart: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myBody: { flex: 1, paddingVertical: 2 },
  myTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  myTitle: { flex: 1, fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2, lineHeight: 20 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10.5, fontWeight: '800' },
  myMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, flexWrap: 'wrap' },
  myMetaText: { fontSize: 11.5, fontWeight: '600' },
  myBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  roundBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  roundKicker: { fontSize: 10, fontWeight: '600' },
  roundValue: { fontSize: 13, fontWeight: '800', marginTop: 1 },
  myCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  myCtaFilled: { backgroundColor: bdColors.primary },
  myCtaOutline: { borderWidth: 1.5, backgroundColor: 'transparent' },
  myCtaText: { fontSize: 12.5, fontWeight: '800' },

  // Empty / error
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 48,
    gap: 12,
  },
  // Open-tab empty state — artwork floats over a violet wash, copy anchors bottom.
  emptyWrapArt: {
    flex: 1,
    alignSelf: 'stretch',
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  emptyArtWrap: {
    position: 'absolute',
    top: '6%',
    left: '4%',
    right: '4%',
    bottom: '32%',
  },
  emptyArtCopy: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 30,
    paddingBottom: 52,
    marginTop: 'auto',
  },
  emptyEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: bdColors.primary,
  },
  emptyBtnRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    alignSelf: 'stretch',
  },
  emptyBtnArt: {
    flex: 1.6,
    borderRadius: 26,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: bdColors.primary, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 7 },
    }),
  },
  emptyBtnArtInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 1.5,
  },
  emptyBtnSecondaryText: { fontSize: 13, fontWeight: '700' },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 19, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: colors.primary,
  },
  emptyBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  errorTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },

  // ── Hosted empty state ────────────────────────────────────────────────────
  // Rendered as a renderItem row (not ListEmptyComponent) — use a concrete
  // height that accounts for MineToolsRow (~54px) + list padding (~14px)
  // above and bottom nav (~94px) below, leaving the rest for this panel.
  hostedEmpty: {
    height: SCREEN_H * 0.60,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
  },
  // Artwork fills the upper ~62% of the panel
  hostedArtWrap: {
    position: 'absolute',
    top: '1%',
    left: '4%',
    right: '4%',
    bottom: '38%',
  },
  // Bottom copy block
  hostedCopy: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 22,
    alignItems: 'center',
    gap: 6,
  },
  hostedEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: '#FF79C0',
  },
  hostedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  hostedSub: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.62)',
    textAlign: 'center',
    lineHeight: 18,
  },
  hostedBtn: {
    marginTop: 4,
    borderRadius: 26,
    overflow: 'hidden',
    width: '100%',
    ...Platform.select({
      ios: { shadowColor: '#FF4FA3', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } },
      android: { elevation: 7 },
    }),
  },
  hostedBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
  },
  hostedBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Modals / sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,5,20,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginHorizontal: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,170,0.4)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  howStepsWrap: { marginTop: 20 },
  roleTabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 20,
    padding: 3,
    marginTop: 16,
    gap: 4,
  },
  roleTab: { borderRadius: 17, overflow: 'hidden' },
  roleTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  roleTabText: { fontSize: 13, fontWeight: '700' },
  roleTabTextActive: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  stepRow: { flexDirection: 'row', gap: 14 },
  stepIconCol: { width: 40, alignItems: 'center' },
  stepNumCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: bdColors.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 5 },
    }),
  },
  stepLine: { width: 2, flex: 1, borderRadius: 1, marginVertical: 4 },
  stepTextCol: { flex: 1, paddingBottom: 18 },
  stepTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  stepBody: { fontSize: 13.5, lineHeight: 20, marginTop: 3 },

  // Join confirm — gamified hero
  joinOrbWrap: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  joinOrb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: bdColors.primary, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 10 },
    }),
  },
  joinSparkle: { position: 'absolute' },
  joinTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  joinSub: {
    fontSize: 14.5,
    fontWeight: '500',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  joinPrivacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  joinPrivacyText: { flex: 1, fontSize: 12.5, fontWeight: '600', lineHeight: 17 },
  joinCta: {
    borderRadius: 28,
    overflow: 'hidden',
    marginTop: 18,
    ...Platform.select({
      ios: { shadowColor: bdColors.primary, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 7 },
    }),
  },
  joinCtaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  joinCtaText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  costPillText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelBtnText: { fontSize: 14, fontWeight: '700' },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,5,20,0.55)',
    justifyContent: 'flex-end',
  },
  sheetClose: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  sheetAvoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '88%',
  },
  sheetHead: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
  sheetHeadText: { flex: 1 },
  sheetAvatar: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 6 },
  sheetAnon: { fontSize: 11.5, marginTop: 3 },
  sheetMetaBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  sheetMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetMetaText: { fontSize: 12.5, fontWeight: '600' },
  sheetDesc: { fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginTop: 12 },
  questionsHeading: { fontSize: 14, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  questionList: { gap: 8 },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  questionNum: { fontSize: 13, fontWeight: '800' },
  questionText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
  },


  answersBox: { marginTop: 14 },
  answerBlock: { marginBottom: 12 },
  answerQ: { fontSize: 13.5, fontWeight: '700', marginBottom: 6, lineHeight: 19 },
  answerInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    minHeight: 56,
    textAlignVertical: 'top',
  },

  decisionBox: { marginTop: 16 },
  decisionTitle: { fontSize: 16, fontWeight: '800' },
  decisionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  decisionBtn: {
    flex: 1,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5 },
  decisionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

  // My Own tools row
  mineTools: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  mineToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  mineToolOutline: { borderWidth: 1.5 },
  mineToolTextPrimary: { color: '#FFF', fontSize: 14.5, fontWeight: '800' },
  mineToolText: { fontSize: 14.5, fontWeight: '700' },

  // Create session sheet
  createSheet: { maxHeight: '88%' },
  withdrawLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  withdrawLinkText: { fontSize: 12.5, fontWeight: '700' },
  createHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  countChip: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3 },
  countChipText: { fontSize: 12, fontWeight: '800' },
  expiryRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 2 },
  expiryChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  expiryChipText: { fontSize: 12, fontWeight: '700' },
  createEmpty: { alignItems: 'center', gap: 12, paddingVertical: 26 },
  pickList: { marginTop: 8 },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  pickRowMain: { flex: 1 },
  pickQ: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  pickA: { fontSize: 12, marginTop: 2 },
  pickManage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
  },

  // Disabled gate
  gateBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,6,24,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  gateCard: {
    width: '100%',
    maxWidth: IS_TABLET ? 520 : 380,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 32,
    alignItems: 'center',
  },
  gateOrb: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    ...Platform.select({
      ios: { shadowColor: bdColors.primary, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
    }),
  },
  gateTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  gateSub: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  gatePrimary: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  gatePrimaryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  gatePrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  gateGhost: { paddingVertical: 12, marginTop: 4 },
  gateGhostText: { fontSize: 15, fontWeight: '600' },
});
