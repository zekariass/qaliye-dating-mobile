import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReportType } from '@/api/safety/safetyApi';
import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import { AppTheme, colors, radius, spacing } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useSwipeAction } from '@/hooks/discovery/useSwipeAction';
import { useUnmatch } from '@/hooks/matches/useUnmatch';
import { useOtherUserProfile } from '@/hooks/profile/useOtherUserProfile';
import { useBlockUser } from '@/hooks/safety/useBlockUser';
import { useReportUser } from '@/hooks/safety/useReportUser';
import { useTheme } from '@/hooks/use-theme';
import {
    mapOtherUserProfileDtoToView,
    OtherUserDetailGroup,
    OtherUserRelationStatus,
} from '@/utils/profileMappers';

import AppTabBar from '@/components/layout/AppTabBar';
import ProfileHeroGallery from './ProfileHeroGallery';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_META: Record<NonNullable<OtherUserRelationStatus>, { label: string; icon: IoniconName; chipBg: string; chipColor: string }> = {
  matched:       { label: 'Matched',   icon: 'heart-circle',  chipBg: '#EFE4FF', chipColor: colors.primary },
  like_sent:     { label: 'Like Sent', icon: 'heart',         chipBg: '#FFE8F3', chipColor: colors.heartPink },
  like_received: { label: 'Likes You', icon: 'heart',         chipBg: '#E8FFF0', chipColor: colors.success },
};

const ACTION_META: Record<NonNullable<OtherUserRelationStatus>, { primary: { icon: IoniconName; color: string; label: string }; secondary?: { icon: IoniconName; color: string; label: string } }> = {
  matched:       { primary: { icon: 'heart-dislike-outline', color: colors.danger, label: 'Unmatch' } },
  like_sent:     { primary: { icon: 'close-circle', color: colors.danger, label: 'Pass' } },
  like_received: { primary: { icon: 'close-circle', color: colors.danger, label: 'Decline' }, secondary: { icon: 'heart', color: colors.heartPink, label: 'Like Back' } },
};

const SHEET_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.07,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: -4 },
  elevation: 7,
} as const;

const REPORT_OPTIONS: { type: ReportType; label: string }[] = [
  { type: 'FAKE_PROFILE',              label: 'Fake Profile' },
  { type: 'HARASSMENT',                label: 'Harassment' },
  { type: 'HATE_SPEECH',               label: 'Hate Speech' },
  { type: 'INAPPROPRIATE_CONTENT',     label: 'Inappropriate Content' },
  { type: 'SCAM',                      label: 'Scam' },
  { type: 'UNDERAGE',                  label: 'Underage' },
  { type: 'VIOLENCE_OR_THREATS',       label: 'Violence or Threats' },
  { type: 'PRIVACY_VIOLATION',         label: 'Privacy Violation' },
  { type: 'OFF_PLATFORM_SOLICITATION', label: 'Solicitation' },
  { type: 'SPAM',                      label: 'Spam' },
  { type: 'OTHER',                     label: 'Other' },
];

export default function OtherUserProfileScreen() {
  const router = useRouter();
  const { userId, matchId } = useLocalSearchParams<{ userId: string; matchId?: string }>();
  const { colors: th, mode } = useTheme();
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const isDark = mode === 'dark';

  const { data: dto, isLoading, isError, refetch } = useOtherUserProfile(userId ?? '');
  const profile = dto ? mapOtherUserProfileDtoToView(dto) : null;
  const resolvedMatchId = matchId ?? profile?.matchId ?? '';

  if (__DEV__) {
    console.log('[OtherUserProfile] status:', profile?.status, 'matchId:', resolvedMatchId);
  }

  const { getStatus } = useActivityStatuses(userId ? [userId] : []);
  const activityStatus = userId ? getStatus(userId, dto?.activity_status) : undefined;

  const { mutate: unmatch, isPending: isUnmatching } = useUnmatch();
  const { mutate: blockUser, isPending: isBlocking } = useBlockUser();
  const { mutate: reportUser, isPending: isReporting } = useReportUser();
  const { mutateAsync: swipeAction, isPending: isSwiping } = useSwipeAction();
  const qc = useQueryClient();

  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [reportDescription, setReportDescription] = useState('');
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);

  const invalidateLikesAndDiscovery = () => {
    qc.invalidateQueries({ queryKey: ['discovery', 'likes'] });
    qc.invalidateQueries({ queryKey: ['discovery', 'profiles'] });
    qc.invalidateQueries({ queryKey: ['discovery', 'matches'] });
    if (userId) {
      qc.invalidateQueries({ queryKey: ['profile', 'user', userId] });
    }
  };

  const handlePass = () => {
    if (!userId) return;
    const label = profile?.status === 'like_received' ? 'Decline' : 'Pass';
    themedAlert({
      title: `${label}?`,
      message: profile?.status === 'like_received'
        ? `Reject ${profile?.name ?? 'this user'}'s like?`
        : `Pass on ${profile?.name ?? 'this user'}?`,
      icon: 'close-circle-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: 'destructive',
          onPress: async () => {
            try {
              await swipeAction({ type: 'PASS', targetUserId: userId });
              invalidateLikesAndDiscovery();
              router.back();
            } catch (err: any) {
              themedError('Error', err?.response?.data?.message ?? err?.message ?? 'Could not complete action.');
            }
          },
        },
      ],
    });
  };

  const handleLikeBack = async () => {
    if (!userId) return;
    try {
      const result = await swipeAction({ type: 'LIKE', targetUserId: userId });
      invalidateLikesAndDiscovery();
      if (result.isMatch && result.match) {
        themedAlert({
          title: "It's a Match!",
          message: `You and ${profile?.name ?? 'this user'} are now matched.`,
          icon: 'heart',
          iconColor: colors.secondary,
          buttons: [{ text: 'OK', onPress: () => router.back() }],
        });
      } else {
        themedAlert({
          title: 'Like sent',
          message: 'Your like has been sent.',
          icon: 'heart-outline',
          iconColor: colors.primary,
          buttons: [{ text: 'OK', onPress: () => router.back() }],
        });
      }
    } catch (err: any) {
      themedError('Error', err?.response?.data?.message ?? err?.message ?? 'Could not complete action.');
    }
  };

  const handleUnmatch = () => {
    if (!resolvedMatchId) {
      themedError('Cannot unmatch', 'Match information is missing. Try opening this profile from the matches list or chat.');
      return;
    }
    themedAlert({
      title: 'Unmatch?',
      message: 'This conversation will be removed and you will no longer see each other.',
      icon: 'heart-dislike-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: () => {
            unmatch(resolvedMatchId, {
              onSuccess: () => {
                router.push('/(app)/(tabs)/messages' as any);
              },
              onError: (error: any) => {
                const status = error?.response?.status;
                let message = 'Could not unmatch right now. Please try again later.';
                if (status === 403) {
                  message = 'You are not a participant in this match.';
                } else if (status === 404) {
                  message = 'Match not found.';
                }
                themedError('Unmatch failed', message);
              },
            });
          },
        },
      ],
    });
  };

  const handleBlock = () => {
    setMenuVisible(false);
    themedAlert({
      title: 'Block user?',
      message: `${profile?.name ?? 'This user'} will no longer appear in your discovery and any active match will be ended.`,
      icon: 'ban-outline',
      iconColor: colors.danger,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            if (!userId) return;
            blockUser(
              { userId },
              {
                onSuccess: () => {
                  themedAlert({
                    title: 'Blocked',
                    message: 'User has been blocked.',
                    icon: 'ban',
                    iconColor: colors.danger,
                    buttons: [{ text: 'OK', onPress: () => router.back() }],
                  });
                },
                onError: (error: any) => {
                  const msg = error?.response?.data?.message;
                  themedError(
                    'Could not block',
                    msg === 'CANNOT_BLOCK_SELF'
                      ? 'You cannot block yourself.'
                      : 'Something went wrong. Please try again.',
                  );
                },
              },
            );
          },
        },
      ],
    });
  };

  const handleOpenReport = () => {
    setMenuVisible(false);
    setSelectedReportType(null);
    setReportDescription('');
    setReportDropdownOpen(false);
    setReportVisible(true);
  };

  const handleSubmitReport = () => {
    if (!userId || !selectedReportType) return;
    const body: { report_type: ReportType; description?: string } = {
      report_type: selectedReportType,
    };
    if (reportDescription.trim().length > 0) {
      body.description = reportDescription.trim().slice(0, 2000);
    }
    reportUser(
      { userId, body },
      {
        onSuccess: () => {
          setReportVisible(false);
          setReportDescription('');
          themedSuccess('Report submitted', 'Thank you. Our team will review this report.');
        },
        onError: (error: any) => {
          const msg = error?.response?.data?.message;
          themedError(
            'Could not submit report',
            msg === 'CANNOT_REPORT_SELF'
              ? 'You cannot report yourself.'
              : 'Something went wrong. Please try again.',
          );
        },
      },
    );
  };

  const addressCardBg     = isDark ? th.backgroundSelected : '#F3EEFF';
  const addressCardBorder = isDark ? th.border : '#DDD0F8';

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <Ionicons name="person-circle-outline" size={56} color={th.textMuted} />
        <Text style={[styles.errorText, { color: th.textSecondary }]}>Profile not available</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => refetch()}
          activeOpacity={0.75}
        >
          <Text style={[styles.retryBtnText, { color: colors.primary }]}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Text style={[styles.backBtnText, { color: th.textMuted }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusMeta = profile.status ? STATUS_META[profile.status] : null;
  const actionMeta = profile.status ? ACTION_META[profile.status] : null;

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
            {profile.age != null && (
              <Text style={[styles.ageText, { color: th.text }]}> {profile.age}</Text>
            )}
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
          {!!activityStatus && activityStatus !== 'HIDDEN' && activityStatus !== 'OFFLINE' && (
            <ActivityStatusIndicator
              status={activityStatus}
              showLabel
              size={9}
              labelColor={isDark ? '#9CA3AF' : '#7C6EA0'}
              style={styles.activityStatus}
            />
          )}

          {/* Status badge */}
          {statusMeta && (
            <View style={[styles.statusChip, { backgroundColor: statusMeta.chipBg }]}>
              <Ionicons name={statusMeta.icon} size={13} color={statusMeta.chipColor} />
              <Text style={[styles.statusChipText, { color: statusMeta.chipColor }]}>{statusMeta.label}</Text>
            </View>
          )}

          {/* Location */}
          {!!profile.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={15} color={colors.primary} />
              <Text style={[styles.locationText, { color: th.textSecondary }]} numberOfLines={1}>
                {profile.location}
              </Text>
            </View>
          )}

          {/* Bio */}
          {!!profile.bio && (
            <Text style={[styles.bio, { color: th.textSecondary }]}>{profile.bio}</Text>
          )}

          {/* Address card */}
          {!!profile.address && (
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
          )}

          {/* Grouped detail sections */}
          {profile.detailGroups.map((group) => (
            <DetailGroupSection
              key={group.title}
              group={group}
              interests={profile.interests}
              th={th}
              isDark={isDark}
            />
          ))}
        </View>
      </ScrollView>

      {/* Fixed floating action buttons */}
      {actionMeta && (
        <View style={[styles.fixedActionButtonsRow, { bottom: safeBottom + 72 }]}>
          {profile?.status === 'matched' ? (
            <TouchableOpacity
              style={[
                styles.actionTextButton,
                { opacity: isUnmatching ? 0.6 : 1 },
              ]}
              onPress={handleUnmatch}
              disabled={isUnmatching}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Unmatch"
            >
              {isUnmatching ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="heart-dislike" size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionTextButtonLabel}>Unmatch</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionIconButton, { backgroundColor: colors.danger, opacity: isSwiping ? 0.6 : 1 }]}
              onPress={handlePass}
              disabled={isSwiping}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={actionMeta.primary.label}
            >
              {isSwiping ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name={actionMeta.primary.icon} size={22} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
          {actionMeta.secondary && (() => {
            const secondary = actionMeta.secondary;
            const isPrimary = secondary.label === 'Like Back';
            return (
              <TouchableOpacity
                style={[styles.actionIconButton, { backgroundColor: isPrimary ? colors.primary : th.surface, opacity: isSwiping ? 0.6 : 1 }]}
                onPress={handleLikeBack}
                disabled={isSwiping}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={secondary.label}
              >
                {isSwiping ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name={secondary.icon} size={22} color="#FFF" />
                )}
              </TouchableOpacity>
            );
          })()}
        </View>
      )}

      {/* Fixed floating bottom nav */}
      <AppTabBar activeTab="profile" />

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
              onPress={handleOpenReport}
              accessibilityRole="button"
              accessibilityLabel="Report user"
            >
              <Ionicons name="flag-outline" size={18} color={colors.danger} />
              <Text style={[styles.dropdownItemText, { color: colors.danger }]}>Report</Text>
            </Pressable>
            <View style={[styles.dropdownDivider, { backgroundColor: th.border }]} />
            <Pressable
              style={[styles.dropdownItem, isBlocking && { opacity: 0.5 }]}
              onPress={handleBlock}
              disabled={isBlocking}
              accessibilityRole="button"
              accessibilityLabel="Block user"
            >
              {isBlocking ? (
                <ActivityIndicator size="small" color={th.text} />
              ) : (
                <Ionicons name="ban-outline" size={18} color={th.text} />
              )}
              <Text style={[styles.dropdownItemText, { color: th.text }]}>Block</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Report modal */}
      <Modal
        transparent
        visible={reportVisible}
        animationType="slide"
        onRequestClose={() => setReportVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.reportKAV}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable
            style={styles.reportBackdrop}
            onPress={() => setReportVisible(false)}
          />
          <Pressable
            style={[styles.reportSheet, { backgroundColor: th.surface }]}
            onPress={() => {}}
          >
            {/* Handle bar */}
            <View style={[styles.reportHandle, { backgroundColor: th.border }]} />

            <Text style={[styles.reportTitle, { color: th.text }]}>Report Profile</Text>
            <Text style={[styles.reportSubtitle, { color: th.textMuted }]}>
              Select the reason for reporting {profile.name}
            </Text>

            {/* Dropdown trigger */}
            <Pressable
              style={[
                styles.reportDropdownBtn,
                {
                  borderColor: reportDropdownOpen ? colors.primary : th.border,
                  backgroundColor: isDark ? '#1A1525' : th.backgroundSelected,
                },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                setReportDropdownOpen((v) => !v);
              }}
              accessibilityRole="button"
              accessibilityLabel="Select report reason"
            >
              <Text
                style={[
                  styles.reportDropdownValue,
                  { color: selectedReportType ? th.text : th.textMuted },
                ]}
                numberOfLines={1}
              >
                {selectedReportType
                  ? REPORT_OPTIONS.find((o) => o.type === selectedReportType)?.label
                  : 'Select a reason…'}
              </Text>
              <Ionicons
                name={reportDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={th.textMuted}
              />
            </Pressable>

            {/* Dropdown options list */}
            {reportDropdownOpen && (
              <ScrollView
                style={[styles.reportOptionsList, { borderColor: th.border, backgroundColor: isDark ? '#1A1525' : th.surface }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {REPORT_OPTIONS.map(({ type, label }, idx) => {
                  const selected = selectedReportType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[
                        styles.reportOption,
                        idx < REPORT_OPTIONS.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: th.border,
                        },
                        selected && { backgroundColor: isDark ? '#2A1A44' : '#F3EEFF' },
                      ]}
                      onPress={() => {
                        setSelectedReportType(type);
                        setReportDropdownOpen(false);
                      }}
                      accessibilityRole="menuitem"
                    >
                      <Text
                        style={[
                          styles.reportOptionLabel,
                          { color: selected ? colors.primary : th.text },
                          selected && { fontWeight: '700' },
                        ]}
                      >
                        {label}
                      </Text>
                      {selected && (
                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            <TextInput
              style={[
                styles.reportInput,
                {
                  borderColor: th.border,
                  color: th.text,
                  backgroundColor: isDark ? '#1A1525' : th.backgroundSelected,
                },
              ]}
              placeholder="Optional: add details (max 2000 characters)"
              placeholderTextColor={th.textMuted}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
              value={reportDescription}
              onChangeText={setReportDescription}
              editable={!isReporting}
              accessibilityLabel="Report description"
            />
            <Text style={[styles.reportCharCount, { color: th.textMuted }]}>
              {reportDescription.length}/2000
            </Text>

            <TouchableOpacity
              style={[
                styles.reportSubmitBtn,
                {
                  backgroundColor: selectedReportType ? colors.danger : th.border,
                  opacity: isReporting ? 0.6 : 1,
                },
              ]}
              onPress={handleSubmitReport}
              disabled={!selectedReportType || isReporting}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Submit report"
            >
              {isReporting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.reportSubmitLabel}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Grouped detail section (full-width rows with dividers)
// ---------------------------------------------------------------------------
function DetailGroupSection({
  group, interests, th, isDark,
}: {
  group: OtherUserDetailGroup;
  interests: string[];
  th: AppTheme;
  isDark: boolean;
}) {
  const iconBg = isDark ? th.backgroundSelected : '#F3EEFF';
  const regularItems = group.items.filter((i) => i.id !== 'interests');
  const hasInterests = group.items.some((i) => i.id === 'interests') && interests.length > 0;

  if (regularItems.length === 0 && !hasInterests) return null;

  return (
    <View style={styles.groupSection}>
      <Text style={[styles.groupLabel, { color: colors.primary }]}>{group.title}</Text>
      <View style={[styles.listCard, { backgroundColor: th.surface, borderColor: th.border }]}>
        {regularItems.map((item, idx) => {
          const iconName = item.icon as React.ComponentProps<typeof Ionicons>['name'];
          return (
            <View key={item.id}>
              {idx > 0 && <View style={[styles.rowDivider, { backgroundColor: th.border }]} />}
              <View style={styles.listRow}>
                <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
                  <Ionicons name={iconName} size={16} color={colors.primary} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowLabel, { color: th.textMuted }]}>{item.label}</Text>
                  <Text style={[styles.rowValue, { color: th.text }]}>{item.value}</Text>
                </View>
              </View>
            </View>
          );
        })}
        {hasInterests && (
          <View>
            {regularItems.length > 0 && <View style={[styles.rowDivider, { backgroundColor: th.border }]} />}
            <View style={styles.listRow}>
              <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name="color-palette-outline" size={16} color={colors.primary} />
              </View>
              <View style={[styles.rowBody, { gap: 6 }]}>
                <Text style={[styles.rowLabel, { color: th.textMuted }]}>Interests</Text>
                <View style={styles.chipWrap}>
                  {interests.map((interest) => (
                    <View key={interest} style={[styles.chip, { backgroundColor: iconBg, borderColor: th.border }]}>
                      <Text style={[styles.chipText, { color: colors.primary }]}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 150 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },

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

  activityStatus: {
    marginBottom: 8,
    marginTop: -2,
  },

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

  groupSection: {
    gap: 8,
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
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

  fixedActionButtonsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  actionIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  actionTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 21,
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  actionTextButtonLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  dropdownCard: {
    position: 'absolute',
    right: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
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

  reportKAV: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  reportBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  reportSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  reportHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 16,
  },
  reportDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 6,
  },
  reportDropdownValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  reportOptionsList: {
    maxHeight: 220,
    borderWidth: 1,
    borderRadius: radius.md,
    marginBottom: 12,
    overflow: 'hidden',
  },
  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  reportOptionLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    minHeight: 88,
    maxHeight: 130,
  },
  reportCharCount: {
    fontSize: 11,
    fontWeight: '500',
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 4,
  },
  reportSubmitBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  reportSubmitLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
});
