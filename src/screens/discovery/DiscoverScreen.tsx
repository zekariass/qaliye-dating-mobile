import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import CardActionButtons from '@/components/discovery/CardActionButtons';
import CardStack, { CardStackHandle } from '@/components/discovery/CardStack';
import LocationFilterDropdown, { LocationFilter, locationFilterLabel } from '@/components/discovery/LocationFilterDropdown';
import MatchCelebrationOverlay from '@/components/discovery/MatchCelebrationOverlay';
import MorePhotosSection from '@/components/discovery/MorePhotosSection';
import { CardDto } from '@/components/discovery/ProfileCard';
import ProfileDetailsSection from '@/components/discovery/ProfileDetailsSection';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const { height: SCREEN_H } = Dimensions.get('window');
const HEADER_H = 56;
const TAB_BAR_PADDING = 18;
const TAB_BAR_H = 68;

// ---------------------------------------------------------------------------
// Mock data — replace with useDiscoveryProfiles hook when API is ready
// ---------------------------------------------------------------------------
const MOCK_CARDS: CardDto[] = [
  {
    user_id: '1',
    display_name: 'Leslie',
    age: 28,
    distance_km: 9,
    is_verified: true,
    relationship_intention: 'Looking casually',
    residency_type: 'Diaspora',
    city: 'Galway',
    country_name: 'Ireland',
    bio: 'Creative, warm-hearted, and always ready for a meaningful conversation. I love coffee, weekend walks, music, and discovering beautiful places.',
    gender: 'Female',
    height_cm: 168,
    ethnicity: 'Tigrinya',
    nationality: 'Ethiopian',
    religion: 'Orthodox Christian',
    education_level: "Bachelor's Degree",
    occupation: 'Product Designer',
    marital_status: 'Never Married',
    has_children: false,
    wants_children: true,
    smoking: false,
    drinking: false,
    photos: [
      { image_url: 'https://picsum.photos/seed/leslie1/480/800' },
      { image_url: 'https://picsum.photos/seed/leslie2/480/800' },
      { image_url: 'https://picsum.photos/seed/leslie3/480/800' },
      { image_url: 'https://picsum.photos/seed/leslie4/480/800' },
    ],
  },
  {
    user_id: '2',
    display_name: 'Mekdes',
    age: 26,
    distance_km: 3,
    is_verified: true,
    relationship_intention: 'Serious relationship',
    residency_type: 'Ethiopia',
    city: 'Addis Ababa',
    country_name: 'Ethiopia',
    bio: 'I enjoy quiet evenings, traditional food, and deep conversations. Looking for someone genuine to build a future with.',
    gender: 'Female',
    height_cm: 162,
    ethnicity: 'Amhara',
    nationality: 'Ethiopian',
    religion: 'Orthodox Christian',
    education_level: "Master's Degree",
    occupation: 'Nurse',
    marital_status: 'Never Married',
    has_children: false,
    wants_children: true,
    smoking: false,
    drinking: false,
    photos: [
      { image_url: 'https://picsum.photos/seed/mekdes1/480/800' },
      { image_url: 'https://picsum.photos/seed/mekdes2/480/800' },
      { image_url: 'https://picsum.photos/seed/mekdes3/480/800' },
    ],
  },
  {
    user_id: '3',
    display_name: 'Sara',
    age: 24,
    distance_km: 5,
    is_verified: false,
    relationship_intention: 'Open to dating',
    residency_type: 'Diaspora',
    city: 'London',
    country_name: 'UK',
    bio: 'Adventurous spirit who loves art, travel, and trying new cuisines. Currently studying and open to meaningful connections.',
    gender: 'Female',
    height_cm: 170,
    ethnicity: 'Oromo',
    nationality: 'Ethiopian',
    religion: 'Muslim',
    education_level: "Bachelor's Degree",
    occupation: 'Student',
    marital_status: 'Never Married',
    has_children: false,
    wants_children: true,
    smoking: false,
    drinking: false,
    photos: [
      { image_url: 'https://picsum.photos/seed/sara1/480/800' },
      { image_url: 'https://picsum.photos/seed/sara2/480/800' },
      { image_url: 'https://picsum.photos/seed/sara3/480/800' },
    ],
  },
  {
    user_id: '4',
    display_name: 'Hiwot',
    age: 27,
    distance_km: 1,
    is_verified: true,
    relationship_intention: 'Marriage',
    residency_type: 'Ethiopia',
    city: 'Addis Ababa',
    country_name: 'Ethiopia',
    bio: 'Family-oriented, kind and hardworking. I value honesty and loyalty above all else.',
    gender: 'Female',
    height_cm: 160,
    ethnicity: 'Gurage',
    nationality: 'Ethiopian',
    religion: 'Protestant',
    education_level: "Bachelor's Degree",
    occupation: 'Teacher',
    marital_status: 'Never Married',
    has_children: false,
    wants_children: true,
    smoking: false,
    drinking: false,
    photos: [
      { image_url: 'https://picsum.photos/seed/hiwot1/480/800' },
      { image_url: 'https://picsum.photos/seed/hiwot2/480/800' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Animated scroll-hint chevron
// ---------------------------------------------------------------------------
function ScrollHint({ color }: { color: string }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.scrollHint, animStyle]}>
      <Ionicons name="chevron-down" size={22} color={color} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { bottom: safeBottom } = useSafeAreaInsets();

  const cardStackRef    = useRef<CardStackHandle>(null);
  const scrollRef       = useRef<ScrollView>(null);
  const scrollY         = useRef(0);
  const dismissedRef    = useRef<{ card: CardDto; direction: 'LIKE' | 'PASS' }[]>([]);
  const isRewindingRef  = useRef(false);
  const [cards, setCards] = useState<CardDto[]>(MOCK_CARDS);
  const [dismissed, setDismissed] = useState<{ card: CardDto; direction: 'LIKE' | 'PASS' }[]>([]);
  const [rewindIncoming, setRewindIncoming] = useState<'LIKE' | 'PASS' | false>(false);
  const [matchVisible, setMatchVisible] = useState(false);
  const [matchName, setMatchName] = useState('');
  const [modeVisible, setModeVisible] = useState(false);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('NEARBY');

  // Keep ref in sync so async handlers always read latest dismissed
  useEffect(() => { dismissedRef.current = dismissed; }, [dismissed]);
  const router = useRouter();

  // Card area fills the viewport minus header, tab bar, and breathing room
  const TOTAL_TAB = TAB_BAR_PADDING + TAB_BAR_H + Math.max(safeBottom, 12);
  const CARD_AREA_H = SCREEN_H - HEADER_H - TOTAL_TAB - 12;

  const topCard = cards[0] ?? null;

  const handleSwipe = useCallback((direction: 'LIKE' | 'PASS', card: CardDto) => {
    setDismissed((prev) => [{ card, direction }, ...prev]);
    setCards((prev) => prev.filter((c) => c.user_id !== card.user_id));
    if (direction === 'LIKE' && Math.random() < 0.3) {
      setMatchName(card.display_name);
      setMatchVisible(true);
    }
  }, []);

  // Scroll to top and resolve. Skips the wait when already at top.
  const scrollToTop = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (scrollY.current <= 2) {
          resolve();
          return;
        }
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        setTimeout(resolve, 320);
      }),
    [],
  );

  const handleRewind = useCallback(async () => {
    if (dismissedRef.current.length === 0 || isRewindingRef.current) return;
    isRewindingRef.current = true;
    await scrollToTop();
    const current = dismissedRef.current;
    if (current.length === 0) { isRewindingRef.current = false; return; }
    const [last, ...rest] = current;
    dismissedRef.current = rest;
    setDismissed(rest);
    setRewindIncoming(last.direction);
    setCards((prev) => [last.card, ...prev]);
    setTimeout(() => {
      setRewindIncoming(false);
      isRewindingRef.current = false;
    }, 600);
  }, [scrollToTop]);

  const handlePass = useCallback(async () => {
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('PASS');
  }, [scrollToTop]);

  const handleLike = useCallback(async () => {
    await scrollToTop();
    cardStackRef.current?.triggerSwipe('LIKE');
  }, [scrollToTop]);

  const isEmpty = cards.length === 0;

  // Gradient-ring colours for avatar
  const ringOuter = isDark ? colors.primaryLight : colors.primary;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: th.background }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────── */}
      <View style={styles.header}>
        {/* Avatar with gradient-style ring */}
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityLabel={t('discovery.openProfile')}
        >
          <View style={[styles.avatarRing, { borderColor: ringOuter }]}>
            <Image
              source={{ uri: 'https://picsum.photos/seed/myavatar/100/100' }}
              style={styles.avatar}
            />
          </View>
        </TouchableOpacity>

        {/* Location filter pill */}
        <TouchableOpacity
          style={[styles.locationPill, { backgroundColor: isDark ? th.backgroundElement : 'transparent' }]}
          onPress={() => setModeVisible(true)}
          activeOpacity={0.7}
          accessibilityLabel={t('discovery.openLocationFilter')}
        >
          <Ionicons name="location" size={15} color={colors.primary} />
          <Text style={[styles.locationLabel, { color: th.text }]}>
            {locationFilterLabel(locationFilter, t)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={th.textSecondary} />
        </TouchableOpacity>

        {/* Settings / Preferences */}
        <TouchableOpacity
          style={[styles.settingsBtn, { borderColor: th.border, backgroundColor: isDark ? th.backgroundElement : th.surface }]}
          onPress={() => router.push('/(app)/preferences')}
          activeOpacity={0.7}
          accessibilityLabel={t('discovery.openPreferences')}
        >
          <Ionicons name="options-outline" size={21} color={th.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── Main content (scrollable + fixed buttons) ── */}
      <View style={styles.main}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: TOTAL_TAB + 8 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
          bounces
        >
          {/* Card zone — fixed height filling available space */}
          <View style={[styles.cardArea, { height: CARD_AREA_H }]}>
            {isEmpty ? (
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender }]}>
                  <Ionicons name="heart-dislike-outline" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: th.text }]}>
                  {t('discovery.noMoreProfiles')}
                </Text>
                <Text style={[styles.emptySubtitle, { color: th.textSecondary }]}>
                  {t('discovery.noMoreProfilesHint', { defaultValue: 'Try expanding your preferences or check back later for new people.' })}
                </Text>
                <TouchableOpacity
                  style={styles.emptyBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(app)/preferences')}
                >
                  <Ionicons name="options-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyBtnText}>{t('discovery.adjustPreferences')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <CardStack
                ref={cardStackRef}
                cards={cards}
                onSwipe={handleSwipe}
                animateTopCardIn={rewindIncoming}
              />
            )}
          </View>

          {/* Scroll-down hint */}
          {topCard && <ScrollHint color={th.textMuted} />}

          {/* Profile details — below card, visible when scrolling */}
          {topCard && (
            <>
              <ProfileDetailsSection card={topCard} />
              <MorePhotosSection photos={topCard.photos} />
            </>
          )}
        </ScrollView>

        {/* Fixed action buttons — float on the right edge over content */}
        {!isEmpty && (
          <View style={[styles.actionOverlay, { bottom: TOTAL_TAB + 8 }]}>
            <CardActionButtons
              onRewind={handleRewind}
              onPass={handlePass}
              onLike={handleLike}
            />
          </View>
        )}
      </View>

      {/* ── Overlays ───────────────────────────────── */}
      <MatchCelebrationOverlay
        visible={matchVisible}
        name={matchName}
        onSendMessage={() => setMatchVisible(false)}
        onKeepSwiping={() => setMatchVisible(false)}
      />
      <LocationFilterDropdown
        visible={modeVisible}
        current={locationFilter}
        onSelect={setLocationFilter}
        onClose={() => setModeVisible(false)}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: colors.primary,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },

  // ── Scroll / Main ───────────────────────────────────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  main: {
    flex: 1,
    position: 'relative',
  },

  // ── Card area ───────────────────────────────────────────────────────────
  cardArea: {
    marginHorizontal: 6,
    paddingVertical: 4,
  },
  actionOverlay: {
    position: 'absolute',
    right: 10,
    zIndex: 10,
  },

  // ── Scroll hint ─────────────────────────────────────────────────────────
  scrollHint: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 6,
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
