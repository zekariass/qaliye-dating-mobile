import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CURRENT_USER_PROFILE, type ProfileDetail } from './mockCurrentUserProfile';

const { width: W, height: H } = Dimensions.get('window');
const GALLERY_H = Math.round(H * 0.38);
const COL_GAP = 10;
const CARD_W = (W - spacing.md * 2 - COL_GAP) / 2;
const OVERLAP = 36;

const BTN_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.2,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
} as const;

const SHEET_SHADOW = {
  shadowColor: '#8A2CFF',
  shadowOpacity: 0.06,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: -6 },
  elevation: 8,
} as const;

// ── Progress ring ──────────────────────────────────────────────────────────────
const ProgressRing = memo(function ProgressRing({ percent }: { percent: number }) {
  return (
    <View style={styles.ring} accessibilityLabel={`Profile ${percent} percent complete`}>
      <Text style={styles.ringText}>{percent}%</Text>
    </View>
  );
});

// ── Status card ────────────────────────────────────────────────────────────────
interface StatusCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  cardBg: string;
  borderCol: string;
  textCol: string;
  mutedCol: string;
}

const StatusCard = memo(function StatusCard({ icon, label, value, cardBg, borderCol, textCol, mutedCol }: StatusCardProps) {
  return (
    <View
      style={[styles.statusCard, { backgroundColor: cardBg, borderColor: borderCol }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={17} color={colors.primary} />
      <Text style={[styles.statusLabel, { color: textCol }]} numberOfLines={1}>{label}</Text>
      <View style={styles.statusFooter}>
        <Text style={[styles.statusValue, { color: mutedCol }]} numberOfLines={1}>{value}</Text>
        <View style={styles.greenDot} />
      </View>
    </View>
  );
});

// ── Detail card ────────────────────────────────────────────────────────────────
interface DetailCardProps {
  item: ProfileDetail;
  surfaceBg: string;
  iconBg: string;
  borderCol: string;
  textCol: string;
  mutedCol: string;
}

const DetailCard = memo(function DetailCard({
  item, surfaceBg, iconBg, borderCol, textCol, mutedCol,
}: DetailCardProps) {
  return (
    <View style={[styles.detailCard, { width: CARD_W, backgroundColor: surfaceBg, borderColor: borderCol }]}>
      <View style={[styles.detailIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons
          name={item.icon as React.ComponentProps<typeof Ionicons>['name']}
          size={16}
          color={colors.primary}
        />
      </View>
      <View style={styles.detailBody}>
        <Text style={[styles.detailLabel, { color: mutedCol }]} numberOfLines={1}>{item.label}</Text>
        <Text style={[styles.detailValue, { color: textCol }]} numberOfLines={2}>{item.value}</Text>
      </View>
    </View>
  );
});

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function CurrentUserProfileScreen() {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const { top: safeTop } = useSafeAreaInsets();
  const router = useRouter();
  const profile = CURRENT_USER_PROFILE;

  const [activeIdx, setActiveIdx] = useState(0);
  const galleryRef = useRef<ScrollView>(null);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / W));
  }, []);

  const statusCardBg  = isDark ? th.backgroundSelected : '#F0EAFF';
  const statusBorder  = isDark ? th.border             : '#E4D9F8';
  const detailSurface = isDark ? th.backgroundElement  : th.surface;
  const detailIconBg  = isDark ? th.backgroundSelected : '#F3EEFF';

  const detailPairs = profile.details.reduce<[ProfileDetail, ProfileDetail | null][]>(
    (acc, item, i) => {
      if (i % 2 === 0) acc.push([item, profile.details[i + 1] ?? null]);
      return acc;
    },
    [],
  );

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces>

        {/* ── Hero gallery ── */}
        <View style={{ width: W, height: GALLERY_H }}>
          <ScrollView
            ref={galleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
          >
            {profile.images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: W, height: GALLERY_H }}
                contentFit="cover"
                transition={180}
                cachePolicy="memory-disk"
              />
            ))}
          </ScrollView>

          {/* Settings button */}
          <Pressable
            style={[styles.settingsBtn, { top: safeTop + 12 }, BTN_SHADOW]}
            onPress={() => console.log('Open profile settings')}
            accessibilityLabel="Profile settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={colors.primary} />
          </Pressable>

          {/* Pagination dots */}
          <View style={styles.dotsRow} pointerEvents="none">
            {profile.images.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIdx ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>
        </View>

        {/* ── Content sheet ── */}
        <View style={[styles.sheet, { backgroundColor: th.surface, marginTop: -OVERLAP }, SHEET_SHADOW]}>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: th.text }]}>{profile.name},</Text>
                <Text style={[styles.age, { color: th.text }]}> {profile.age}</Text>
                {profile.verified && (
                  <Ionicons
                    name="checkmark-circle"
                    size={21}
                    color={colors.verifiedBlue}
                    style={{ marginLeft: 5 }}
                    accessibilityLabel="Verified"
                  />
                )}
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={colors.primary} />
                <Text style={[styles.locationText, { color: th.textSecondary }]} numberOfLines={1}>
                  {profile.location}
                </Text>
              </View>
            </View>

            <View style={styles.actionsCol}>
              <Pressable
                style={[styles.editBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/(app)/edit-profile' as any)}
                accessibilityLabel="Edit Profile"
                accessibilityRole="button"
              >
                <Ionicons name="pencil-outline" size={13} color="#fff" />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.manageBtn,
                  {
                    backgroundColor: isDark ? th.backgroundSelected : '#EDE9FF',
                    borderColor: isDark ? th.border : '#C9BAEE',
                  },
                ]}
                onPress={() => router.push('/(app)/edit-profile' as any)}
                accessibilityLabel="Manage Photos"
                accessibilityRole="button"
              >
                <Ionicons name="images-outline" size={13} color={colors.primary} />
                <Text style={[styles.manageBtnText, { color: colors.primary }]}>Manage Photos</Text>
              </Pressable>
            </View>
          </View>

          {/* Bio */}
          <Text style={[styles.bio, { color: th.textSecondary }]}>{profile.bio}</Text>

          {/* Status row */}
          <View style={styles.statusRow}>
            <StatusCard
              icon="eye-outline"
              label="Visible"
              value="Everyone"
              cardBg={statusCardBg}
              borderCol={statusBorder}
              textCol={th.text}
              mutedCol={th.textSecondary}
            />
            <StatusCard
              icon="person-outline"
              label="Onboarded"
              value="Completed"
              cardBg={statusCardBg}
              borderCol={statusBorder}
              textCol={th.text}
              mutedCol={th.textSecondary}
            />
            <StatusCard
              icon="shield-checkmark-outline"
              label="Verified"
              value="Identity"
              cardBg={statusCardBg}
              borderCol={statusBorder}
              textCol={th.text}
              mutedCol={th.textSecondary}
            />
            <View
              style={[styles.completionCard, { backgroundColor: statusCardBg, borderColor: statusBorder }]}
              accessible
              accessibilityLabel={`Profile ${profile.profileCompletionPercent} percent complete`}
            >
              <Text style={[styles.completionLabel, { color: th.textSecondary }]}>
                {'Profile\ncompletion'}
              </Text>
              <ProgressRing percent={profile.profileCompletionPercent} />
            </View>
          </View>

          {/* Details grid */}
          <View style={styles.grid}>
            {detailPairs.map(([left, right]) => (
              <View key={left.id} style={styles.gridRow}>
                <DetailCard
                  item={left}
                  surfaceBg={detailSurface}
                  iconBg={detailIconBg}
                  borderCol={th.border}
                  textCol={th.text}
                  mutedCol={th.textMuted}
                />
                {right ? (
                  <DetailCard
                    item={right}
                    surfaceBg={detailSurface}
                    iconBg={detailIconBg}
                    borderCol={th.border}
                    textCol={th.text}
                    mutedCol={th.textMuted}
                  />
                ) : (
                  <View style={{ width: CARD_W }} />
                )}
              </View>
            ))}
          </View>

        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  settingsBtn: {
    position: 'absolute',
    right: 16,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  dotsRow: {
    position: 'absolute',
    bottom: OVERLAP + 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: colors.primary },
  dotInactive: { backgroundColor: 'rgba(255,255,255,0.55)' },

  sheet: {
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingTop: 24,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    minHeight: 500,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 8,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  actionsCol: { gap: 7, alignItems: 'stretch', flexShrink: 0 },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  name: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  age: { fontSize: 27, fontWeight: '400', letterSpacing: -0.5 },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 12, flex: 1 },

  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  manageBtnText: { fontSize: 12, fontWeight: '600' },

  bio: { fontSize: 14, lineHeight: 22, marginBottom: 18 },

  statusRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 20,
  },
  statusCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 7,
    gap: 4,
  },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusValue: { fontSize: 10 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },

  completionCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 7,
    gap: 6,
    alignItems: 'center',
  },
  completionLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  ring: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: { fontSize: 11, fontWeight: '800', color: colors.primary },

  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: COL_GAP },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 9,
    minHeight: 62,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailBody: { flex: 1, minWidth: 0 },
  detailLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, marginBottom: 3 },
  detailValue: { fontSize: 13, fontWeight: '700' },
});
