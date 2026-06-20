import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppTheme, colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MOCK_OTHER_USER, ProfileDetail, RelationStatus } from './mockOtherUserProfile';
import ProfileFloatingNav from './ProfileFloatingNav';
import ProfileHeroGallery from './ProfileHeroGallery';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_META: Record<NonNullable<RelationStatus>, { label: string; icon: IoniconName; chipBg: string; chipColor: string }> = {
  matched:       { label: 'Matched',   icon: 'heart-circle',  chipBg: '#EFE4FF', chipColor: colors.primary },
  like_sent:     { label: 'Like Sent', icon: 'heart',         chipBg: '#FFE8F3', chipColor: colors.heartPink },
  like_received: { label: 'Likes You', icon: 'heart',         chipBg: '#E8FFF0', chipColor: colors.success },
};

const ACTION_META: Record<NonNullable<RelationStatus>, { label: string; icon: IoniconName }> = {
  matched:       { label: 'Unmatch',       icon: 'heart-dislike-outline' },
  like_sent:     { label: 'Withdraw Like', icon: 'heart-dislike-outline' },
  like_received: { label: 'Decline',       icon: 'close-circle-outline' },
};

const { width: W } = Dimensions.get('window');
const COL_GAP = 10;
const CARD_W = (W - spacing.md * 2 - COL_GAP) / 2;

const SHEET_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.07,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: -4 },
  elevation: 7,
} as const;

export default function OtherUserProfileScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const { top: safeTop } = useSafeAreaInsets();
  const isDark = mode === 'dark';

  const profile = MOCK_OTHER_USER;

  const detailPairs: [ProfileDetail, ProfileDetail | null][] = [];
  for (let i = 0; i < profile.details.length; i += 2) {
    detailPairs.push([profile.details[i], profile.details[i + 1] ?? null]);
  }

  const [menuVisible, setMenuVisible] = useState(false);

  const statusMeta = profile.status ? STATUS_META[profile.status] : null;
  const actionMeta = profile.status ? ACTION_META[profile.status] : null;

  const addressCardBg     = isDark ? th.backgroundSelected : '#F3EEFF';
  const addressCardBorder = isDark ? th.border : '#DDD0F8';

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Hero gallery */}
        <ProfileHeroGallery
          images={profile.images}
          safeTop={safeTop}
          onBack={() => router.back()}
          onMore={() => setMenuVisible(true)}
        />

        {/* Overlapping profile content sheet */}
        <View style={[styles.sheet, { backgroundColor: th.surface }, SHEET_SHADOW]}>

          {/* Name · Age · Verified */}
          <View style={styles.nameRow}>
            <Text style={[styles.nameText, { color: th.text }]}>
              {profile.name},
            </Text>
            <Text style={[styles.ageText, { color: th.text }]}> {profile.age}</Text>
            {profile.verified && (
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.verifiedBlue}
                style={styles.verifiedIcon}
                accessibilityLabel="Verified profile"
              />
            )}
          </View>

          {/* Status badge */}
          {statusMeta && (
            <View style={[styles.statusChip, { backgroundColor: statusMeta.chipBg }]}>
              <Ionicons name={statusMeta.icon} size={13} color={statusMeta.chipColor} />
              <Text style={[styles.statusChipText, { color: statusMeta.chipColor }]}>{statusMeta.label}</Text>
            </View>
          )}

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color={colors.primary} />
            <Text style={[styles.locationText, { color: th.textSecondary }]} numberOfLines={1}>
              {profile.location}
            </Text>
            <Text style={[styles.distanceBadge, { color: th.textMuted }]}>
              · {profile.distanceKm} km
            </Text>
          </View>

          {/* Bio */}
          <Text style={[styles.bio, { color: th.textSecondary }]}>{profile.bio}</Text>

          {/* Action button */}
          {actionMeta && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.danger }]}
              onPress={() => console.log(actionMeta.label, profile.name)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={actionMeta.label}
            >
              <Ionicons name={actionMeta.icon} size={17} color={colors.danger} />
              <Text style={[styles.actionBtnText, { color: colors.danger }]}>{actionMeta.label}</Text>
            </TouchableOpacity>
          )}

          {/* Address card */}
          <View
            style={[
              styles.addressCard,
              { backgroundColor: addressCardBg, borderColor: addressCardBorder },
            ]}
          >
            <View style={[styles.addressIconWrap, { backgroundColor: colors.primary }]}>
              <Ionicons name="location" size={16} color="#FFF" />
            </View>
            <View style={styles.addressBody}>
              <Text style={[styles.addressLabel, { color: th.textMuted }]}>Address</Text>
              <Text style={[styles.addressValue, { color: th.text }]}>{profile.address}</Text>
            </View>
          </View>

          {/* Details grid */}
          <View style={styles.grid}>
            {detailPairs.map(([left, right], i) => (
              <View key={i} style={styles.gridRow}>
                <DetailCard item={left} th={th} />
                {right ? (
                  <DetailCard item={right} th={th} />
                ) : (
                  <View style={{ width: CARD_W }} />
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Fixed floating bottom nav */}
      <ProfileFloatingNav activeTab="profile" />

      {/* Dropdown menu */}
      <Modal
        transparent
        visible={menuVisible}
        onRequestClose={() => setMenuVisible(false)}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View
            style={[
              styles.dropdownCard,
              { top: safeTop + 72, backgroundColor: th.surface, borderColor: th.border },
            ]}
          >
            <Pressable
              style={styles.dropdownItem}
              onPress={() => { setMenuVisible(false); console.log('Report user', profile.name); }}
              accessibilityRole="button"
              accessibilityLabel="Report user"
            >
              <Ionicons name="flag-outline" size={18} color={colors.danger} />
              <Text style={[styles.dropdownItemText, { color: colors.danger }]}>Report</Text>
            </Pressable>
            <View style={[styles.dropdownDivider, { backgroundColor: th.border }]} />
            <Pressable
              style={styles.dropdownItem}
              onPress={() => { setMenuVisible(false); console.log('Block user', profile.name); }}
              accessibilityRole="button"
              accessibilityLabel="Block user"
            >
              <Ionicons name="ban-outline" size={18} color={th.text} />
              <Text style={[styles.dropdownItemText, { color: th.text }]}>Block</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

interface DetailCardProps {
  item: ProfileDetail;
  th: AppTheme;
}

const DetailCard = memo(({ item, th }: DetailCardProps) => {
  const iconName = item.icon as React.ComponentProps<typeof Ionicons>['name'];
  return (
    <View
      style={[
        styles.detailCard,
        { width: CARD_W, backgroundColor: th.surface, borderColor: th.border },
      ]}
    >
      <View style={[styles.detailIconWrap, { backgroundColor: th.backgroundElement }]}>
        <Ionicons name={iconName} size={17} color={colors.primary} />
      </View>
      <View style={styles.detailBody}>
        <Text style={[styles.detailLabel, { color: th.textMuted }]} numberOfLines={1}>
          {item.label}
        </Text>
        <Text style={[styles.detailValue, { color: th.text }]}>{item.value}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 150 },

  sheet: {
    marginTop: -30,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    paddingTop: 22,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    minHeight: 500,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  ageText: {
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  verifiedIcon: { marginLeft: 6 },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: { fontSize: 13 },

  bio: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 20,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addressBody: { flex: 1 },
  addressLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  addressValue: { fontSize: 15, fontWeight: '600' },

  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: COL_GAP },

  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 12,
    gap: 10,
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
  detailBody: { flex: 1 },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
    marginBottom: 10,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  distanceBadge: {
    fontSize: 13,
    flexShrink: 0,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  dropdownCard: {
    position: 'absolute',
    right: 16,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 164,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
