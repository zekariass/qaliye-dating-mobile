import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createBlindDateSession } from '@/api/blindDate/blindDateApi';
import BlindDateBottomNav from '@/components/blind-date/BlindDateBottomNav';
import { CelebrationOverlay } from '@/components/blind-date/CelebrationOverlay';
import { FlowBackdrop } from '@/components/blind-date/FlowBackdrop';
import { QuestionSetPicker } from '@/components/blind-date/QuestionSetPicker';
import { themedAlert } from '@/components/common/ThemedAlert';
import { bdColors, bdGradients } from '@/constants/blindDateTheme';
import { colors } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useBlindDateConfiguration } from '@/hooks/blindDate/useBlindDateConfiguration';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';
import i18n from '@/i18n';
import type { BlindDateSessionDto } from '@/types/blindDate';
import { extractApiError } from '@/utils/apiError';
import { blindDateErrorCode, blindDateErrorMessage } from '@/utils/blindDateErrors';
import { isInsufficientCreditsError } from '@/utils/entitlements';
import { generateUUID } from '@/utils/uuid';

// ─── Steps ────────────────────────────────────────────────────────────────────

type Step = 'config' | 'questions' | 'success';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function friendlyCreateError(err: unknown, maxRoundQuestions?: number): string {
  const { code } = extractApiError(err);
  switch (code.toLowerCase()) {
    case 'active_session_exists':
      return i18n.t('blindDate.create.errors.activeSessionExists');
    case 'invalid_question_count':
      return maxRoundQuestions != null
        ? i18n.t('blindDate.create.errors.invalidQuestionCount', { max: maxRoundQuestions })
        : i18n.t('blindDate.create.errors.invalidQuestionCountNoMax');
    case 'question_unanswered':
      return i18n.t('blindDate.create.errors.questionUnanswered');
    case 'unsupported_language':
      return i18n.t('blindDate.create.errors.unsupportedLanguage');
    default:
      // error.message mirrors the machine code — use the localized mapping.
      return blindDateErrorMessage(err);
  }
}

// ─── Expiry helpers ───────────────────────────────────────────────────────────

type ExpiryMode = 'none' | '3d' | '7d' | 'custom';

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const;

function shortMonthName(monthIdx: number): string {
  return i18n.t(`blindDate.create.months.${MONTH_KEYS[monthIdx]}`);
}

/** Expiry means "open until the end of this day" (local time). */
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return endOfDay(d).toISOString();
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${shortMonthName(d.getMonth())} ${d.getFullYear()}`;
}

function isFutureDate(d: Date): boolean {
  return d.getTime() > Date.now();
}

// ─── Expiry date picker (wheel style, matches DatePickerField pattern) ────────

const WHEEL_ITEM_H = 40;
const WHEEL_VISIBLE = 5;
const WHEEL_PAD = (WHEEL_ITEM_H * (WHEEL_VISIBLE - 1)) / 2;

function WheelColumn({
  items,
  selectedIndex,
  onChange,
  textColor,
  mutedColor,
}: {
  items: string[];
  selectedIndex: number;
  onChange: (i: number) => void;
  textColor: string;
  mutedColor: string;
}) {
  const ref = useRef<ScrollView>(null);

  const scrollToIndex = (i: number, animated = true) =>
    ref.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated });

  useEffect(() => {
    const t = setTimeout(() => scrollToIndex(selectedIndex, false), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial scroll position only
  }, []);

  const indexAt = (offsetY: number) =>
    Math.min(Math.max(0, Math.round(offsetY / WHEEL_ITEM_H)), items.length - 1);

  // Live selection while dragging — onMomentumScrollEnd alone misses slow
  // drags that stop without momentum, which left the wheel looking stuck.
  const handleScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const idx = indexAt(e.nativeEvent.contentOffset.y);
    if (idx !== selectedIndex) onChange(idx);
  };

  // Gently align to the nearest item once the gesture ends.
  const snapToNearest = (e: { nativeEvent: { contentOffset: { y: number } } }) =>
    scrollToIndex(indexAt(e.nativeEvent.contentOffset.y));

  return (
    <ScrollView
      ref={ref}
      style={styles.wheelColumn}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={snapToNearest}
      onScrollEndDrag={(e) => {
        const v = e.nativeEvent.velocity;
        if (!v || Math.abs(v.y) < 0.05) snapToNearest(e);
      }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: WHEEL_PAD }}
    >
      {items.map((label, i) => (
        <Pressable
          key={`${label}-${i}`}
          style={styles.wheelItem}
          onPress={() => { onChange(i); scrollToIndex(i); }}
        >
          <Text
            style={[
              styles.wheelItemText,
              { color: i === selectedIndex ? textColor : mutedColor },
              i === selectedIndex && styles.wheelItemTextSelected,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ExpiryPickerModal({
  initialISO,
  onClose,
  onConfirm,
}: {
  initialISO: string | null;
  onClose: () => void;
  onConfirm: (iso: string) => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() + 1];
  const fallback = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const initial = initialISO ? new Date(initialISO) : fallback;

  const [day, setDay] = useState(initial.getDate());
  const [month, setMonth] = useState(initial.getMonth());
  const [yearIdx, setYearIdx] = useState(Math.max(0, years.indexOf(initial.getFullYear())));
  const [error, setError] = useState<string | null>(null);

  const daysInMonth = new Date(years[yearIdx], month + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);
  const dayItems = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  const confirm = () => {
    const picked = endOfDay(new Date(years[yearIdx], month, clampedDay));
    if (!isFutureDate(picked)) {
      setError(t('blindDate.create.picker.futureDateError'));
      return;
    }
    onConfirm(picked.toISOString());
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerOverlay} onPress={onClose}>
        <Pressable
          style={[styles.pickerCard, { backgroundColor: th.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.pickerHeader}>
            <View style={[styles.pickerIconWrap, { backgroundColor: `${bdColors.primary}1A` }]}>
              <Ionicons name="calendar" size={20} color={bdColors.primary} />
            </View>
            <Text style={[styles.pickerTitle, { color: th.text }]}>{t('blindDate.create.picker.title')}</Text>
            <Text style={[styles.pickerSubtitle, { color: th.textSecondary }]}>
              {t('blindDate.create.picker.subtitle')}
            </Text>
          </View>

          <View style={[styles.pickerBody, { backgroundColor: isDark ? '#241A3E' : '#F7EEFF' }]}>
            <View
              style={[
                styles.pickerBand,
                { borderTopColor: th.border, borderBottomColor: th.border },
              ]}
            />
            <View style={styles.pickerRow}>
              <WheelColumn
                key={daysInMonth}
                items={dayItems}
                selectedIndex={clampedDay - 1}
                onChange={(i) => { setDay(i + 1); setError(null); }}
                textColor={bdColors.primary}
                mutedColor={th.textSecondary}
              />
              <WheelColumn
                items={MONTH_KEYS.map((_, i) => shortMonthName(i))}
                selectedIndex={month}
                onChange={(i) => { setMonth(i); setError(null); }}
                textColor={bdColors.primary}
                mutedColor={th.textSecondary}
              />
              <WheelColumn
                items={years.map(String)}
                selectedIndex={yearIdx}
                onChange={(i) => { setYearIdx(i); setError(null); }}
                textColor={bdColors.primary}
                mutedColor={th.textSecondary}
              />
            </View>
          </View>

          {error && <Text style={[styles.pickerError, { color: '#EF4444' }]}>{error}</Text>}

          <View style={styles.pickerActions}>
            <TouchableOpacity
              style={[styles.pickerBtn, { borderColor: th.border }]}
              onPress={onClose}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={[styles.pickerBtnText, { color: th.text }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pickerBtn, styles.pickerBtnPrimary]}
              onPress={confirm}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Text style={[styles.pickerBtnText, { color: '#FFFFFF' }]}>{t('blindDate.create.picker.setDate')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function ConfigStep({
  language,
  onLanguageChange,
  languages,
  expiresAt,
  onExpiresChange,
  onNext,
  loading,
}: {
  language: string;
  onLanguageChange: (l: string) => void;
  languages: { code: string; name: string }[];
  expiresAt: string | null;
  onExpiresChange: (v: string | null) => void;
  onNext: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [langOpen, setLangOpen] = useState(false);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>(expiresAt === null ? 'none' : 'custom');
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectExpiry = (m: ExpiryMode) => {
    if (m === 'custom') {
      setPickerOpen(true);
      return;
    }
    setExpiryMode(m);
    onExpiresChange(m === 'none' ? null : addDaysISO(m === '3d' ? 3 : 7));
  };

  return (
    <>
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      {/* Hero card */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.heroCard}>
        <LinearGradient
          colors={['#6D35FF', '#8A2CFF', '#C044FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroIconWrap}>
          <Ionicons name="heart" size={24} color="#FFF" />
        </View>
        <Text style={styles.heroTitle}>{t('blindDate.create.heroTitle')}</Text>
      </Animated.View>

      {/* Language */}
      <Animated.View entering={FadeInDown.duration(400).delay(80)}>
        <Text style={[styles.sectionLabel, { color: th.textSecondary }]}>{t('blindDate.create.languageLabel')}</Text>
        <TouchableOpacity
          style={[styles.selectRow, { borderColor: th.border, backgroundColor: th.surface }]}
          onPress={() => setLangOpen((v) => !v)}
          activeOpacity={0.75}
          accessibilityRole="button"
        >
          <View style={[styles.selectIconWrap, { backgroundColor: `${bdColors.primary}18` }]}>
            <Ionicons name="globe-outline" size={16} color={bdColors.primary} />
          </View>
          <Text style={[styles.selectRowText, { color: th.text }]}>
            {languages.find((l) => l.code === language)?.name ?? language}
          </Text>
          <Ionicons name={langOpen ? 'chevron-up' : 'chevron-down'} size={16} color={th.textSecondary} />
        </TouchableOpacity>
        {langOpen && (
          <View style={[styles.selectMenu, { backgroundColor: th.surface, borderColor: th.border }]}>
            {languages.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.selectOption, l.code === language && { backgroundColor: `${bdColors.primary}14` }]}
                onPress={() => { onLanguageChange(l.code); setLangOpen(false); }}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Text style={[styles.selectOptionText, { color: l.code === language ? bdColors.primary : th.text }]}>
                  {l.name}
                </Text>
                {l.code === language && <Ionicons name="checkmark" size={14} color={bdColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Expiry */}
      <Animated.View entering={FadeInDown.duration(400).delay(140)}>
        <Text style={[styles.sectionLabel, { color: th.textSecondary }]}>{t('blindDate.create.expiryLabel')}</Text>
        <View style={styles.expiryGrid}>
          {(
            [
              { m: 'none', label: t('blindDate.create.expiry.none'), sub: t('blindDate.create.expiry.noneSub'), icon: 'infinite-outline' },
              { m: '3d', label: t('blindDate.create.expiry.days3'), sub: t('blindDate.create.expiry.autoClose'), icon: 'time-outline' },
              { m: '7d', label: t('blindDate.create.expiry.days7'), sub: t('blindDate.create.expiry.autoClose'), icon: 'time-outline' },
              {
                m: 'custom',
                label: expiryMode === 'custom' && expiresAt ? formatExpiry(expiresAt) : t('blindDate.create.expiry.pickDate'),
                sub: t('blindDate.create.expiry.customSub'),
                icon: 'calendar-outline',
              },
            ] as const
          ).map((o) => {
            const active = expiryMode === o.m;
            return (
              <TouchableOpacity
                key={o.m}
                style={[
                  styles.expiryCard,
                  {
                    borderColor: active ? bdColors.primary : th.border,
                    backgroundColor: active ? `${bdColors.primary}10` : th.surface,
                  },
                ]}
                onPress={() => selectExpiry(o.m)}
                activeOpacity={0.75}
                accessibilityRole="button"
              >
                <View style={[styles.expiryIconWrap, { backgroundColor: active ? `${bdColors.primary}1E` : (isDark ? th.backgroundElement : '#F4F0FA') }]}>
                  <Ionicons
                    name={o.icon}
                    size={18}
                    color={active ? bdColors.primary : th.textSecondary}
                  />
                </View>
                <Text style={[styles.expiryCardLabel, { color: active ? bdColors.primary : th.text }]}>
                  {o.label}
                </Text>
                <Text style={[styles.expiryCardSub, { color: th.textSecondary }]}>
                  {o.sub}
                </Text>
                {active && (
                  <View style={styles.expiryCheck}>
                    <Ionicons name="checkmark-circle" size={14} color={bdColors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {expiryMode !== 'none' && expiresAt && (
          <Text style={[styles.hintText, { color: th.textSecondary }]}>
            {t('blindDate.create.expiry.autoClosesAt', { date: formatExpiry(expiresAt) })}
          </Text>
        )}
        {expiryMode === 'none' && (
          <Text style={[styles.hintText, { color: th.textSecondary }]}>
            {t('blindDate.create.expiry.staysOpen')}
          </Text>
        )}
      </Animated.View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.duration(400).delay(260)}>
        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          onPress={onNext}
          disabled={loading}
          activeOpacity={0.88}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#6D35FF', '#8A2CFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.primaryBtnText}>{t('blindDate.create.chooseQuestions')}</Text>
          <Ionicons name="arrow-forward" size={17} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
    {pickerOpen && (
      <ExpiryPickerModal
        initialISO={expiryMode === 'custom' ? expiresAt : null}
        onClose={() => setPickerOpen(false)}
        onConfirm={(iso) => {
          setExpiryMode('custom');
          onExpiresChange(iso);
        }}
      />
    )}
    </>
  );
}

function QuestionsStep({
  pickedQ,
  pickedC,
  maxQuestions,
  onToggleQ,
  onToggleC,
  onBack,
  onPublish,
  publishing,
  error,
}: {
  pickedQ: Set<string>;
  pickedC: Set<string>;
  /** Per-round cap from `limits.max_round_questions`; undefined = no client cap. */
  maxQuestions?: number;
  onToggleQ: (id: string) => void;
  onToggleC: (id: string) => void;
  onBack: () => void;
  onPublish: () => void;
  publishing: boolean;
  error: string | null;
}) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pickedCount = pickedQ.size + pickedC.size;
  const canPublish = pickedCount >= 1 && (maxQuestions == null || pickedCount <= maxQuestions);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.questionHeader, { borderBottomColor: th.border }]}>
        <View style={{ flex: 1 }}>
          <View style={styles.questionStepBadgeRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{t('blindDate.create.step2Badge')}</Text>
            </View>
            <Text style={[styles.questionHeaderTitle, { color: th.text }]}>{t('blindDate.create.round1Questions')}</Text>
          </View>
          <Text style={[styles.questionHeaderSub, { color: th.textSecondary }]}>
            {t('blindDate.create.questionsSub')}
          </Text>
        </View>
        <View style={[styles.questionCountPill, { backgroundColor: `${bdColors.primary}14` }]}>
          <Text style={[styles.questionCountText, { color: bdColors.primary }]}>
            {pickedCount}
          </Text>
        </View>
      </View>

      <View style={styles.pickerWrap}>
        <QuestionSetPicker
          pickedQ={pickedQ}
          pickedC={pickedC}
          pickedCount={pickedCount}
          maxQuestions={maxQuestions}
          onToggleQ={onToggleQ}
          onToggleC={onToggleC}
          onManageQuestions={() => router.push('/(app)/blind-date-questions' as never)}
        />
      </View>

      <View
        style={[
          styles.publishFooter,
          { borderTopColor: th.border, paddingBottom: insets.bottom + 12 },
        ]}
      >
        {error && (
          <Text style={[styles.publishError, { color: colors.danger }]}>{error}</Text>
        )}
        <View style={styles.publishBtnRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: th.border }]}
            onPress={onBack}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={15} color={th.textSecondary} />
            <Text style={[styles.secondaryBtnText, { color: th.textSecondary }]}>{t('blindDate.common.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.publishBtn, (!canPublish || publishing) && { opacity: 0.5 }]}
            onPress={onPublish}
            disabled={!canPublish || publishing}
            activeOpacity={0.88}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={['#6D35FF', '#8A2CFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            {publishing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="heart" size={16} color="#FFF" />
                <Text style={styles.primaryBtnText}>
                  {canPublish
                    ? t('blindDate.create.publishCount', { count: pickedCount })
                    : t('blindDate.create.publish')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function SuccessStep({ session, questionCount, maxParticipants, onManage, onHome }: {
  session: BlindDateSessionDto;
  questionCount: number;
  maxParticipants: number | null;
  onManage: () => void;
  onHome: () => void;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const insets = useSafeAreaInsets();
  const { data: myProfile } = useCurrentProfile();
  const artwork =
    (myProfile?.gender as 'MALE' | 'FEMALE' | null) === 'MALE'
      ? require('@/assets/images/blind-date-girl-unknown.png')
      : require('@/assets/images/blind-date-man-unknown.png');

  const nextSteps = [
    {
      icon: 'people-outline' as const,
      title: t('blindDate.create.success.next1Title'),
      sub:
        maxParticipants != null
          ? t('blindDate.create.success.next1SubMax', { max: maxParticipants, count: questionCount })
          : t('blindDate.create.success.next1Sub', { count: questionCount }),
    },
    {
      icon: 'chatbubble-ellipses-outline' as const,
      title: t('blindDate.create.success.next2Title'),
      sub: t('blindDate.create.success.next2Sub'),
    },
    {
      icon: 'eye-outline' as const,
      title: t('blindDate.create.success.next3Title'),
      sub: t('blindDate.create.success.next3Sub'),
    },
  ];

  const chips = [
    { icon: 'chatbubbles-outline' as const, label: t('blindDate.common.questions', { count: questionCount }) },
    { icon: 'globe-outline' as const, label: session.language_code.toUpperCase() },
    {
      icon: 'time-outline' as const,
      label: session.expires_at
        ? t('blindDate.create.success.closesOn', { date: formatExpiry(session.expires_at) })
        : t('blindDate.format.noDeadline'),
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.successWrap,
        { paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <CelebrationOverlay visible />

      {/* Gender artwork — same footprint as the old gradient orb */}
      <Animated.View entering={ZoomIn.delay(80).springify().damping(14)} style={styles.successOrbGlow}>
        <Image source={artwork} style={styles.successArt} contentFit="contain" />
      </Animated.View>

      <Animated.Text
        entering={FadeInDown.delay(180).springify()}
        style={[styles.successTitle, { color: th.text }]}
      >
        {t('blindDate.create.success.title')}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.delay(260).springify()}
        style={[styles.successSub, { color: th.textSecondary }]}
      >
        {t('blindDate.create.success.subtitle')}
      </Animated.Text>

      {/* Session summary chips */}
      <Animated.View
        entering={FadeInDown.delay(340).springify()}
        style={styles.successChips}
      >
        {chips.map((c) => (
          <View
            key={c.label}
            style={[
              styles.successChip,
              {
                backgroundColor: isDark ? bdColors.surfaceWarmDark : bdColors.surfaceWarm,
                borderColor: th.border,
              },
            ]}
          >
            <Ionicons name={c.icon} size={13} color={bdColors.primary} />
            <Text style={[styles.successChipText, { color: th.text }]}>{c.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* What happens next */}
      <Animated.View
        entering={FadeInDown.delay(420).springify()}
        style={[styles.nextCard, { backgroundColor: th.surface, borderColor: th.border }]}
      >
        <Text style={[styles.nextCardTitle, { color: th.text }]}>{t('blindDate.create.success.nextTitle')}</Text>
        {nextSteps.map((s, i) => (
          <View key={s.title} style={styles.nextStep}>
            <View
              style={[
                styles.nextStepBadge,
                { backgroundColor: isDark ? bdColors.surfaceWarmDark : bdColors.surfaceWarm },
              ]}
            >
              <Ionicons name={s.icon} size={16} color={bdColors.primary} />
            </View>
            <View style={styles.nextStepText}>
              <Text style={[styles.nextStepTitle, { color: th.text }]}>
                {i + 1}. {s.title}
              </Text>
              <Text style={[styles.nextStepSub, { color: th.textSecondary }]}>{s.sub}</Text>
            </View>
            {i < nextSteps.length - 1 && (
              <View style={[styles.nextStepLine, { backgroundColor: th.border }]} />
            )}
          </View>
        ))}
      </Animated.View>

      {/* CTAs */}
      <Animated.View entering={FadeInDown.delay(520).springify()} style={styles.successCtas}>
        <TouchableOpacity
          onPress={onManage}
          activeOpacity={0.85}
          accessibilityRole="button"
          style={styles.successPrimaryWrap}
        >
          <LinearGradient
            colors={bdGradients.hero as unknown as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.successPrimaryBtn}
          >
            <Ionicons name="people" size={17} color="#FFF" />
            <Text style={styles.primaryBtnText}>{t('blindDate.create.success.manageCta')}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onHome}
          activeOpacity={0.75}
          accessibilityRole="button"
          style={styles.ghostBtn}
        >
          <Text style={[styles.ghostBtnText, { color: th.textSecondary }]}>{t('blindDate.create.success.backHome')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Root screen ─────────────────────────────────────────────────────────────

export default function CreateBlindDateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();

  const { configuration } = useBlindDateConfiguration();
  const { refreshEntitlements } = useEntitlements();

  const [step, setStep] = useState<Step>('config');
  const [language, setLanguage] = useState(configuration?.language_code ?? 'en');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [pickedQ, setPickedQ] = useState<Set<string>>(new Set());
  const [pickedC, setPickedC] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<BlindDateSessionDto | null>(null);

  // Stable idempotency key — same across retries so retries don't double-charge
  const idempotencyKeyRef = useRef(generateUUID());

  const languages = configuration?.supported_languages ?? [{ code: 'en', name: 'English' }];
  // undefined → no client-side cap (older backend); the server still validates.
  const maxQuestions = configuration?.limits?.max_round_questions;

  const toggleQ = useCallback((id: string) => {
    setPickedQ((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (maxQuestions == null || next.size + pickedC.size < maxQuestions) next.add(id);
      return next;
    });
  }, [pickedC.size, maxQuestions]);

  const toggleC = useCallback((id: string) => {
    setPickedC((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (maxQuestions == null || next.size + pickedQ.size < maxQuestions) next.add(id);
      return next;
    });
  }, [pickedQ.size, maxQuestions]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setPublishError(null);
    const payload = {
      questionIds: [...pickedQ],
      customQuestionIds: [...pickedC],
      languageCode: language,
      expiresAt,
    };
    try {
      // idempotency_key_in_use means the key was claimed by another request —
      // per the API contract, retry once with a freshly generated key.
      const session = await createBlindDateSession({
        idempotencyKey: idempotencyKeyRef.current,
        ...payload,
      }).catch((err) => {
        if (blindDateErrorCode(err) !== 'idempotency_key_in_use') throw err;
        idempotencyKeyRef.current = generateUUID();
        return createBlindDateSession({
          idempotencyKey: idempotencyKeyRef.current,
          ...payload,
        });
      });
      refreshEntitlements();
      setCreatedSession(session);
      setStep('success');
    } catch (err) {
      if (isInsufficientCreditsError(err)) {
        // The global InsufficientCreditsModal handles this
        return;
      }
      const msg = friendlyCreateError(err, maxQuestions);
      setPublishError(msg);
      if (extractApiError(err).code.toLowerCase() === 'active_session_exists') {
        themedAlert({
          title: t('blindDate.home.activeSessionTitle'),
          message: msg,
          icon: 'warning-outline',
          iconColor: colors.warning,
          buttons: [{ text: t('common.ok', 'OK'), style: 'cancel' }],
        });
      }
    } finally {
      setPublishing(false);
    }
  }, [pickedQ, pickedC, language, expiresAt, refreshEntitlements, maxQuestions, t]);

  const stepTitles: Record<Step, string> = {
    config: t('blindDate.common.startBlindDate'),
    questions: t('blindDate.create.round1Questions'),
    success: t('blindDate.create.success.publishedTitle'),
  };

  const stepIdx = step === 'config' ? 0 : step === 'questions' ? 1 : 2;

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <FlowBackdrop />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: th.border }]}>
        <TouchableOpacity
          onPress={() => (step === 'config' ? router.back() : setStep('config'))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('blindDate.common.back')}
          style={styles.headerBtn}
        >
          <Ionicons name={step === 'success' ? 'close' : 'chevron-back'} size={22} color={th.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>{stepTitles[step]}</Text>
        <View style={styles.headerBtn} />
      </View>

      {/* Step progress bar */}
      <View style={styles.stepBar}>
        {([0, 1, 2] as const).map((i) => (
          <View
            key={i}
            style={[
              styles.stepSeg,
              i < stepIdx
                ? styles.stepSegDone
                : i === stepIdx
                  ? styles.stepSegActive
                  : { backgroundColor: th.border },
            ]}
          />
        ))}
      </View>

      {/* Steps */}
      {step === 'config' && (
        <ConfigStep
          language={language}
          onLanguageChange={setLanguage}
          languages={languages}
          expiresAt={expiresAt}
          onExpiresChange={setExpiresAt}
          onNext={() => setStep('questions')}
          loading={false}

        />
      )}
      {step === 'questions' && (
        <QuestionsStep
          pickedQ={pickedQ}
          pickedC={pickedC}
          maxQuestions={maxQuestions}
          onToggleQ={toggleQ}
          onToggleC={toggleC}
          onBack={() => setStep('config')}
          onPublish={handlePublish}
          publishing={publishing}
          error={publishError}
        />
      )}
      {step === 'success' && createdSession && (
        <SuccessStep
          session={createdSession}
          questionCount={pickedQ.size + pickedC.size}
          maxParticipants={configuration?.limits?.max_participants ?? null}
          onManage={() =>
            router.replace({
              pathname: '/(app)/blind-date-manage' as never,
              params: { sessionId: createdSession.id },
            })
          }
          onHome={() => router.push('/(app)/blind-date' as never)}
        />
      )}

      {/* Shared Blind Date nav — creation lives under the Create tab */}
      <BlindDateBottomNav
        activeTab="mine"
        onHome={() => router.replace('/(app)/(tabs)' as never)}
        onExplore={() => router.replace('/(app)/blind-date' as never)}
        onMine={() =>
          router.replace({
            pathname: '/(app)/blind-date' as never,
            params: { tab: 'mine' },
          })
        }
        onJoined={() =>
          router.replace({
            pathname: '/(app)/blind-date' as never,
            params: { tab: 'participating' },
          })
        }
        onMatches={() => router.push('/(app)/(tabs)/matches' as never)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },

  stepContent: { padding: 20, paddingBottom: 48 },

  // Hero card — compact gradient banner
  heroCard: {
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#6D35FF',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -0.2,
  },

  // Step progress bar (header)
  stepBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  stepSeg: { flex: 1, height: 3, borderRadius: 2 },
  stepSegDone: { backgroundColor: bdColors.primary, opacity: 1 },
  stepSegActive: { backgroundColor: bdColors.primary, opacity: 0.45 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 20,
  },

  // Language selector
  selectIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  selectRowText: { flex: 1, fontSize: 15, fontWeight: '600' },
  selectMenu: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    marginTop: 4,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  selectOptionText: { fontSize: 14.5, fontWeight: '600' },

  // Expiry — 2×2 icon-top card grid
  expiryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  expiryCard: {
    width: '47.5%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    gap: 5,
    position: 'relative',
  },
  expiryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  expiryCardLabel: { fontSize: 13.5, fontWeight: '700', textAlign: 'center' },
  expiryCardSub: { fontSize: 11.5, lineHeight: 15, textAlign: 'center' },
  expiryCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  // Expiry picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.55)',
    justifyContent: 'center',
    padding: 28,
  },
  pickerCard: { borderRadius: 22, padding: 20 },
  pickerHeader: { alignItems: 'center', marginBottom: 14 },
  pickerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  pickerTitle: { fontSize: 17, fontWeight: '800' },
  pickerSubtitle: { fontSize: 12.5, marginTop: 4, textAlign: 'center' },
  pickerBody: { borderRadius: 16, overflow: 'hidden' },
  pickerBand: {
    position: 'absolute',
    top: WHEEL_PAD,
    left: 0,
    right: 0,
    height: WHEEL_ITEM_H,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  pickerRow: { flexDirection: 'row' },
  pickerError: { fontSize: 12.5, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  pickerActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  pickerBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerBtnPrimary: { backgroundColor: bdColors.primary },
  pickerBtnText: { fontSize: 14, fontWeight: '700' },

  // Wheel columns
  wheelColumn: { flex: 1, height: WHEEL_ITEM_H * WHEEL_VISIBLE },
  wheelItem: { height: WHEEL_ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelItemText: { fontSize: 15, fontWeight: '600' },
  wheelItemTextSelected: { fontSize: 17, fontWeight: '800' },
  hintText: { fontSize: 12.5, marginTop: 8, marginBottom: 4, lineHeight: 17 },

  // Primary CTA — gradient-filled (backgroundColor removed)
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 24,
    marginTop: 18,
    overflow: 'hidden',
    shadowColor: '#6D35FF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },

  secondaryBtn: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },

  // Questions step
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  questionStepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    backgroundColor: bdColors.primary,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stepBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  questionHeaderTitle: { fontSize: 17, fontWeight: '800' },
  questionHeaderSub: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  questionCountPill: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionCountText: { fontSize: 17, fontWeight: '800' },
  publishError: { fontSize: 12.5, textAlign: 'center', marginBottom: 8 },
  publishFooter: {
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  publishBtnRow: { flexDirection: 'row', alignItems: 'center' },
  publishBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    overflow: 'hidden',
    marginLeft: 10,
  },
  pickerWrap: { flex: 1, paddingHorizontal: 16 },

  ghostBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  ghostBtnText: { fontSize: 14, fontWeight: '600' },

  // Success step
  successWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  successOrbGlow: {
    marginBottom: 22,
    shadowColor: bdColors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  successArt: {
    width: 96,
    height: 96,
  },
  successTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 10, letterSpacing: -0.4 },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 18 },
  successChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  successChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  successChipText: { fontSize: 12, fontWeight: '700' },
  nextCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  nextCardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  nextStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  nextStepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepText: { flex: 1 },
  nextStepTitle: { fontSize: 13.5, fontWeight: '700' },
  nextStepSub: { fontSize: 11.5, marginTop: 1, lineHeight: 16 },
  nextStepLine: {
    position: 'absolute',
    left: 16.5,
    top: 41,
    bottom: -7,
    width: 1.5,
  },
  successCtas: { alignSelf: 'stretch' },
  successPrimaryWrap: { borderRadius: 16, overflow: 'hidden' },
  successPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
});
