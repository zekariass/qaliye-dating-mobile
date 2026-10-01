import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    interpolateColor,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { BlindDateSessionSummaryDto } from '@/types/blindDate';
import {
    GENDER_API_TO_LABEL,
    RELATIONSHIP_API_TO_LABEL,
    RELIGION_API_TO_LABEL,
} from '@/utils/profileMappers';
import { translateProfileOption } from '@/utils/profileOptions';

const SCREEN_W = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 110;

// Warm, photographic "skin tone" palettes used to fake a blurred portrait
// when there is no real photo yet — varied per session so cards don't look
// identical. Combined with a native BlurView these read as an out-of-focus
// photo (soft color blending) rather than a flat illustration.
const PORTRAIT_PALETTES: [string, string, string][] = [
  ['#E8B48C', '#B97B57', '#5B3A2E'], // warm tan
  ['#D8A17E', '#8C5A3C', '#3E2A22'], // deep amber
  ['#C99A78', '#7A4B34', '#2E1F1B'], // umber
  ['#E3B79A', '#A16B4A', '#4A2F26'], // caramel
];

function paletteForSeed(seed: string): [string, string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PORTRAIT_PALETTES[Math.abs(hash) % PORTRAIT_PALETTES.length];
}

/**
 * Simulated blurred portrait — layered warm-toned blobs (head/shoulders
 * silhouette) passed through a native Gaussian blur (`expo-blur`). Used only
 * when the creator has no real photo yet, so the card still reads as "a
 * photo of a real person, heavily blurred" rather than an abstract graphic.
 */
export function BlurredPortraitFallback({ seed }: { seed: string }) {
  const [skin, hair, bg] = paletteForSeed(seed);
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[bg, '#1B120E']} style={StyleSheet.absoluteFill} />
      {/* Shoulders */}
      <View style={[styles.portraitShoulders, { backgroundColor: skin }]} />
      {/* Head */}
      <View style={[styles.portraitHead, { backgroundColor: skin }]} />
      {/* Hair */}
      <View style={[styles.portraitHair, { backgroundColor: hair }]} />
      {/* Native blur pass — this is what makes it read as a photo, not a graphic */}
      <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
    </View>
  );
}

export type SessionSwipeDirection = 'left' | 'right'; // left = pass, right = join intent

export interface SessionSwipeCardHandle {
  /** Programmatically fling the card off-screen (action buttons). */
  swipeOut: (direction: SessionSwipeDirection) => void;
  /** Animate the card back to center after a cancelled fly-off. */
  reset: () => void;
}

function toTitleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  session: BlindDateSessionSummaryDto;
  isTop: boolean;
  /** 0 = front, 1 = directly behind, 2 = back of the visible stack. */
  depth: number;
  /** Resolved display name for session.language_code (e.g. "English"). */
  languageName: string | null;
  /** Signed-in viewer's country — decides whether city or country is shown. */
  viewerCountry: string | null;
  /** Called after the card finishes flying off-screen. */
  onDismiss: (direction: SessionSwipeDirection, session: BlindDateSessionSummaryDto) => void;
}

const SessionSwipeCard = forwardRef<SessionSwipeCardHandle, Props>(
  function SessionSwipeCard(
    {
      session,
      isTop,
      depth,
      languageName,
      viewerCountry,
      onDismiss,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const depthSV = useSharedValue(depth);

    // Animate stack depth changes (card behind → front) without re-mounting.
    useEffect(() => {
      depthSV.value = withTiming(depth, { duration: 220, easing: Easing.out(Easing.cubic) });
    }, [depth, depthSV]);

    // NOTE: react-hooks/immutability (React Compiler's static mutation
    // analysis) doesn't understand Reanimated's worklet model and flags every
    // `sharedValue.value = ...` assignment below as an illegal mutation —
    // this is a known Reanimated/React-Compiler friction point, not an actual
    // bug (see e.g. software-mansion/react-native-reanimated#6688). The same
    // pattern already exists elsewhere in this codebase (e.g. BrowseModeGrid,
    // SplashScreen); suppressing per-line here rather than silently diverging.

    const flyOff = (direction: SessionSwipeDirection, duration = 280) => {
      translateX.value = withTiming(
        direction === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5,
        { duration },
        (finished) => {
          'worklet';
          if (finished) scheduleOnRN(onDismiss, direction, session);
        },
      );
    };

    useImperativeHandle(ref, () => ({
      swipeOut(direction: SessionSwipeDirection) {
        flyOff(direction, 300);
      },
      reset() {
        translateX.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) });
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps -- flyOff closes over stable shared values/session; recreating it every render is fine, just avoid an unstable extra dep
    }), [onDismiss, session]);

    const joinOpacity = useDerivedValue(() =>
      Math.max(0, Math.min(1, translateX.value / SWIPE_THRESHOLD)),
    );
    const passOpacity = useDerivedValue(() =>
      Math.max(0, Math.min(1, -translateX.value / SWIPE_THRESHOLD)),
    );

    const panGesture = Gesture.Pan()
      .enabled(isTop)
      .activeOffsetX([-14, 14])
      .failOffsetY([-20, 20])
      .onUpdate((e) => {
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation, not a React state mutation
        translateX.value = e.translationX;
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation, not a React state mutation
        translateY.value = e.translationY * 0.35;
      })
      .onEnd((e) => {
        const beyond =
          Math.abs(e.translationX) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > 900;
        if (beyond) {
          const direction = e.translationX >= 0 ? 'right' : 'left';
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation, not a React state mutation
          translateX.value = withTiming(
            direction === 'right' ? SCREEN_W * 1.5 : -SCREEN_W * 1.5,
            { duration: 280 },
            (finished) => {
              'worklet';
              if (finished) scheduleOnRN(onDismiss, direction, session);
            },
          );
        } else {
          translateX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value mutation, not a React state mutation
          translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
        }
      });

    const cardStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        // Subtle tilt while dragging + depth-based scale for behind cards
        { rotateZ: `${translateX.value / 28}deg` },
        { scale: 1 - depthSV.value * 0.05 },
        { translateY: depthSV.value * 14 },
      ],
      opacity: 1 - depthSV.value * 0.25,
    }));

    const borderStyle = useAnimatedStyle(() => {
      const x = translateX.value;
      const borderColor = interpolateColor(
        x,
        [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
        ['rgba(239,68,68,0.9)', 'rgba(0,0,0,0)', 'rgba(138,44,255,0.9)'],
      );
      const borderWidth = Math.max(0, Math.min(4, (Math.abs(x) / SWIPE_THRESHOLD) * 4));
      return { borderColor, borderWidth };
    });

    const joinStampStyle = useAnimatedStyle(() => ({
      opacity: joinOpacity.value,
      transform: [{ rotateZ: '-14deg' }],
    }));
    const passStampStyle = useAnimatedStyle(() => ({
      opacity: passOpacity.value,
      transform: [{ rotateZ: '14deg' }],
    }));

    // ── Content data (all optional fields render only when present) ──────────
    const creator = session.creator ?? null;

    // City + country are both safe discovery fields in the creator payload.
    // Same-country viewers see only the city; everyone else sees only the country.
    const sameCountry = !!viewerCountry && creator?.country === viewerCountry;
    const locationText = sameCountry
      ? creator?.city ?? creator?.country ?? null
      : creator?.country ?? null;

    const chips: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [];
    if (creator?.gender) {
      chips.push({
        icon: 'male-female-outline',
        label: translateProfileOption(GENDER_API_TO_LABEL[creator.gender] ?? toTitleCase(creator.gender), t),
      });
    }
    if (creator?.relationship_intention) {
      chips.push({
        icon: 'heart-outline',
        label: translateProfileOption(RELATIONSHIP_API_TO_LABEL[creator.relationship_intention] ?? toTitleCase(creator.relationship_intention), t),
      });
    }
    if (creator?.religion) {
      chips.push({
        icon: 'flower-outline',
        label: translateProfileOption(RELIGION_API_TO_LABEL[creator.religion] ?? toTitleCase(creator.religion), t),
      });
    }
    if (languageName) {
      chips.push({ icon: 'globe-outline', label: languageName });
    }

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle, borderStyle]}>
          {/* ── Background: heavily blurred photo ─────────────────────────── */}
          {creator?.primary_photo?.signed_url ? (
            <Image
              source={{ uri: creator.primary_photo.signed_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              blurRadius={100}
              cachePolicy="memory-disk"
            />
          ) : (
            <BlurredPortraitFallback seed={session.id} />
          )}
          {/* Anonymity veil over the whole photo */}
          <View style={styles.veil} />

          {/* ── Top badges ────────────────────────────────────────────────── */}
          <View style={styles.topRow}>
            <View style={styles.openBadge}>
              <View style={styles.openDot} />
              <Text style={styles.badgeText}>{t('blindDate.swipe.openBadge')}</Text>
            </View>
          </View>

          {/* ── Swipe stamps ──────────────────────────────────────────────── */}
          <Animated.View style={[styles.stamp, styles.stampJoin, joinStampStyle]}>
            <Text style={styles.stampTextJoin}>{t('blindDate.swipe.join')}</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampPass, passStampStyle]}>
            <Text style={styles.stampTextPass}>{t('blindDate.swipe.pass')}</Text>
          </Animated.View>

          {/* ── Bottom info + actions over gradient ───────────────────────── */}
          <LinearGradient
            colors={['rgba(8,4,18,0)', 'rgba(8,4,18,0.55)', 'rgba(8,4,18,0.92)']}
            locations={[0, 0.4, 1]}
            style={styles.bottomGradient}
          >
            {/* Anonymous identity block */}
            {creator?.age != null && (
              <Text style={styles.ageText}>
                {t('blindDate.swipe.age', { age: creator.age })}
              </Text>
            )}
            {locationText ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color="#FFF" />
                <Text style={styles.locationText}>{locationText}</Text>
              </View>
            ) : null}

            {chips.length > 0 && (
              <View style={styles.chipRow}>
                {chips.map((chip) => (
                  <View key={chip.label} style={styles.chip}>
                    <Ionicons name={chip.icon} size={11} color="#FFF" />
                    <Text style={styles.chipText}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            )}


          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    );
  },
);

export default SessionSwipeCard;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#2A1548',
    shadowColor: '#1B1C32',
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  veil: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(20,8,40,0.55)',
  },
  portraitShoulders: {
    position: 'absolute',
    bottom: '-8%',
    left: '5%',
    right: '5%',
    height: '42%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  portraitHead: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    width: '42%',
    aspectRatio: 1,
    borderRadius: 999,
  },
  portraitHair: {
    position: 'absolute',
    top: '12%',
    alignSelf: 'center',
    width: '46%',
    height: '20%',
    borderTopLeftRadius: 999,
    borderTopRightRadius: 999,
  },
  topRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34,197,94,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(134,239,172,0.55)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  stamp: {
    position: 'absolute',
    top: 54,
    borderWidth: 4,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stampJoin: { left: 18, borderColor: '#B67CFF', backgroundColor: 'rgba(138,44,255,0.22)' },
  stampPass: { right: 18, borderColor: '#B0B7C6', backgroundColor: 'rgba(138,147,166,0.25)' },
  stampTextJoin: {
    color: '#C79BFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  stampTextPass: {
    color: '#B0B7C6',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    paddingBottom: 28,
    paddingTop: 80,
  },
  ageText: {
    color: '#FFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chipText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

});
