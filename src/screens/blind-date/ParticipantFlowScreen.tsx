import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
    ZoomIn
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BlindDateBottomNav from '@/components/blind-date/BlindDateBottomNav';
import { CelebrationOverlay } from '@/components/blind-date/CelebrationOverlay';
import { FlowBackdrop } from '@/components/blind-date/FlowBackdrop';
import { RoundProgressBar } from '@/components/blind-date/RoundProgressBar';
import { BlurredPortraitFallback } from '@/components/blind-date/SessionSwipeCard';
import { themedAlert, themedError } from '@/components/common/ThemedAlert';
import { bdColors, bdGradients } from '@/constants/blindDateTheme';
import { colors } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useBlindDateConfiguration } from '@/hooks/blindDate/useBlindDateConfiguration';
import { useMyRoundAnswers } from '@/hooks/blindDate/useMyRoundAnswers';
import { useParticipantFlow } from '@/hooks/blindDate/useParticipantFlow';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useOtherUserProfile } from '@/hooks/profile/useOtherUserProfile';
import { useTheme } from '@/hooks/use-theme';
import type { BlindDateJoinResponseDto, BlindDateSessionQuestionDto } from '@/types/blindDate';
import { formatDecisionDeadline } from '@/utils/blindDateFormat';
import { getCostForAction } from '@/utils/entitlements';
import {
    RELATIONSHIP_API_TO_LABEL,
    RELIGION_API_TO_LABEL,
} from '@/utils/profileMappers';

// ─── Palette helpers ──────────────────────────────────────────────────────────

const MAX_ANSWER_LEN = 2000;

function toTitleCase(v: string) {
  return v.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Shared sub-components ────────────────────────────────────────────────────

/** Standard scaffold: back button + header + content. */
function FlowScaffold({
  title,
  onBack,
  children,
  rightEl,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  rightEl?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>{title}</Text>
        {rightEl ?? <View style={styles.headerBtn} />}
      </View>
      <View style={{ flex: 1 }}>
        <FlowBackdrop />
        {children}
      </View>
    </View>
  );
}

/** Primary CTA button — consistent across all steps. */
function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color="#FFF" size="small" />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={17} color="#FFF" />}
          <Text style={styles.primaryBtnText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}


/** Profile chip pill. */
function InfoChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <View style={[styles.infoChip, { backgroundColor: isDark ? '#2E1F50' : '#EFE7FF' }]}>
      <Ionicons name={icon} size={11} color={bdColors.primary} />
      <Text style={[styles.infoChipText, { color: th.text }]}>{label}</Text>
    </View>
  );
}

/** Bullet point row used in JOIN_CONFIRM and explainer screens. */
function BulletPoint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletIcon}>
        <Ionicons name={icon} size={14} color={bdColors.primary} />
      </View>
      <Text style={[styles.bulletText, { color: th.text }]}>{text}</Text>
    </View>
  );
}

/** Section divider. */
function SectionDivider({ label }: { label: string }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.sectionDivider}>
      <View style={[styles.dividerLine, { backgroundColor: th.border }]} />
      <Text style={[styles.dividerLabel, { color: th.textSecondary }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: th.border }]} />
    </View>
  );
}

/** Destructive "Leave" link shown in active participation steps. */
function WithdrawLink({
  flow,
  onWithdrawn,
}: {
  flow: ReturnType<typeof useParticipantFlow>;
  onWithdrawn: () => void;
}) {
  const handlePress = () => {
    themedAlert({
      title: 'Leave this Blind Date?',
      message: 'You will be removed from the session and cannot rejoin. This cannot be undone.',
      icon: 'exit-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await flow.withdraw();
              onWithdrawn();
            } catch {
              themedError('Could not leave', 'Please try again.');
            }
          },
        },
      ],
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={flow.withdrawing}
      style={styles.withdrawLink}
      accessibilityRole="button"
      hitSlop={8}
    >
      {flow.withdrawing ? (
        <ActivityIndicator size="small" color={colors.danger} />
      ) : (
        <Text style={[styles.withdrawLinkText, { color: colors.danger }]}>
          Leave this Blind Date
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── "You're in!" — post-join celebration (screen 2 in reference) ────────────

/** Decorative hearts scattered in background. */
type HeartDeco = {
  top?: number; bottom?: number; left?: number; right?: number;
  size: number; opacity: number; outline: boolean;
};
const HEART_DECO: HeartDeco[] = [
  { top: 72,  left: 28,  size: 22, opacity: 0.30, outline: true  },
  { top: 110, right: 32, size: 18, opacity: 0.40, outline: false },
  { top: 190, left: 55,  size: 15, opacity: 0.25, outline: true  },
  { top: 155, right: 65, size: 24, opacity: 0.35, outline: false },
  { top: 44,  left: 105, size: 16, opacity: 0.28, outline: true  },
  { bottom: 290, left: 22,  size: 18, opacity: 0.30, outline: false },
  { bottom: 240, right: 28, size: 16, opacity: 0.38, outline: true  },
  { bottom: 350, right: 85, size: 20, opacity: 0.25, outline: false },
  { top: 310, left: 18,  size: 14, opacity: 0.32, outline: true  },
  { top: 275, right: 38, size: 19, opacity: 0.28, outline: false },
];

/** A decorative heart with a gentle floating bob — varied per index. */
function FloatingHeart({ deco, index }: { deco: HeartDeco; index: number }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withTiming(-(7 + (index % 3) * 4), {
        duration: 1500 + (index % 5) * 260,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.yaiHeartDeco,
        { top: deco.top, bottom: deco.bottom, left: deco.left, right: deco.right, opacity: deco.opacity },
        floatStyle,
      ]}
    >
      <Ionicons
        name={deco.outline ? 'heart-outline' : 'heart'}
        size={deco.size}
        color={bdColors.accent}
      />
    </Animated.View>
  );
}

function CheckRow({ label }: { label: string }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.yaiCheckRow}>
      <View style={styles.yaiCheckCircle}>
        <Ionicons name="checkmark" size={13} color="#FFF" />
      </View>
      <Text style={[styles.yaiCheckLabel, { color: th.text }]}>{label}</Text>
    </View>
  );
}

function YouAreInStep({
  maxRounds,
  onBegin,
  onBack,
}: {
  maxRounds: number | null;
  onBegin: () => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { data: myProfile } = useCurrentProfile();

  // Mystery-partner artwork: men see the unknown girl, everyone else the unknown man.
  const mysteryArt =
    myProfile?.gender === 'MALE'
      ? require('@/assets/images/blind-date-girl-unknown.png')
      : require('@/assets/images/blind-date-man-unknown.png');

  return (
    <View
      style={[
        styles.yaiScreen,
        { paddingTop: insets.top, backgroundColor: isDark ? '#160A12' : '#FFF9FB' },
      ]}
    >
      {/* Floating decorative hearts — pointer events disabled so they never steal touches */}
      {HEART_DECO.map((h, i) => (
        <FloatingHeart key={i} deco={h} index={i} />
      ))}

      {/* Nav bar */}
      <View style={styles.yaiNavBar}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color={th.text} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content so it adapts on small screens */}
      <ScrollView
        contentContainerStyle={styles.yaiScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Mystery-partner artwork — opposite gender to the viewer */}
        <Image source={mysteryArt} style={styles.yaiArt} contentFit="contain" />

        {/* Headings */}
        <Text style={[styles.yaiTitle, { color: th.text }]}>You are joined!</Text>
        <Text style={[styles.yaiSub, { color: th.textSecondary }]}>
          Your Blind Date journey begins.
        </Text>

        {/* Checklist card */}
        <View
          style={[
            styles.yaiChecklist,
            { backgroundColor: th.surface, borderColor: th.border, borderWidth: 1 },
          ]}
        >
          <CheckRow
            label={
              maxRounds != null
                ? `Up to ${maxRounds} round${maxRounds === 1 ? '' : 's'}`
                : 'Multiple rounds'
            }
          />
          <CheckRow label="Meaningful questions" />
          <CheckRow label="Stay anonymous" />
          <CheckRow label="Be honest and respectful" />
          <CheckRow label="Take your time" />
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.yaiBeginBtn}
          onPress={onBegin}
          activeOpacity={0.88}
          accessibilityRole="button"
        >
          <Text style={styles.yaiBeginBtnText}>Let&rsquo;s Begin</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>

        {/* Footer tagline */}
        <Text style={[styles.yaiFooter, { color: th.textSecondary }]}>
          Real people. Deeper conversations.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Step 1: JOIN_CONFIRM ─────────────────────────────────────────────────────

function JoinConfirmStep({
  flow,
  sessionId,
  onJoined,
  onBack,
}: {
  flow: ReturnType<typeof useParticipantFlow>;
  sessionId: string;
  onJoined: (res: BlindDateJoinResponseDto) => void;
  onBack: () => void;
}) {
  const { colors: th } = useTheme();
  const { entitlements } = useEntitlements();
  const session = flow.session;
  const creator = session?.creator;
  const joinCost = getCostForAction('BLIND_DATE_PARTICIPATE', entitlements);
  const costLabel =
    joinCost === null || joinCost === 0
      ? 'Free'
      : `${joinCost} credit${joinCost === 1 ? '' : 's'}`;

  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await flow.joinSession();
      if (res) onJoined(res);
    } catch {
      // joinError is set inside the hook; the error alert is shown below
    } finally {
      setJoining(false);
    }
  };

  return (
    <FlowScaffold title="Blind Date" onBack={onBack}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Blurred hero */}
        <View style={styles.joinHeroWrap}>
          {creator?.primary_photo?.signed_url ? (
            <Image
              source={{ uri: creator.primary_photo.signed_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={28}
            />
          ) : (
            <BlurredPortraitFallback seed={sessionId} />
          )}
          <LinearGradient
            colors={['rgba(10,4,20,0)', 'rgba(10,4,20,0.75)']}
            locations={[0.3, 1]}
            style={styles.joinHeroGradient}
          />
          <View style={styles.joinHeroOverlay}>
            <View style={styles.joinLockPill}>
              <Ionicons name="lock-closed" size={11} color="#FFF" />
              <Text style={styles.joinLockText}>Identity hidden until reveal</Text>
            </View>
            <Text style={styles.joinHeroTitle}>You&rsquo;re in?</Text>
            <Text style={styles.joinHeroSub}>Your Blind Date journey begins.</Text>
          </View>
        </View>

        {/* Creator info chips */}
        {(creator?.age != null ||
          creator?.country ||
          creator?.relationship_intention ||
          creator?.religion) && (
          <View style={styles.chipRow}>
            {creator?.age != null && (
              <InfoChip icon="person-outline" label={`${creator.age}`} />
            )}
            {creator?.country && (
              <InfoChip icon="location-outline" label={creator.country} />
            )}
            {creator?.relationship_intention && (
              <InfoChip
                icon="heart-outline"
                label={
                  RELATIONSHIP_API_TO_LABEL[creator.relationship_intention] ??
                  toTitleCase(creator.relationship_intention)
                }
              />
            )}
            {creator?.religion && (
              <InfoChip
                icon="flower-outline"
                label={
                  RELIGION_API_TO_LABEL[creator.religion] ??
                  toTitleCase(creator.religion)
                }
              />
            )}
          </View>
        )}

        {/* Questions preview — read-only, answers happen after joining */}
        {flow.questions.length > 0 && (
          <View style={[styles.bulletCard, { backgroundColor: th.surface, borderColor: th.border }]}>
            <Text style={[styles.previewHeading, { color: th.text }]}>
              Questions you&apos;ll answer
            </Text>
            {flow.questions.map((q, i) => (
              <View key={q.id} style={styles.previewRow}>
                <Text style={[styles.previewNum, { color: bdColors.primary }]}>{i + 1}</Text>
                <Text style={[styles.previewText, { color: th.text }]} numberOfLines={2}>
                  {q.question}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* How it works bullets */}
        <View style={[styles.bulletCard, { backgroundColor: th.surface, borderColor: th.border }]}>
          <BulletPoint icon="eye-off-outline" text="Stay anonymous — your photo and identity remain hidden while you progress." />
          <BulletPoint icon="chatbubble-ellipses-outline" text="Meaningful questions — answer questions selected by the host." />
          <BulletPoint icon="trending-up-outline" text="Earn your way forward — the host decides who advances to each round." />
          <BulletPoint icon="shield-checkmark-outline" text="Be honest and respectful — real people, deeper conversations." />
        </View>

        {/* Cost */}
        <View style={[styles.costRow, { borderColor: th.border }]}>
          <Ionicons name="diamond-outline" size={15} color={bdColors.primary} />
          <Text style={[styles.costText, { color: th.textSecondary }]}>{costLabel}</Text>
        </View>

        {flow.joinError && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {flow.joinError}
          </Text>
        )}

        <PrimaryButton
          label="Let's Begin"
          icon="heart"
          onPress={handleJoin}
          loading={joining || flow.joinMutation.isPending}
        />
      </ScrollView>
    </FlowScaffold>
  );
}

// ─── Step 2+3: ANSWERING (round intro merged into the question screen) ────────

/** Display theme name per round — visual flavor matching the reference flow. */
function roundThemeName(round: number): string {
  if (round <= 1) return 'First Impressions';
  if (round === 2) return 'Values & Lifestyle';
  if (round === 3) return 'Deeper Connection';
  return 'The Final Chapter';
}

function roundThemeSub(round: number, total: number): string {
  const q = total > 0 ? `${total} question${total === 1 ? '' : 's'} to answer.` : '';
  if (round <= 1) return `Let's start with the basics. ${q}`;
  if (round === 2) return `Now let's see what really matters. ${q}`;
  if (round === 3) return `Let's go a little deeper. ${q}`;
  return `The final stretch. ${q}`;
}

function AnsweringStep({
  flow,
  onBack,
  onWithdrawn,
}: {
  flow: ReturnType<typeof useParticipantFlow>;
  onBack: () => void;
  onWithdrawn: () => void;
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { configuration } = useBlindDateConfiguration();
  const maxRounds = configuration?.limits?.max_rounds ?? null;

  const q = flow.currentQuestion;
  const idx = flow.currentQuestionIndex;
  const total = flow.totalQuestions;
  const round = flow.session?.current_round_number ?? 1;
  const roundTitle = maxRounds ? `Round ${round} of ${maxRounds}` : `Round ${round}`;
  const isLast = idx === total - 1;
  const [draft, setLocalDraft] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Keyboard-aware scrolling ──────────────────────────────────────────────
  // Strategy (no KeyboardAvoidingView):
  //   iOS  — automaticallyAdjustKeyboardInsets on the ScrollView adjusts the
  //           content inset natively; the spacer adds extra scroll room.
  //   Android — adjustResize in AndroidManifest.xml shrinks the window;
  //             the spacer guarantees the input can still scroll into view.
  // Both platforms scroll to the input from the keyboard-show event (not
  // onFocus), so the layout is already settled when scrollTo runs.
  const scrollRef = useRef<ScrollView>(null);
  const inputYRef = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKeyboardHeight(e.endCoordinates.height);
      // iOS: wait for keyboard animation (~250 ms) then scroll.
      // Android: keyboard is already visible; one tick is enough.
      setTimeout(
        () => scrollRef.current?.scrollTo({ y: Math.max(0, inputYRef.current - 16), animated: true }),
        Platform.OS === 'ios' ? 280 : 60,
      );
    };
    const onHide = () => setKeyboardHeight(0);

    const show = Keyboard.addListener(showEvt, onShow);
    const hide = Keyboard.addListener(hideEvt, onHide);
    return () => { show.remove(); hide.remove(); };
  }, []);

  // Sync local draft when the question changes (render-time, not effect).
  const [prevQId, setPrevQId] = useState<string | null>(null);
  if (q && q.id !== prevQId) {
    setPrevQId(q.id);
    setLocalDraft(flow.answerDrafts[q.id] ?? q.my_answer ?? '');
  }

  const handleNext = async () => {
    if (!q || saving) return;
    const trimmed = draft.trim();
    if (!trimmed) { flow.setDraft(q.id, ''); return; }
    // Unchanged saved answer — skip the upsert, just advance.
    const unchanged = q.my_answer === trimmed && flow.submittedIds.has(q.id);
    if (unchanged) {
      if (isLast) { await flow.finalizeAnswers(); }
      else { flow.advanceQuestion(); }
      return;
    }
    setSaving(true);
    const ok = await flow.autoSaveAnswer(q.id, trimmed);
    setSaving(false);
    if (ok) {
      if (isLast) { const done = await flow.finalizeAnswers(); if (done) return; }
      else { flow.advanceQuestion(); }
    }
  };

  // Loading state — questions not yet fetched.
  if (!q) {
    return (
      <FlowScaffold title={roundTitle} onBack={onBack}>
        <View style={styles.center}>
          <ActivityIndicator color={bdColors.primary} size="large" />
        </View>
      </FlowScaffold>
    );
  }

  const isSubmitted = flow.submittedIds.has(q.id) || (q.my_answer != null && q.my_answer === draft);

  return (
    <FlowScaffold title={roundTitle} onBack={onBack}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: 22, paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        // 'none' — dismissing on drag collapses the keyboard spacer mid-gesture,
        // which snaps the scroll position back and makes the screen feel
        // unscrollable while the keyboard is open.
        keyboardDismissMode="none"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
          {/* ── Round theme header ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(320)} style={styles.ansThemeWrap}>
            {/* Theme name */}
            <Text style={[styles.ansThemeName, { color: isDark ? '#B777FF' : bdColors.primary }]}>
              {roundThemeName(round)}
            </Text>
            <Text style={[styles.ansThemeSub, { color: th.textSecondary }]}>
              {roundThemeSub(round, total)}
            </Text>
          </Animated.View>

          {/* ── Question progress pills ────────────────────────────────────── */}
          <View style={styles.ansQDots}>
            {Array.from({ length: total }, (_, i) => {
              const done = i < idx || flow.submittedIds.has(flow.questions[i]?.id ?? '');
              const active = i === idx;
              return (
                <View
                  key={i}
                  style={[
                    styles.questionDot,
                    {
                      backgroundColor: done || active ? bdColors.primary : th.border,
                      width: active ? 24 : 8,
                      opacity: done ? 0.6 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* ── "Question X of Y" + Previous nav ──────────────────────────── */}
          <View style={styles.questionNavRow}>
            {idx > 0 ? (
              <TouchableOpacity
                onPress={flow.goBackQuestion}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Previous question"
                style={styles.prevBtn}
              >
                <Ionicons name="chevron-back" size={14} color={bdColors.primary} />
                <Text style={[styles.prevBtnText, { color: bdColors.primary }]}>Previous</Text>
              </TouchableOpacity>
            ) : <View style={styles.prevBtnSpacer} />}
            <Text style={[styles.questionCounter, { color: th.textSecondary }]}>
              Question {idx + 1} of {total}
            </Text>
            <View style={styles.prevBtnSpacer} />
          </View>

          {/* ── Question card (speech-bubble style) ───────────────────────── */}
          <Animated.View
            key={q.id}
            entering={FadeInDown.duration(350).delay(60)}
            style={[
              styles.ansQCard,
              {
                backgroundColor: isDark ? '#1E0A1E' : '#FFF',
                borderColor: isDark ? '#3D2A6E' : '#DDD0FA',
                shadowColor: bdColors.primary,
              },
            ]}
          >
            {/* Decorative large quote mark */}
            <Text style={[styles.ansQQuote, { color: isDark ? '#3D1B3D' : '#EFE7FF' }]}>{'\u201C'}</Text>
            <Text style={[styles.ansQText, { color: th.text }]}>{q.question}</Text>
          </Animated.View>

          {/* ── Answer input ───────────────────────────────────────────────── */}
          <Animated.View
            entering={FadeInDown.duration(350).delay(120)}
            onLayout={(e) => {
              inputYRef.current = e.nativeEvent.layout.y;
            }}
          >
            <TextInput
              style={[
                styles.ansInput,
                {
                  color: th.text,
                  borderColor: isSubmitted
                    ? bdColors.primary
                    : isDark ? '#2E1F50' : '#DDD0FA',
                  backgroundColor: isDark ? '#160F24' : '#FFF9FB',
                },
              ]}
              placeholder="Type your answer here…"
              placeholderTextColor={th.textSecondary}
              multiline
              maxLength={MAX_ANSWER_LEN}
              value={draft}
              onChangeText={(t) => { setLocalDraft(t); flow.setDraft(q.id, t); }}
              editable={!flow.answerLocked}
              textAlignVertical="top"
            />

            {/* Saved indicator + char counter */}
            <View style={styles.answerMetaRow}>
              {isSubmitted ? (
                <View style={styles.savedPill}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                  <Text style={[styles.savedText, { color: colors.success }]}>Saved</Text>
                </View>
              ) : <View />}
              <Text style={[styles.charCount, { color: th.textSecondary }]}>
                {draft.length}/{MAX_ANSWER_LEN}
              </Text>
            </View>
          </Animated.View>

          {/* ── Error & lock states ────────────────────────────────────────── */}
          {flow.answerError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{flow.answerError}</Text>
          )}
          {flow.answerLocked && (
            <View style={[styles.lockedBanner, { borderColor: colors.warning }]}>
              <Ionicons name="lock-closed" size={14} color={colors.warning} />
              <Text style={[styles.lockedText, { color: colors.warning }]}>
                The host has made their decision — answers are now locked.
              </Text>
            </View>
          )}

          {/* ── Primary action ─────────────────────────────────────────────── */}
          <PrimaryButton
            label={isLast ? (flow.editingAnswers ? 'Save Changes' : 'Submit Answers') : 'Next Question'}
            icon={isLast ? 'checkmark-circle' : 'arrow-forward'}
            onPress={handleNext}
            loading={saving || flow.savingQuestionId === q.id}
            disabled={!draft.trim() || flow.answerLocked}
          />

          {/* Subtle encouragement */}
          <Text style={[styles.hintText, { color: th.textSecondary }]}>
            Be honest and take your time. Real people, deeper conversations.
          </Text>

          <WithdrawLink flow={flow} onWithdrawn={onWithdrawn} />

          {/* Keyboard spacer — gives Android scroll room equal to keyboard height */}
          <View style={{ height: keyboardHeight }} />
        </ScrollView>
      </FlowScaffold>
  );
}


// ─── Step 4: ROUND_COMPLETE ───────────────────────────────────────────────────

/** Confetti sprinkles scattered across the top of the screen. */
type ConfettiPiece = {
  top: number; left?: number; right?: number;
  w: number; h: number; color: string; rotate: number;
};
const RC_CONFETTI: ConfettiPiece[] = [
  { top: 64,  left: 30,  w: 5,  h: 16, color: '#22C55E', rotate: 30 },
  { top: 58,  left: 96,  w: 5,  h: 5,  color: '#B777FF', rotate: 0 },
  { top: 92,  left: 55,  w: 4,  h: 12, color: '#F59E0B', rotate: -40 },
  { top: 120, left: 22,  w: 5,  h: 14, color: '#2E1F50', rotate: 55 },
  { top: 140, left: 110, w: 4,  h: 4,  color: '#B777FF', rotate: 0 },
  { top: 68,  right: 40, w: 5,  h: 15, color: '#8A2CFF', rotate: -25 },
  { top: 100, right: 90, w: 5,  h: 5,  color: '#22C55E', rotate: 0 },
  { top: 52,  right: 120, w: 4, h: 12, color: '#F59E0B', rotate: 45 },
  { top: 130, right: 30, w: 5,  h: 13, color: '#B777FF', rotate: 60 },
  { top: 155, right: 105, w: 4, h: 4,  color: '#2E1F50', rotate: 0 },
  { top: 175, left: 60,  w: 4,  h: 4,  color: '#22C55E', rotate: 0 },
  { top: 185, right: 55, w: 5,  h: 14, color: '#B777FF', rotate: -50 },
  { top: 205, left: 34,  w: 5,  h: 5,  color: '#F59E0B', rotate: 0 },
  { top: 210, right: 140, w: 4, h: 12, color: '#8A2CFF', rotate: 35 },
];

/** Row inside "What happens next?" — filled rose icon badge + text. */
function RcStepRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.rcStepRow}>
      <View style={styles.rcStepIcon}>
        <Ionicons name={icon} size={15} color="#FFF" />
      </View>
      <Text style={[styles.rcStepText, { color: th.textSecondary }]}>{text}</Text>
    </View>
  );
}

function RoundCompleteStep({ flow, onBack }: { flow: ReturnType<typeof useParticipantFlow>; onBack: () => void }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const insets = useSafeAreaInsets();
  const round = flow.session?.current_round_number ?? 1;

  return (
    <View style={[styles.rcScreen, { backgroundColor: isDark ? '#160A12' : '#FFF9FB' }]}>
      {/* Confetti sprinkles */}
      {RC_CONFETTI.map((c, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.rcConfetti,
            {
              top: c.top, left: c.left, right: c.right,
              width: c.w, height: c.h,
              backgroundColor: c.color,
              transform: [{ rotate: `${c.rotate}deg` }],
            },
          ]}
        />
      ))}
      {/* Particle burst on mount */}
      <CelebrationOverlay visible />

      {/* Minimal header — back only, no title (matches reference) */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.headerBtn}
        >
          <Ionicons name="chevron-back" size={22} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.rcContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={ZoomIn.delay(80).springify().damping(12)} style={styles.rcHeartOrb}>
          <LinearGradient
            colors={bdGradients.hero as unknown as [string, string, string]}
            style={styles.rcHeartOrbInner}
          >
            <Ionicons name="heart" size={46} color="#FFF" />
          </LinearGradient>
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.delay(180).duration(400)}
          style={[styles.rcTitle, { color: th.text }]}
        >
          Round {round} Complete!
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(260).duration(400)}
          style={[styles.rcSub, { color: th.textSecondary }]}
        >
          Great job! You&rsquo;ve answered{'\n'}all the questions.
        </Animated.Text>

        {/* What happens next */}
        <Animated.View
          entering={FadeInDown.delay(360).duration(400)}
          style={[styles.rcCard, { backgroundColor: th.surface, borderColor: th.border }]}
        >
          <Text style={[styles.rcCardTitle, { color: th.text }]}>What happens next?</Text>
          <RcStepRow
            icon="eye-outline"
            text="The host will review all responses and decide who moves to the next round."
          />
          <RcStepRow
            icon="notifications-outline"
            text="You&rsquo;ll be notified once a decision is made."
          />
          <RcStepRow
            icon="heart-outline"
            text="Keep an eye on your Blind Dates."
          />
        </Animated.View>

        <PrimaryButton label="Back to My Blind Dates" onPress={onBack} />
      </ScrollView>
    </View>
  );
}

// ─── Step 5: WAITING ─────────────────────────────────────────────────────────

function WaitingStep({ flow, onBack, onWithdrawn, onEditAnswers }: { flow: ReturnType<typeof useParticipantFlow>; onBack: () => void; onWithdrawn: () => void; onEditAnswers: () => void }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const round = flow.session?.current_round_number ?? 1;

  return (
    <View style={[styles.screen, { backgroundColor: isDark ? '#0D0712' : '#FFF9FB' }]}>
      <View style={styles.waitingHero}>
        <LinearGradient
          colors={bdGradients.dark as unknown as [string, string, string]}
          style={styles.waitingGradient}
        >
          <View style={styles.waitingHourglass}>
            <Ionicons name="hourglass-outline" size={52} color="rgba(255,255,255,0.9)" />
          </View>
          <Text style={styles.waitingTitle}>Now it&rsquo;s their turn</Text>
          <Text style={styles.waitingSub}>
            {flow.participation?.status === 'ADVANCED'
              ? 'You made it through!\nThe host is setting up the next round.'
              : 'You\u2019ve answered all the questions.\nThe host is reviewing the responses.'}
          </Text>
        </LinearGradient>
      </View>

      <View style={[styles.waitingCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        <RoundProgressBar currentRound={round} isFinalRound={false} compact />
        <View style={styles.waitingInfoRow}>
          <Ionicons name="lock-closed" size={13} color={bdColors.primary} />
          <Text style={[styles.waitingInfoText, { color: th.textSecondary }]}>
            Identity hidden — the host can&rsquo;t see who you are
          </Text>
        </View>
        <View style={[styles.waitingTip, { backgroundColor: isDark ? '#2E1F50' : '#EFE7FF' }]}>
          <Ionicons name="notifications-outline" size={14} color={bdColors.primary} />
          <Text style={[styles.waitingTipText, { color: bdColors.primary }]}>
            You&rsquo;ll get a notification when the next round is unlocked.
          </Text>
        </View>
      </View>

      <View style={styles.waitingFooter}>
        <PrimaryButton label="Back to My Blind Dates" onPress={onBack} />
        {flow.participation?.status === 'ACTIVE' && flow.session?.status === 'OPEN' && (
          <TouchableOpacity
            onPress={onEditAnswers}
            style={styles.editAnswersLink}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={14} color={bdColors.primary} />
            <Text style={[styles.editAnswersText, { color: bdColors.primary }]}>
              Edit my answers
            </Text>
          </TouchableOpacity>
        )}
        <WithdrawLink flow={flow} onWithdrawn={onWithdrawn} />
      </View>
    </View>
  );
}

// ─── Step 6: ADVANCED ────────────────────────────────────────────────────────

function AdvancedStep({ flow, onContinue }: { flow: ReturnType<typeof useParticipantFlow>; onContinue: () => void }) {
  // session.current_round_number is already the NEW round the participant
  // advanced into — the creator opened it when they advanced this user.
  const round = flow.session?.current_round_number ?? 1;
  return (
    <View style={styles.fullScreen}>
      <CelebrationOverlay visible />
      <LinearGradient
        colors={bdGradients.hero as unknown as [string, string, string]}
        style={styles.fullScreenGradient}
      >
        <View style={styles.celebrationContent}>
          <View style={styles.trophyCircle}>
            <Ionicons name="trophy" size={56} color="#FFF" />
          </View>
          <Text style={styles.celebrationTitle}>You&rsquo;re through!</Text>
          <Text style={styles.celebrationSub}>Your answers caught their attention.</Text>
          <View style={styles.roundUnlockedPill}>
            <Ionicons name="lock-open" size={13} color="#FFF" />
            <Text style={styles.roundUnlockedText}>Round {round} Unlocked</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.celebrationBody}>
        <RoundProgressBar currentRound={round} isFinalRound={false} large />
        <View style={styles.nextRoundCard}>
          <Text style={styles.nextRoundTitle}>Round {round}</Text>
          <Text style={styles.nextRoundSub}>
            {flow.totalQuestions > 0
              ? `${flow.totalQuestions} question${flow.totalQuestions === 1 ? '' : 's'} await you.`
              : 'New questions are ready.'}
          </Text>
        </View>
        <PrimaryButton
          label={`Continue to Round ${round}`}
          icon="arrow-forward"
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

// ─── Step 7: ELIMINATED (also covers WITHDRAWN and a generically ended session) ──

/** One round's Q&A history — visually mirrors the creator's results screen
 *  so both sides of Blind Date share the same "round recap" language. */
function RoundAnswersSection({
  roundNumber,
  questions,
}: {
  roundNumber: number;
  questions: BlindDateSessionQuestionDto[];
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const answered = questions.filter((q) => q.my_answer != null);

  return (
    <View style={[styles.myRoundCard, { backgroundColor: th.surface, borderColor: th.border }]}>
      <View style={styles.myRoundHead}>
        <LinearGradient
          colors={bdGradients.hero as unknown as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.myRoundBadge}
        >
          <Ionicons name="albums-outline" size={12} color="#FFF" />
          <Text style={styles.myRoundBadgeText}>Round {roundNumber}</Text>
        </LinearGradient>
        <Text style={[styles.myRoundCount, { color: th.textSecondary }]}>
          {answered.length}/{questions.length} answered
        </Text>
      </View>

      {questions.map((q, i) => (
        <View key={q.id} style={styles.myAnswerRow}>
          <View style={styles.myAnswerQRow}>
            <LinearGradient
              colors={bdGradients.hero as unknown as [string, string, string]}
              style={styles.myAnswerQBadge}
            >
              <Text style={styles.myAnswerQBadgeText}>Q{i + 1}</Text>
            </LinearGradient>
            <Text style={[styles.myAnswerQ, { color: th.text }]}>{q.question}</Text>
          </View>
          <View
            style={[
              styles.myAnswerBubble,
              { backgroundColor: isDark ? 'rgba(138,44,255,0.14)' : `${bdColors.primary}0D` },
            ]}
          >
            <Text
              style={[
                styles.myAnswerA,
                { color: q.my_answer ? th.text : th.textSecondary },
                !q.my_answer && styles.myAnswerPending,
              ]}
            >
              {q.my_answer ?? 'Not answered'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function EliminatedStep({
  flow,
  onExplore,
  onBack,
}: {
  flow: ReturnType<typeof useParticipantFlow>;
  onExplore: () => void;
  onBack: () => void;
}) {
  const { colors: th } = useTheme();
  const participantStatus = flow.participation?.status;
  const { rows, isLoading } = useMyRoundAnswers(flow.session?.rounds ?? []);
  // Only show rounds the caller actually answered something in — rounds
  // after their elimination would otherwise render as an empty wall of
  // "Not answered" questions.
  const answeredRows = rows.filter((r) => r.questions.some((q) => q.my_answer != null));

  const { icon, title, subtext } =
    participantStatus === 'WITHDRAWN'
      ? {
          icon: 'exit-outline' as const,
          title: 'You left this Blind Date',
          subtext: 'You can join a new Blind Date anytime.',
        }
      : participantStatus === 'ELIMINATED'
        ? {
            icon: 'heart-dislike-outline' as const,
            title: "You didn't move forward this time",
            subtext: 'The host chose other participants to continue. Thank you for sharing your answers.',
          }
        : {
            icon: 'flag-outline' as const,
            title: 'This Blind Date has ended',
            subtext: 'Thank you for taking part — your answers are below.',
          };

  return (
    <FlowScaffold title="Blind Date" onBack={onBack}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.endedHero}>
          <View style={styles.eliminatedIcon}>
            <Ionicons name={icon} size={44} color={bdColors.slate} />
          </View>
          <Text style={[styles.eliminatedTitle, { color: th.text }]}>{title}</Text>
          <Text style={[styles.eliminatedSub, { color: th.textSecondary }]}>{subtext}</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={bdColors.primary} style={{ marginTop: 24 }} />
        ) : answeredRows.length > 0 ? (
          <>
            <SectionDivider label="Your answers" />
            {answeredRows.map((r) => (
              <RoundAnswersSection key={r.round_id} roundNumber={r.round_number} questions={r.questions} />
            ))}
          </>
        ) : null}

        <View style={[styles.eliminatedDivider, { backgroundColor: th.border }]} />
        <View style={styles.eliminatedActions}>
          <PrimaryButton
            label="Explore More Blind Dates"
            icon="compass-outline"
            onPress={onExplore}
          />
        </View>
      </ScrollView>
    </FlowScaffold>
  );
}

// ─── Step 8: FINALIST ─────────────────────────────────────────────────────────

function FinalistStep({ flow, onReveal }: { flow: ReturnType<typeof useParticipantFlow>; onReveal: () => void }) {
  const round = flow.session?.current_round_number ?? 1;
  return (
    <View style={styles.fullScreen}>
      <CelebrationOverlay visible />
      <LinearGradient
        colors={bdGradients.gold as unknown as [string, string, string]}
        style={styles.fullScreenGradient}
      >
        <View style={styles.celebrationContent}>
          <View style={styles.crownCircle}>
            <Ionicons name="star" size={52} color="#FFF" />
          </View>
          <Text style={styles.celebrationTitle}>You&rsquo;re the finalist!</Text>
          <Text style={styles.celebrationSub}>
            You&rsquo;ve been selected for the final stage before the reveal.
          </Text>
        </View>
      </LinearGradient>
      <View style={styles.celebrationBody}>
        <RoundProgressBar
          currentRound={round}
          isFinalRound={true}
          large
        />
        <Text style={styles.celebrationSectionTitle}>The reveal is waiting</Text>
        <PrimaryButton
          label="Continue to the Reveal"
          icon="eye"
          onPress={onReveal}
        />
      </View>
    </View>
  );
}

// ─── Steps 9–10: REVEAL_INTRO + REVEAL_COUNTDOWN ─────────────────────────────

function RevealIntroStep({ flow, onReveal, onBack }: { flow: ReturnType<typeof useParticipantFlow>; onReveal: () => void; onBack: () => void }) {
  const { colors: th } = useTheme();
  const creator = flow.session?.creator;
  const fd = flow.session?.final_decision;
  const deadline = formatDecisionDeadline(fd?.decision_deadline_at);

  return (
    <FlowScaffold title="Reveal" onBack={onBack}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Blurred portrait */}
        <View style={styles.revealPhotoWrap}>
          {creator?.primary_photo?.signed_url ? (
            <Image
              source={{ uri: creator.primary_photo.signed_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={30}
            />
          ) : (
            <BlurredPortraitFallback seed={flow.session?.id ?? ''} />
          )}
          <View style={styles.revealPhotoVeil} />
          <View style={styles.revealPhotoLock}>
            <Ionicons name="lock-closed" size={22} color="#FFF" />
          </View>
        </View>

        <Text style={[styles.revealIntroTitle, { color: th.text }]}>
          Are you ready to meet your Blind Date?
        </Text>
        <Text style={[styles.revealIntroSub, { color: th.textSecondary }]}>
          You&rsquo;ve made it to the end. The moment is here.
        </Text>
        {deadline && (
          <View style={[styles.deadlinePill, { borderColor: colors.warning }]}>
            <Ionicons name="time-outline" size={13} color={colors.warning} />
            <Text style={[styles.deadlineText, { color: colors.warning }]}>{deadline}</Text>
          </View>
        )}
        <PrimaryButton label="Reveal Blind Date" icon="eye" onPress={onReveal} />
      </ScrollView>
    </FlowScaffold>
  );
}

function RevealCountdownStep({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(3);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  // Tick the countdown — the updater must stay pure (no side effects inside),
  // otherwise the parent's setState runs during this component's render.
  useEffect(() => {
    const timer = setInterval(() => setCount((c) => Math.max(0, c - 1)), 900);
    return () => clearInterval(timer);
  }, []);

  // Once we hit 0, show the ❤️ for a beat, then advance the reveal phase.
  useEffect(() => {
    if (count !== 0) return;
    const t = setTimeout(onDone, 600);
    return () => clearTimeout(t);
  }, [count, onDone]);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.2, { duration: 300 }),
      withTiming(1, { duration: 400 }),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 150 }),
      withTiming(0.3, { duration: 750 }),
    );
  }, [count, scale, opacity]);

  const countStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <LinearGradient
      colors={bdGradients.dark as unknown as [string, string, string]}
      style={styles.countdownScreen}
    >
      <Animated.Text style={[styles.countdownNumber, countStyle]}>
        {count > 0 ? count : '❤️'}
      </Animated.Text>
    </LinearGradient>
  );
}

// ─── Step 11: REVEAL_PROFILE ──────────────────────────────────────────────────

function RevealProfileStep({
  flow,
  onDecide,
  onBack,
}: {
  flow: ReturnType<typeof useParticipantFlow>;
  onDecide: () => void;
  onBack: () => void;
}) {
  const { colors: th } = useTheme();
  const session = flow.session;
  const creator = session?.creator;
  const creatorId = session?.creator_user_id;
  const { data: creatorProfile } = useOtherUserProfile(creatorId ?? '');
  const { data: myProfile } = useCurrentProfile();

  const photo =
    creatorProfile?.photos?.find((p) => p.is_primary)?.signed_url ??
    creatorProfile?.primary_photo_url ??
    creator?.primary_photo?.signed_url;
  const displayName = creatorProfile?.display_name ?? 'Your Blind Date';
  const age = creatorProfile?.age ?? creator?.age;

  // Shared interests — only genuine matches between profiles
  const sharedItems: string[] = [];
  const myReligion = myProfile?.religion;
  const myIntention = myProfile?.relationship_intention;
  const myCountry = myProfile?.address?.country_name;

  if (myReligion && creator?.religion && myReligion === creator.religion) {
    sharedItems.push(`You both share the same faith (${RELIGION_API_TO_LABEL[creator.religion] ?? toTitleCase(creator.religion)})`);
  }
  if (myIntention && creator?.relationship_intention && myIntention === creator.relationship_intention) {
    sharedItems.push(`You're both looking for ${(RELATIONSHIP_API_TO_LABEL[creator.relationship_intention] ?? toTitleCase(creator.relationship_intention)).toLowerCase()}`);
  }
  if (myCountry && creator?.country && myCountry === creator.country) {
    sharedItems.push(`You're both from ${creator.country}`);
  }

  return (
    <FlowScaffold title="Reveal" onBack={onBack}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Photo */}
        <View style={styles.revealedPhotoWrap}>
          {photo ? (
            <Image
              source={{ uri: photo }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={bdGradients.hero as unknown as [string, string, string]}
              style={StyleSheet.absoluteFill}
            >
              <Ionicons name="person" size={80} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          )}
        </View>

        {/* Identity */}
        <View style={styles.revealedInfo}>
          <Text style={[styles.revealedName, { color: th.text }]}>
            {displayName}{age ? `, ${age}` : ''}
          </Text>
          {creator?.country && (
            <Text style={[styles.revealedMeta, { color: th.textSecondary }]}>
              📍 {creator.country}
            </Text>
          )}
        </View>

        {/* Profile chips */}
        {(creator?.relationship_intention || creator?.religion || creator?.age) && (
          <View style={styles.chipRow}>
            {creator?.relationship_intention && (
              <InfoChip
                icon="heart-outline"
                label={RELATIONSHIP_API_TO_LABEL[creator.relationship_intention] ?? toTitleCase(creator.relationship_intention)}
              />
            )}
            {creator?.religion && (
              <InfoChip
                icon="flower-outline"
                label={RELIGION_API_TO_LABEL[creator.religion] ?? toTitleCase(creator.religion)}
              />
            )}
            {creator?.age != null && (
              <InfoChip icon="person-outline" label={`Age ${creator.age}`} />
            )}
          </View>
        )}

        {/* Shared interests */}
        {sharedItems.length > 0 && (
          <>
            <SectionDivider label="You both said…" />
            <View style={[styles.sharedBox, { backgroundColor: th.surface, borderColor: th.border }]}>
              {sharedItems.map((item, i) => (
                <View key={i} style={styles.sharedItem}>
                  <Ionicons name="heart" size={13} color={bdColors.accent} />
                  <Text style={[styles.sharedText, { color: th.text }]}>{item}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <PrimaryButton
          label="Continue to Final Decision"
          icon="arrow-forward"
          onPress={onDecide}
        />
      </ScrollView>
    </FlowScaffold>
  );
}

// ─── Step 12: FINAL_DECISION ──────────────────────────────────────────────────

function FinalDecisionStep({
  flow,
  onBack,
}: {
  flow: ReturnType<typeof useParticipantFlow>;
  onBack: () => void;
}) {
  const { colors: th } = useTheme();
  const creator = flow.session?.creator;
  const fd = flow.session?.final_decision;
  const deadline = formatDecisionDeadline(fd?.decision_deadline_at);
  const deciding = flow.deciding;

  const handleDecision = async (decision: 'INTERESTED' | 'NOT_INTERESTED') => {
    try {
      await flow.submitDecision(decision);
    } catch {
      // decisionError set in hook
    }
  };

  return (
    <FlowScaffold title="Final Decision" onBack={onBack}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.decisionTitle, { color: th.text }]}>
          What do you think?
        </Text>
        <Text style={[styles.decisionSub, { color: th.textSecondary }]}>
          Would you like to get to know each other?
        </Text>
        {deadline && (
          <View style={[styles.deadlinePill, { borderColor: colors.warning, alignSelf: 'center' }]}>
            <Ionicons name="time-outline" size={13} color={colors.warning} />
            <Text style={[styles.deadlineText, { color: colors.warning }]}>{deadline}</Text>
          </View>
        )}
        {creator?.primary_photo?.signed_url && (
          <View style={styles.decisionPhotoWrap}>
            <Image
              source={{ uri: creator.primary_photo.signed_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          </View>
        )}
        <Text style={[styles.decisionPrivacy, { color: th.textSecondary }]}>
          Your choice is private until both sides have decided.
        </Text>
        {flow.decisionError && (
          <Text style={[styles.errorText, { color: colors.danger }]}>{flow.decisionError}</Text>
        )}
        <View style={styles.decisionBtnRow}>
          <TouchableOpacity
            style={[styles.decisionBtn, styles.decisionBtnInterested]}
            onPress={() => handleDecision('INTERESTED')}
            disabled={deciding}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {deciding ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#FFF" />
                <Text style={styles.decisionBtnText}>I&rsquo;m Interested</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.decisionBtn, { backgroundColor: th.surface, borderColor: th.border, borderWidth: 1.5 }]}
            onPress={() => handleDecision('NOT_INTERESTED')}
            disabled={deciding}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color={th.textSecondary} />
            <Text style={[styles.decisionBtnText, { color: th.textSecondary }]}>Not for me</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </FlowScaffold>
  );
}

// ─── Step 13: WAITING_DECISION ────────────────────────────────────────────────

function WaitingDecisionStep({ flow, onBack }: { flow: ReturnType<typeof useParticipantFlow>; onBack: () => void }) {
  const { colors: th } = useTheme();
  const fd = flow.session?.final_decision;
  const decided = fd?.other_party_decided;

  return (
    <FlowScaffold title="Decision Sent" onBack={onBack}>
      <View style={styles.waitingDecisionWrap}>
        <View style={styles.lockCircle}>
          <Ionicons name="lock-closed" size={44} color={bdColors.primary} />
        </View>
        <Text style={[styles.waitingDecisionTitle, { color: th.text }]}>
          Your answer is locked in.
        </Text>
        <Text style={[styles.waitingDecisionSub, { color: th.textSecondary }]}>
          {decided
            ? "They've decided — the result is being finalized."
            : "Now we're waiting for their decision."}
        </Text>
        {decided && (
          <View style={[styles.decidedBadge, { backgroundColor: `${colors.success}18` }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.decidedBadgeText, { color: colors.success }]}>
              They&rsquo;ve decided
            </Text>
          </View>
        )}
        <PrimaryButton label="Back to My Blind Dates" onPress={onBack} />
      </View>
    </FlowScaffold>
  );
}

// ─── Step 14a: MATCH ─────────────────────────────────────────────────────────

function MatchStep({ flow, onChat, onLater }: {
  flow: ReturnType<typeof useParticipantFlow>;
  onChat: () => void;
  onLater: () => void;
}) {
  const insets = useSafeAreaInsets();
  const creator = flow.session?.creator;
  const creatorPhoto = creator?.primary_photo?.signed_url;
  const { data: myProfile } = useCurrentProfile();
  const myPhoto = myProfile?.primary_photo_url ?? null;

  // Pulsing heart animation
  const heartScale = useSharedValue(1);
  const heartOpacity = useSharedValue(1);
  useEffect(() => {
    heartScale.value = withRepeat(
      withSequence(
        withTiming(1.22, { duration: 500, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.in(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, [heartScale]);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  // Photos slide in
  const leftX = useSharedValue(-60);
  const rightX = useSharedValue(60);
  useEffect(() => {
    leftX.value = withSpring(0, { damping: 14, stiffness: 100 });
    rightX.value = withSpring(0, { damping: 14, stiffness: 100 });
  }, [leftX, rightX]);
  const leftStyle = useAnimatedStyle(() => ({ transform: [{ translateX: leftX.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ translateX: rightX.value }] }));

  return (
    <View style={styles.fullScreen}>
      <CelebrationOverlay visible />

      {/* Full-bleed gradient background */}
      <LinearGradient
        colors={['#FF4FA3', '#C044FF', '#7B2BFF']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft glow blobs */}
      <View style={styles.matchGlowTop} />
      <View style={styles.matchGlowBottom} />

      {/* Content */}
      <View style={[styles.matchContent, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}>

        {/* Photos with overlapping heart badge */}
        <View style={styles.matchPhotosWrap}>
          <Animated.View style={[styles.matchPhotoCircle, leftStyle]}>
            {creatorPhoto ? (
              <Image source={{ uri: creatorPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={52} color="rgba(255,255,255,0.7)" />
            )}
            <View style={styles.matchPhotoRing} />
          </Animated.View>

          {/* Center heart */}
          <Animated.View style={[styles.matchHeartBadge, heartStyle]}>
            <Ionicons name="heart" size={30} color="#FFF" />
          </Animated.View>

          <Animated.View style={[styles.matchPhotoCircle, rightStyle]}>
            {myPhoto ? (
              <Image source={{ uri: myPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Ionicons name="person" size={52} color="rgba(255,255,255,0.7)" />
            )}
            <View style={styles.matchPhotoRing} />
          </Animated.View>
        </View>

        {/* Labels */}
        <Animated.View entering={FadeIn.duration(600).delay(300)} style={styles.matchTextBlock}>
          {/* MATCHED pill */}
          <View style={styles.matchedPill}>
            <Ionicons name="star" size={12} color="#FFE066" />
            <Text style={styles.matchedPillText}>MATCHED</Text>
            <Ionicons name="star" size={12} color="#FFE066" />
          </View>

          <Text style={styles.matchTitle}>It&rsquo;s a Match!</Text>
          <Text style={styles.matchSub}>You both said yes to each other.</Text>
        </Animated.View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Actions */}
        <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.matchActions}>
          <TouchableOpacity
            style={styles.matchChatBtn}
            onPress={onChat}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Start chatting"
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="#C044FF" />
            <Text style={styles.matchChatBtnText}>Start Chatting</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onLater} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.matchLaterText}>Maybe later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Step 14b: NO_MATCH ───────────────────────────────────────────────────────

function NoMatchStep({
  flow,
  onExplore,
  onBack,
}: {
  flow: ReturnType<typeof useParticipantFlow>;
  onExplore: () => void;
  onBack: () => void;
}) {
  const { colors: th } = useTheme();
  const fd = flow.session?.final_decision;
  const isExpired = fd?.outcome === 'EXPIRED';

  return (
    <FlowScaffold title="Blind Date Ended" onBack={onBack}>
      <View style={styles.eliminatedWrap}>
        <View style={styles.eliminatedIcon}>
          <Ionicons name="heart-dislike-outline" size={52} color={bdColors.slate} />
        </View>
        <Text style={[styles.eliminatedTitle, { color: th.text }]}>
          {isExpired ? 'The window closed' : 'No match this time'}
        </Text>
        <Text style={[styles.eliminatedSub, { color: th.textSecondary }]}>
          {isExpired
            ? 'The decision window expired before both sides responded.'
            : 'The journey ends here — but there are more Blind Dates waiting.'}
        </Text>
        <View style={[styles.eliminatedDivider, { backgroundColor: th.border }]} />
        <View style={styles.eliminatedActions}>
          <PrimaryButton label="Explore More Blind Dates" icon="compass-outline" onPress={onExplore} />
        </View>
      </View>
    </FlowScaffold>
  );
}

// ─── Root Screen ─────────────────────────────────────────────────────────────

export default function ParticipantFlowScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string;
    participantId?: string;
    /** '1' when navigating here immediately after a successful join from the home screen. */
    joined?: string;
  }>();
  const router = useRouter();
  const sessionId = params.sessionId ?? null;

  // localParticipantId starts as the route param, updated after join
  const [localParticipantId, setLocalParticipantId] = useState<string | null>(
    params.participantId ?? null,
  );

  // Show the "You're in!" celebration screen when the user just joined
  const [showWelcome, setShowWelcome] = useState(params.joined === '1');

  const flow = useParticipantFlow(sessionId, localParticipantId);
  const { configuration } = useBlindDateConfiguration();
  const maxRounds = configuration?.limits?.max_rounds ?? null;
  const step = flow.step;

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/blind-date' as never);
  }, [router]);
  /** Navigate to the blind-date home screen on the Joined tab. */
  const goJoined = useCallback(
    () =>
      router.replace({
        pathname: '/(app)/blind-date' as never,
        params: { tab: 'participating' },
      }),
    [router],
  );
  /** Navigate to the blind-date home screen on the Explore (swipe) tab. */
  const goExplore = useCallback(
    () => router.replace('/(app)/blind-date' as never),
    [router],
  );

  const handleJoined = useCallback((res: BlindDateJoinResponseDto) => {
    setLocalParticipantId(res.participant_id);
    setShowWelcome(true); // show the "You're in!" screen after joining from within the screen
  }, []);

  const handleRevealComplete = useCallback(() => {
    flow.finishCountdown();
  }, [flow]);

  // Steps that get the shared bottom nav (post-join celebration and the
  // immersive full-screen moments are excluded). Also hidden while the
  // keyboard is open so it doesn't compress the answering viewport.
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const showNav =
    !showWelcome && !keyboardShown && step !== 'REVEAL_COUNTDOWN' && step !== 'MATCH';

  const navBar = showNav ? (
    <BlindDateBottomNav
      activeTab="participating"
      onHome={() => router.replace('/(app)/(tabs)' as never)}
      onExplore={goExplore}
      onMine={() =>
        router.replace({
          pathname: '/(app)/blind-date' as never,
          params: { tab: 'mine' },
        })
      }
      onJoined={goJoined}
      onProfile={() => router.push('/(app)/(tabs)/profile' as never)}
    />
  ) : null;

  const renderStep = () => {
    switch (step) {
      case 'JOIN_CONFIRM':
        return (
          <JoinConfirmStep
            flow={flow}
            sessionId={sessionId ?? ''}
            onJoined={handleJoined}
            onBack={goBack}
          />
        );
      case 'ROUND_INTRO': // fallthrough — deriveStep no longer returns this, kept for safety
      case 'ANSWERING':
        return <AnsweringStep flow={flow} onBack={goBack} onWithdrawn={goJoined} />;
      case 'ROUND_COMPLETE':
        return (
          <RoundCompleteStep
            flow={flow}
            onBack={() => {
              flow.acknowledgeRoundComplete();
              goBack();
            }}
          />
        );
      case 'WAITING':
        return (
          <WaitingStep
            flow={flow}
            onBack={goBack}
            onWithdrawn={goJoined}
            onEditAnswers={flow.beginEditingAnswers}
          />
        );
      case 'ADVANCED':
        return <AdvancedStep flow={flow} onContinue={flow.markAdvancedSeen} />;
      case 'ELIMINATED':
        return <EliminatedStep flow={flow} onExplore={goExplore} onBack={goBack} />;
      case 'FINALIST':
        return <FinalistStep flow={flow} onReveal={() => flow.markFinalistSeen()} />;
      case 'REVEAL_INTRO':
        return (
          <RevealIntroStep
            flow={flow}
            onReveal={() => flow.startReveal()}
            onBack={goBack}
          />
        );
      case 'REVEAL_COUNTDOWN':
        return <RevealCountdownStep onDone={handleRevealComplete} />;
      case 'REVEAL_PROFILE':
        return (
          <RevealProfileStep
            flow={flow}
            onDecide={() => flow.beginDecision()}
            onBack={goBack}
          />
        );
      case 'FINAL_DECISION':
        return <FinalDecisionStep flow={flow} onBack={goBack} />;
      case 'WAITING_DECISION':
        return <WaitingDecisionStep flow={flow} onBack={goBack} />;
      case 'MATCH':
        return (
          <MatchStep
            flow={flow}
            onChat={() => {
              const matchId = flow.session?.final_decision?.match_id;
              router.push({ pathname: '/(app)/chat' as never, params: { matchId } });
            }}
            onLater={goJoined}
          />
        );
      case 'NO_MATCH':
        return <NoMatchStep flow={flow} onExplore={goExplore} onBack={goBack} />;
      default:
        return (
          <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={bdColors.primary} size="large" />
          </View>
        );
    }
  };

  // "You're in!" celebration screen — shown immediately after joining
  if (showWelcome) {
    return (
      <YouAreInStep
        maxRounds={maxRounds}
        onBegin={() => setShowWelcome(false)}
        onBack={goBack}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{renderStep()}</View>
      {navBar}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fullScreen: { flex: 1 },
  fullScreenGradient: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 22, paddingBottom: 44 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },

  // Hero banner
  heroBanner: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: bdColors.primary,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 26,
    marginTop: 22,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  ghostBtn: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 8,
  },
  ghostBtnText: { fontSize: 15, fontWeight: '600' },

  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  infoChipText: { fontSize: 13, fontWeight: '600' },

  // Bullets
  bulletCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
    gap: 14,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  bulletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFE7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletText: { flex: 1, fontSize: 14.5, lineHeight: 21 },

  // Question preview (JOIN_CONFIRM)
  previewHeading: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },
  previewRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  previewNum: { fontSize: 15, fontWeight: '800', width: 20 },
  previewText: { flex: 1, fontSize: 14.5, lineHeight: 21 },

  // Cost
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginBottom: 4,
  },
  costText: { fontSize: 14, fontWeight: '600' },

  // Error
  errorText: { fontSize: 14, marginTop: 8, marginBottom: 4 },

  // JOIN_CONFIRM
  joinHeroWrap: {
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  joinHeroGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  joinHeroOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  joinLockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  joinLockText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  joinHeroTitle: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  joinHeroSub: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 5 },

  // ANSWERING — merged round intro + question (screens 3 & 8 reference)
  ansThemeWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
    gap: 6,
  },
  ansThemeName: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  ansThemeSub: {
    fontSize: 14.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  ansQDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  questionDot: { height: 8, borderRadius: 4 },
  questionNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingRight: 8,
  },
  prevBtnText: { fontSize: 14, fontWeight: '600' },
  prevBtnSpacer: { width: 76 },
  questionCounter: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  ansQCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 26,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ansQQuote: {
    position: 'absolute',
    top: -18,
    left: 12,
    fontSize: 96,
    fontWeight: '900',
    lineHeight: 96,
    opacity: 1,
  },
  ansQText: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 32,
    textAlign: 'center',
    paddingTop: 16,
  },
  ansInput: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 18,
    minHeight: 140,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
  },
  answerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: { fontSize: 12, fontWeight: '700' },
  charCount: { fontSize: 12, textAlign: 'right', marginTop: 2 },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  lockedText: { fontSize: 13, fontWeight: '600', flex: 1 },
  hintText: { fontSize: 13.5, textAlign: 'center', marginTop: 14, lineHeight: 19 },

  // ROUND_COMPLETE / shared celebration
  celebrationContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  // ROUND_COMPLETE (screen 4)
  rcScreen: { flex: 1 },
  rcConfetti: { position: 'absolute', borderRadius: 2 },
  rcContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  rcHeartOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginTop: 20,
    marginBottom: 18,
    shadowColor: bdColors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  rcHeartOrbInner: {
    flex: 1,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rcTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  rcSub: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  rcCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  rcCardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  rcStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rcStepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: bdColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rcStepText: { flex: 1, fontSize: 14.5, lineHeight: 21 },

  // shared celebration
  trophyCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  crownCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  celebrationTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  celebrationSub: {
    fontSize: 16.5,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  celebrationBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  celebrationSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  roundUnlockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginTop: 16,
  },
  roundUnlockedText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  nextRoundCard: {
    backgroundColor: 'rgba(138,44,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  nextRoundTitle: { fontSize: 22, fontWeight: '800', color: bdColors.primary },
  nextRoundSub: { fontSize: 15, color: bdColors.primary, marginTop: 4 },

  // WAITING
  waitingHero: { flex: 1 },
  waitingGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  waitingHourglass: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  waitingTitle: { fontSize: 30, fontWeight: '900', color: '#FFF', textAlign: 'center', marginBottom: 12 },
  waitingSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24 },
  waitingCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 20,
    marginTop: -20,
    padding: 18,
    gap: 14,
  },
  waitingInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waitingInfoText: { fontSize: 13 },
  waitingTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 11,
  },
  waitingTipText: { fontSize: 13, fontWeight: '600', flex: 1 },
  waitingFooter: { padding: 20 },

  // ELIMINATED / NO_MATCH
  eliminatedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  // Same hero content as eliminatedWrap, but without the full-screen centering
  // — this step has round-answer sections below it, so the hero just sits at
  // the top of the scroll content instead of vertically centering itself.
  endedHero: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  eliminatedIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(138,147,166,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  eliminatedTitle: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  eliminatedSub: { fontSize: 15.5, textAlign: 'center', lineHeight: 24 },
  eliminatedDivider: { height: StyleSheet.hairlineWidth, width: '100%', marginVertical: 24 },
  eliminatedActions: { width: '100%', gap: 4 },

  // MY ANSWERS (ended screen) — one card per round, styled like the
  // creator's results screen so both sides read the same "round recap".
  myRoundCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
    gap: 14,
  },
  myRoundHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  myRoundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  myRoundBadgeText: { color: '#FFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  myRoundCount: { flex: 1, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  myAnswerRow: { gap: 7 },
  myAnswerQRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  myAnswerQBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 1 },
  myAnswerQBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },
  myAnswerQ: { flex: 1, fontSize: 14.5, fontWeight: '700', lineHeight: 20 },
  myAnswerBubble: {
    borderRadius: 14,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 4,
  },
  myAnswerA: { fontSize: 15, lineHeight: 21 },
  myAnswerPending: { fontStyle: 'italic' },

  // REVEAL_INTRO
  revealPhotoWrap: {
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  revealPhotoVeil: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(10,4,20,0.35)',
  },
  revealPhotoLock: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealIntroTitle: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  revealIntroSub: {
    fontSize: 15.5,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 16,
  },
  deadlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: 16,
  },
  deadlineText: { fontSize: 12, fontWeight: '700' },

  // REVEAL_COUNTDOWN
  countdownScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFF',
  },

  // REVEAL_PROFILE
  revealedPhotoWrap: {
    height: 280,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealedInfo: { alignItems: 'center', marginBottom: 12 },
  revealedName: { fontSize: 28, fontWeight: '900' },
  revealedMeta: { fontSize: 15, marginTop: 5 },
  sharedBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  sharedItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sharedText: { fontSize: 14, flex: 1 },

  // FINAL_DECISION
  decisionTitle: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  decisionSub: { fontSize: 15.5, textAlign: 'center', marginBottom: 16 },
  decisionPhotoWrap: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  decisionPrivacy: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  decisionBtnRow: { gap: 10, marginTop: 8 },
  decisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  decisionBtnInterested: { backgroundColor: bdColors.primary },
  decisionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // WAITING_DECISION
  waitingDecisionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  lockCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EFE7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  waitingDecisionTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  waitingDecisionSub: { fontSize: 15.5, textAlign: 'center', lineHeight: 23, marginBottom: 16 },
  decidedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  decidedBadgeText: { fontSize: 12, fontWeight: '700' },

  // YOU ARE IN (screen 2)
  yaiScreen: {
    flex: 1,
  },
  yaiHeartDeco: {
    position: 'absolute',
  },
  yaiNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  yaiScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 32,
    paddingTop: 16,
  },
  yaiArt: {
    width: 150,
    height: 150,
    marginBottom: 14,
  },
  yaiTitle: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  yaiSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  yaiChecklist: {
    width: '100%',
    gap: 10,
    marginBottom: 22,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#8A2CFF',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  yaiCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yaiCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: bdColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yaiCheckLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  yaiBeginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: bdColors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    marginBottom: 12,
    shadowColor: bdColors.primary,
    shadowOpacity: 0.30,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  yaiBeginBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  yaiFooter: {
    fontSize: 12,
    textAlign: 'center',
  },

  // MATCH
  matchContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  matchGlowTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,200,240,0.18)',
    top: -80,
    alignSelf: 'center',
  },
  matchGlowBottom: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(120,80,255,0.22)',
    bottom: -60,
    alignSelf: 'center',
  },
  matchPhotosWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36,
  },
  matchPhotoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchPhotoRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  matchHeartBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF4FA3',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -18,
    zIndex: 2,
    shadowColor: '#FF4FA3',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  matchTextBlock: {
    alignItems: 'center',
    gap: 10,
  },
  matchedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  matchedPillText: {
    color: '#FFE066',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  matchTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 48,
  },
  matchSub: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 24,
  },
  matchActions: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  matchChatBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFF',
    borderRadius: 28,
    paddingVertical: 17,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  matchChatBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#C044FF',
  },
  matchLaterText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    paddingVertical: 4,
  },

  // Section divider
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 13, fontWeight: '700' },
  withdrawLink: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  withdrawLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editAnswersLink: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editAnswersText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
