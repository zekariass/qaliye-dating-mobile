import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { LikeProfile, RECEIVED_LIKES, SENT_LIKES } from './likesData';

// ─── Layout constants (identical to MatchesListScreen) ────────────────────────
// NOTE: useWindowDimensions causes a runtime error in this RN version.

const SCREEN_W  = Dimensions.get('window').width;
const OUTER_PAD = 10;
const COL_GAP   = 16;
const CARD_W    = Math.floor((SCREEN_W - OUTER_PAD * 2 - COL_GAP) / 2);
const CARD_H    = Math.round(CARD_W * 1.70);
const IMG_H     = Math.round(CARD_H * 0.60);
const ROW_GAP   = 20;

type Tab = 'received' | 'sent';

// ─── Theme helper (mirrors MatchesListScreen's useMatchesTheme) ───────────────

function useLikesTheme() {
  const { colors: th } = useTheme();
  const isDark = th.background === '#0D0712';
  return {
    bg:          th.background,
    card:        th.surface,
    textPrimary: th.text,
    textMuted:   th.textSecondary,
    purple:      colors.primary,           // '#8A2CFF'
    chipBg:      isDark ? '#2E1F50' : '#F2E7FF',
    segBg:       isDark ? th.backgroundElement : '#EEE6FF',
    segActiveBg: th.surface,
    segBorder:   isDark ? '#3D2A6E' : '#DDD0FA',
  };
}

// ─── Platform shadows (identical to MatchesListScreen) ────────────────────────

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

const overlayBtnShadow = Platform.select({
  ios: {
    shadowColor:   '#000000',
    shadowOpacity: 0.16,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 2 },
  },
  android: { elevation: 6 },
  default: {},
});

// ─── SegmentedControl ─────────────────────────────────────────────────────────

interface SegmentedControlProps {
  active:   Tab;
  onChange: (tab: Tab) => void;
}

function SegmentedControl({ active, onChange }: SegmentedControlProps) {
  const { textMuted, purple, segBg, segActiveBg, segBorder } = useLikesTheme();

  const isReceived = active === 'received';
  const isSent     = active === 'sent';

  return (
    <View style={[segStyles.container, { backgroundColor: segBg, borderColor: segBorder }]}>

      {/* ── Received Likes ── */}
      <TouchableOpacity
        style={[segStyles.tab, isReceived && [segStyles.tabActive, { backgroundColor: segActiveBg }]]}
        onPress={() => onChange('received')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: isReceived }}
        accessibilityLabel="Received Likes"
      >
        <Ionicons
          name={isReceived ? 'heart' : 'heart-outline'}
          size={15}
          color={isReceived ? purple : textMuted}
        />
        <Text style={[segStyles.tabText, { color: isReceived ? purple : textMuted }, isReceived && segStyles.tabTextActive]}>
          Received Likes
        </Text>
        {isReceived && <View style={[segStyles.activeBar, { backgroundColor: purple }]} />}
      </TouchableOpacity>

      {/* ── Sent Likes ── */}
      <TouchableOpacity
        style={[segStyles.tab, isSent && [segStyles.tabActive, { backgroundColor: segActiveBg }]]}
        onPress={() => onChange('sent')}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: isSent }}
        accessibilityLabel="Sent Likes"
      >
        <Ionicons
          name={isSent ? 'paper-plane' : 'paper-plane-outline'}
          size={15}
          color={isSent ? purple : textMuted}
        />
        <Text style={[segStyles.tabText, { color: isSent ? purple : textMuted }, isSent && segStyles.tabTextActive]}>
          Sent Likes
        </Text>
        {isSent && <View style={[segStyles.activeBar, { backgroundColor: purple }]} />}
      </TouchableOpacity>

    </View>
  );
}

const segStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius:  44,
    borderWidth:   1.5,
    padding:       4,
    gap:           4,
  },
  tab: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    paddingVertical:   12,
    paddingHorizontal: 8,
    borderRadius:      38,
    position:          'relative',
  },
  tabActive: {
    // backgroundColor set inline
  },
  tabText: {
    fontSize:   13,
    fontWeight: '500',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  activeBar: {
    position:     'absolute',
    bottom:       4,
    alignSelf:    'center',
    width:        22,
    height:       3,
    borderRadius: 2,
  },
});

// ─── LikeCard ─────────────────────────────────────────────────────────────────
// Mirrors MatchCard from MatchesListScreen; adds heart-back btn + dislike btn.

interface LikeCardProps {
  item:    LikeProfile;
  onPress: () => void;
}

function LikeCard({ item, onPress }: LikeCardProps) {
  const { card, textPrimary, textMuted, purple, chipBg } = useLikesTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: card }]}
      onPress={onPress}
      activeOpacity={0.88}
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

        {/* Heart (like-back) button — received likes only */}
        {item.type === 'received' && (
          <TouchableOpacity
            style={[styles.overlayBtn, overlayBtnShadow, { backgroundColor: card }]}
            onPress={() => console.log(`Like back: ${item.id} (${item.name})`)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Like back ${item.name}`}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          >
            <Ionicons name="heart" size={17} color={purple} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Info section ── */}
      <View style={styles.cardInfo}>

        {/* Name + verified badge + dislike button */}
        <View style={styles.nameRow}>
          <View style={styles.nameLeft}>
            <Text style={[styles.nameText, { color: textPrimary }]} numberOfLines={1}>
              {item.name}, {item.age}
            </Text>
            {item.verified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={purple}
                style={styles.verifiedIcon}
              />
            )}
          </View>
          <TouchableOpacity
            onPress={() => console.log(`Dislike: ${item.id} (${item.name})`)}
            activeOpacity={0.7}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`Dislike ${item.name}`}
          >
            <Ionicons name="heart-dislike-outline" size={17} color={textMuted} />
          </TouchableOpacity>
        </View>

        {/* Location + distance */}
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={purple} />
          <Text style={[styles.locationText, { color: textMuted }]} numberOfLines={1}>
            {item.location}
          </Text>
          <Text style={[styles.distanceText, { color: textMuted }]} numberOfLines={1}>
            {item.distance}
          </Text>
        </View>

        {/* Intention chip */}
        <View style={[styles.chip, { backgroundColor: chipBg }]}>
          <Ionicons name="heart" size={11} color={purple} />
          <Text style={[styles.chipText, { color: purple }]} numberOfLines={2}>
            {item.intention}
          </Text>
        </View>

      </View>
    </TouchableOpacity>
  );
}

// ─── LikesListScreen ──────────────────────────────────────────────────────────

export default function LikesListScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const insets = useSafeAreaInsets();
  const { bg } = useLikesTheme();
  const router = useRouter();

  const data = activeTab === 'received' ? RECEIVED_LIKES : SENT_LIKES;

  return (
    <View style={[styles.screen, { backgroundColor: bg }]}>
      <FlatList
        key={activeTab}
        data={data}
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
        ListHeaderComponent={
          <View style={styles.segHeader}>
            <SegmentedControl active={activeTab} onChange={setActiveTab} />
          </View>
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <LikeCard
            item={item}
            onPress={() => {
              router.push('/(app)/user-profile' as any);
              console.log(`Open profile: ${item.id} (${item.name})`);
            }}
          />
        )}
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // paddingHorizontal on listContent (not columnWrapper) — matches MatchesListScreen
  listContent: {
    paddingHorizontal: OUTER_PAD,
  },

  columnWrapper: {
    gap:          COL_GAP,
    marginBottom: ROW_GAP,
  },

  segHeader: {
    paddingBottom: 20,
  },

  // ── Card shell (exact copy of MatchCard styles) ──────────────────────────────
  card: {
    width:        CARD_W,
    borderRadius: 16,
    ...cardShadow,
  },

  imageWrap: {
    width:                CARD_W,
    height:               IMG_H,
    borderTopLeftRadius:  16,
    borderTopRightRadius: 16,
    overflow:             'hidden',
  },

  cardImage: {
    width:  CARD_W,
    height: IMG_H,
  },

  overlayBtn: {
    position:       'absolute',
    top:            10,
    right:          10,
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // ── Card info (exact copy of MatchCard styles) ───────────────────────────────
  cardInfo: {
    paddingHorizontal: 11,
    paddingTop:        10,
    paddingBottom:     12,
    gap:               6,
  },

  // Name row: [nameLeft (flex:1) = name + badge] [dislike btn]
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  nameLeft: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    overflow:      'hidden',
  },

  nameText: {
    fontSize:   17,
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

  distanceText: {
    fontSize:   12,
    flexShrink: 0,
  },

  chip: {
    flexDirection:     'row',
    alignItems:        'center',
    alignSelf:         'flex-start',
    borderRadius:      20,
    paddingHorizontal: 9,
    paddingVertical:   5,
    gap:               5,
    maxWidth:          '100%',
  },

  chipText: {
    fontSize:   11,
    fontWeight: '500',
    flexShrink: 1,
  },
});
