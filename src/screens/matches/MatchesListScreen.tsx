import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Match = {
  id: string;
  name: string;
  age: number;
  location: string;
  distance: string;
  intention: string;
  image: string;
  verified: boolean;
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    name: 'Emma',
    age: 24,
    location: 'Ireland, Dublin',
    distance: '4 km',
    intention: 'Long-term relationship',
    image: 'https://randomuser.me/api/portraits/women/1.jpg',
    verified: true,
  },
  {
    id: '2',
    name: 'Liam',
    age: 27,
    location: 'Ireland, Galway',
    distance: '8 km',
    intention: 'Serious relationship',
    image: 'https://randomuser.me/api/portraits/men/1.jpg',
    verified: true,
  },
  {
    id: '3',
    name: 'Sophie',
    age: 26,
    location: 'Ireland, Cork',
    distance: '15 km',
    intention: 'Open to dating',
    image: 'https://randomuser.me/api/portraits/women/2.jpg',
    verified: true,
  },
  {
    id: '4',
    name: 'Noah',
    age: 29,
    location: 'Ireland, Limerick',
    distance: '22 km',
    intention: 'Casual, see where it goes',
    image: 'https://randomuser.me/api/portraits/men/2.jpg',
    verified: true,
  },
  {
    id: '5',
    name: 'Aoife',
    age: 23,
    location: 'Ireland, Kilkenny',
    distance: '5 km',
    intention: 'Long-term relationship',
    image: 'https://randomuser.me/api/portraits/women/3.jpg',
    verified: true,
  },
  {
    id: '6',
    name: 'Conor',
    age: 31,
    location: 'Ireland, Waterford',
    distance: '11 km',
    intention: 'Open to dating',
    image: 'https://randomuser.me/api/portraits/men/3.jpg',
    verified: false,
  },
  {
    id: '7',
    name: 'Niamh',
    age: 25,
    location: 'Ireland, Sligo',
    distance: '7 km',
    intention: 'Serious relationship',
    image: 'https://randomuser.me/api/portraits/women/4.jpg',
    verified: true,
  },
  {
    id: '8',
    name: 'Finn',
    age: 28,
    location: 'Ireland, Wexford',
    distance: '19 km',
    intention: 'Casual, see where it goes',
    image: 'https://randomuser.me/api/portraits/men/4.jpg',
    verified: false,
  },
  {
    id: '9',
    name: 'Ciara',
    age: 22,
    location: 'Ireland, Tralee',
    distance: '3 km',
    intention: 'Long-term relationship',
    image: 'https://randomuser.me/api/portraits/women/5.jpg',
    verified: true,
  },
  {
    id: '10',
    name: 'Donal',
    age: 33,
    location: 'Ireland, Athlone',
    distance: '26 km',
    intention: 'Open to dating',
    image: 'https://randomuser.me/api/portraits/men/5.jpg',
    verified: true,
  },
  {
    id: '11',
    name: 'Roisin',
    age: 27,
    location: 'Ireland, Derry',
    distance: '14 km',
    intention: 'Serious relationship',
    image: 'https://randomuser.me/api/portraits/women/6.jpg',
    verified: true,
  },
  {
    id: '12',
    name: 'Tadhg',
    age: 30,
    location: 'Ireland, Ennis',
    distance: '9 km',
    intention: 'Casual, see where it goes',
    image: 'https://randomuser.me/api/portraits/men/6.jpg',
    verified: false,
  },
];

// ─── Layout ──────────────────────────────────────────────────────────────────

const SCREEN_W  = Dimensions.get('window').width;
const OUTER_PAD = 16;
const COL_GAP   = 12;
const CARD_W    = Math.floor((SCREEN_W - OUTER_PAD * 2 - COL_GAP) / 2);
const IMG_H     = Math.round(CARD_W * 1.15);
const ROW_GAP   = 14;

// ─── Platform shadows ────────────────────────────────────────────────────────

function getCardShadow(isDark: boolean) {
  return Platform.select({
    ios: {
      shadowColor: isDark ? '#000' : colors.primary,
      shadowOpacity: isDark ? 0.25 : 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: isDark ? 6 : 4 },
    default: {},
  });
}

const MSG_BTN_SHADOW = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  android: { elevation: 8 },
  default: {},
});

// ─── MatchesHeader ──────────────────────────────────────────────────────────

function MatchesHeader({ count }: { count: number }) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={headerStyles.container}>
      <View style={headerStyles.titleRow}>
        <Ionicons name="heart-circle" size={30} color={colors.primary} />
        <Text style={[headerStyles.title, { color: th.text }]}>Matches</Text>
        <View
          style={[
            headerStyles.badge,
            { backgroundColor: isDark ? '#2E1F50' : colors.backgroundLavender },
          ]}
        >
          <Text style={[headerStyles.badgeText, { color: colors.primary }]}>
            {count}
          </Text>
        </View>
      </View>
      <Text style={[headerStyles.subtitle, { color: th.textSecondary }]}>
        People who liked you back
      </Text>
    </Animated.View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    marginBottom:  4,
  },
  title: {
    fontSize:      26,
    fontWeight:    '800',
    letterSpacing: -0.5,
  },
  badge: {
    borderRadius:      radius.full,
    paddingHorizontal: 10,
    paddingVertical:   3,
  },
  badgeText: {
    fontSize:   13,
    fontWeight: '700',
  },
  subtitle: {
    fontSize:   13,
    marginLeft: 38,
  },
});

// ─── MatchCard ──────────────────────────────────────────────────────────────

interface MatchCardProps {
  item:           Match;
  index:          number;
  onPress:        () => void;
  onMessagePress: () => void;
}

const MatchCard = React.memo(function MatchCard({
  item,
  index,
  onPress,
  onMessagePress,
}: MatchCardProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const chipBg = isDark ? '#2E1F50' : colors.backgroundLavender;
  const enterDelay = Math.min(index * 60, 360);

  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: th.surface }, getCardShadow(isDark)]}
        onPress={onPress}
        activeOpacity={0.92}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.name}'s profile`}
      >
        {/* ── Portrait image ── */}
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />

          {/* Floating message button */}
          <TouchableOpacity
            style={[styles.msgBtn, MSG_BTN_SHADOW]}
            onPress={onMessagePress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Message ${item.name}`}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ── Info section ── */}
        <View style={styles.cardInfo}>

          {/* Name + verified badge */}
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: th.text }]} numberOfLines={1}>
              {item.name}, {item.age}
            </Text>
            {item.verified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.verifiedBlue}
                style={styles.verifiedIcon}
              />
            )}
          </View>

          {/* Location + distance */}
          <View style={styles.locationRow}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Text style={[styles.locationText, { color: th.textSecondary }]} numberOfLines={1}>
              {item.location}
            </Text>
            <View
              style={[
                styles.distancePill,
                { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender },
              ]}
            >
              <Text style={[styles.distanceText, { color: colors.primary }]}>
                {item.distance}
              </Text>
            </View>
          </View>

          {/* Intention chip */}
          <View style={[styles.chip, { backgroundColor: chipBg }]}>
            <Ionicons name="heart" size={11} color={colors.heartPink} />
            <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
              {item.intention}
            </Text>
          </View>

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── EmptyState ─────────────────────────────────────────────────────────────

function EmptyState() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={emptyStyles.wrap}>
      <View
        style={[
          emptyStyles.iconCircle,
          { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender },
        ]}
      >
        <Ionicons name="heart-dislike-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[emptyStyles.title, { color: th.text }]}>No matches yet</Text>
      <Text style={[emptyStyles.subtitle, { color: th.textSecondary }]}>
        Keep swiping to find your perfect match.{'\n'}We'll notify you when
        someone likes you back!
      </Text>
    </Animated.View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap: {
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.xxxl,
    gap:               14,
  },
  iconCircle: {
    width:          96,
    height:         96,
    borderRadius:   48,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   8,
  },
  title: {
    fontSize:      22,
    fontWeight:    '800',
    textAlign:     'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize:   14,
    textAlign:  'center',
    lineHeight: 20,
  },
});

// ─── MatchesListScreen ────────────────────────────────────────────────────────

export default function MatchesListScreen() {
  const insets = useSafeAreaInsets();
  const { colors: th } = useTheme();
  const router = useRouter();

  const handleCardPress = useCallback(
    (_id: string) => router.push('/(app)/user-profile' as any),
    [router],
  );

  const handleMessagePress = useCallback(
    (id: string) => console.log('Message', id),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Match; index: number }) => (
      <MatchCard
        item={item}
        index={index}
        onPress={() => handleCardPress(item.id)}
        onMessagePress={() => handleMessagePress(item.id)}
      />
    ),
    [handleCardPress, handleMessagePress],
  );

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <FlatList
        data={MOCK_MATCHES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop:    insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 16) + 120,
          },
        ]}
        ListHeaderComponent={<MatchesHeader count={MOCK_MATCHES.length} />}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: OUTER_PAD,
  },

  columnWrapper: {
    gap:          COL_GAP,
    marginBottom: ROW_GAP,
  },

  // ── Card shell ──────────────────────────────────────────────────────────────
  card: {
    width:        CARD_W,
    borderRadius: radius.md,
  },

  imageWrap: {
    width:                CARD_W,
    height:               IMG_H,
    borderTopLeftRadius:  radius.md,
    borderTopRightRadius: radius.md,
    overflow:             'hidden',
  },

  cardImage: {
    width:  CARD_W,
    height: IMG_H,
  },

  msgBtn: {
    position:        'absolute',
    top:             10,
    right:           10,
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: colors.primary,
    borderWidth:     2.5,
    borderColor:     '#FFF',
    alignItems:      'center',
    justifyContent:  'center',
  },

  // ── Card info ───────────────────────────────────────────────────────────────
  cardInfo: {
    paddingHorizontal: 12,
    paddingTop:        10,
    paddingBottom:     13,
    gap:               6,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  nameText: {
    fontSize:   16,
    fontWeight: '700',
    flexShrink: 1,
  },

  verifiedIcon: {
    marginLeft: 4,
    flexShrink: 0,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           3,
  },

  locationText: {
    fontSize:   12,
    flex:       1,
    marginLeft: 2,
  },

  distancePill: {
    borderRadius:      radius.full,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },

  distanceText: {
    fontSize:   11,
    fontWeight: '600',
    flexShrink: 0,
  },

  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    borderRadius:      radius.full,
    paddingHorizontal: 9,
    paddingVertical:   5,
    gap:               4,
    maxWidth:          '100%',
  },

  chipText: {
    fontSize:   11,
    fontWeight: '600',
    flexShrink: 1,
  },
});
