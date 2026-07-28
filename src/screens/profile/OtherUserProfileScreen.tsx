import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Reanimated, {
    withTiming as reanimatedWithTiming,
    Easing as REasing,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReportType } from '@/api/safety/safetyApi';
import { ActivityStatusIndicator } from '@/components/common/ActivityStatusIndicator';
import { themedAlert, themedError, themedSuccess } from '@/components/common/ThemedAlert';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import MorePhotosSection from '@/components/discovery/MorePhotosSection';
import { CardDto } from '@/components/discovery/ProfileCard';
import ProfileDetailsSection from '@/components/discovery/ProfileDetailsSection';
import { colors, radius, spacing } from '@/constants/theme';
import { useActivityStatuses } from '@/hooks/activity/useActivityStatuses';
import { useSwipeAction } from '@/hooks/discovery/useSwipeAction';
import { useUnmatch } from '@/hooks/matches/useUnmatch';
import { useOtherUserProfile } from '@/hooks/profile/useOtherUserProfile';
import { useBlockUser } from '@/hooks/safety/useBlockUser';
import { useReportUser } from '@/hooks/safety/useReportUser';
import { useTheme } from '@/hooks/use-theme';
import {
    mapOtherUserProfileDtoToView,
    OtherUserRelationStatus,
} from '@/utils/profileMappers';

import AppTabBar from '@/components/layout/AppTabBar';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_H = Math.round(SCREEN_W * 1.1);

const STATUS_META: Record<NonNullable<OtherUserRelationStatus>, { label: string; icon: IoniconName; chipBg: string; chipColor: string }> = {
  matched:       { label: 'Matched',   icon: 'heart-circle',  chipBg: '#EFE4FF', chipColor: colors.primary },
  like_sent:     { label: 'Like Sent', icon: 'heart',         chipBg: '#FFE8F3', chipColor: colors.heartPink },
  like_received: { label: 'Likes You', icon: 'heart',         chipBg: '#E8FFF0', chipColor: colors.success },
};

const ACTION_META: Record<NonNullable<OtherUserRelationStatus>, { primary: { icon: IoniconName; color: string; label: string }; secondary?: { icon: IoniconName; color: string; label: string } }> = {
  matched:       { primary: { icon: 'heart-dislike-outline', color: colors.danger, label: 'Unmatch' } },
  like_sent:     { primary: { icon: 'heart-dislike-outline', color: colors.danger, label: 'Cancel Like' } },
  like_received: { primary: { icon: 'close-circle', color: colors.danger, label: 'Decline' }, secondary: { icon: 'heart', color: colors.heartPink, label: 'Like Back' } },
};

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
    const isLikeReceived = profile?.status === 'like_received';
    const isLikeSent = profile?.status === 'like_sent';
    const label = isLikeReceived ? 'Decline' : isLikeSent ? 'Unsend Like' : 'Pass';
    themedAlert({
      title: `${label}?`,
      message: isLikeReceived
        ? `Reject ${profile?.name ?? 'this user'}'s like?`
        : isLikeSent
          ? `Withdraw your like from ${profile?.name ?? 'this user'}?`
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
      if (result.is_match && result.match) {
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

  // ── Hero photo navigation state (must be before early returns) ──
  const heroPhotos = profile?.images ?? [];
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const heroSlideX = useSharedValue(0);
  const heroSlideDir = useRef<'next' | 'prev'>('next');
  const heroSkipSlide = useRef(true);

  useEffect(() => {
    setHeroPhotoIndex(0);
    heroSkipSlide.current = true;
  }, [userId]);

  useEffect(() => {
    if (heroSkipSlide.current) {
      heroSkipSlide.current = false;
      heroSlideX.value = 0;
      return;
    }
    const startOffset = heroSlideDir.current === 'next' ? SCREEN_W : -SCREEN_W;
    heroSlideX.value = startOffset;
    heroSlideX.value = reanimatedWithTiming(0, { duration: 280, easing: REasing.out(REasing.cubic) });
  }, [heroPhotoIndex]);

  const heroPanGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -30 && heroPhotoIndex < heroPhotos.length - 1) {
        heroSlideDir.current = 'next';
        setHeroPhotoIndex((i) => Math.min(i + 1, heroPhotos.length - 1));
      } else if (e.translationX > 30 && heroPhotoIndex > 0) {
        heroSlideDir.current = 'prev';
        setHeroPhotoIndex((i) => Math.max(i - 1, 0));
      }
    });

  const heroTapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (heroPhotos.length <= 1) return;
      heroSlideDir.current = 'next';
      setHeroPhotoIndex((i) => (i + 1) % heroPhotos.length);
    });

  const heroPhotoGesture = Gesture.Race(heroPanGesture, heroTapGesture);

  const heroSlideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: heroSlideX.value }],
  }));

  // Build CardDto for ProfileDetailsSection + MorePhotosSection
  const cardDto: CardDto | null = useMemo(() => {
    if (!profile || !dto) return null;
    return {
      user_id: profile.userId,
      display_name: profile.name,
      age: profile.age ?? 0,
      distance_km: null,
      is_verified: profile.verified,
      relationship_intention: dto.relationship_intention ?? '',
      residency_type: dto.residency_type ?? '',
      city: dto.address?.city ?? '',
      country_name: dto.address?.country_name ?? '',
      photos: profile.images.map((url) => ({ image_url: url })),
      bio: profile.bio ?? undefined,
      gender: dto.gender,
      height_cm: dto.height_cm ?? undefined,
      ethnicities: dto.ethnicities,
      languages: dto.languages,
      nationality: dto.nationality ?? undefined,
      religion: dto.religion ?? undefined,
      education_level: dto.education_level ?? undefined,
      occupation: dto.occupation ?? undefined,
      marital_status: dto.marital_status ?? undefined,
      has_children: dto.has_children ?? undefined,
      wants_children: dto.wants_children ?? undefined,
      smoking: dto.smoking ?? undefined,
      drinking: dto.drinking ?? undefined,
      activity_level: dto.activity_level ?? undefined,
      interests: profile.interests,
    };
  }, [profile, dto]);

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

  const currentHeroPhoto = heroPhotos.length > 0 ? heroPhotos[Math.min(heroPhotoIndex, heroPhotos.length - 1)] : null;

  const statusMeta = profile.status ? STATUS_META[profile.status] : null;
  const actionMeta = profile.status ? ACTION_META[profile.status] : null;

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <GestureHandlerRootView style={styles.screen}>
      <View style={{ flex: 1, backgroundColor: th.background }}>
        {/* ── Header (floating over hero) ── */}
        <View style={[styles.header, { paddingTop: safeTop + 4 }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.8}
            accessibilityLabel="More options"
            accessibilityRole="button"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ── Scrollable content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: safeBottom + 100 }}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Hero photo — swipe horizontally to browse photos */}
          <GestureDetector gesture={heroPhotoGesture}>
            <View style={styles.heroWrap}>
              <Reanimated.View style={[styles.heroPhoto, heroSlideStyle]}>
                {currentHeroPhoto ? (
                  <Image
                    source={{ uri: currentHeroPhoto }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
                    <Ionicons name="person" size={64} color={colors.primaryLight} />
                  </View>
                )}
              </Reanimated.View>

              {/* Gradient overlay */}
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']}
                locations={[0.4, 1]}
                style={styles.heroOverlay}
              />

              {/* Verified badge */}
              {profile.verified && (
                <View style={styles.heroVerified}>
                  <VerifiedBadge size={20} />
                </View>
              )}

              {/* Photo indicator dots — bottom right */}
              {heroPhotos.length > 1 && (
                <View style={styles.heroDotsWrap}>
                  {heroPhotos.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.heroDot,
                        i === heroPhotoIndex ? styles.heroDotActive : styles.heroDotInactive,
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Name + age + location */}
              <View style={styles.heroInfo}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {profile.name}
                  {profile.age != null && <Text style={styles.heroAge}>  · {profile.age}</Text>}
                </Text>
                {!!profile.location && (
                  <View style={styles.heroLocationRow}>
                    <Ionicons name="location" size={12} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.heroLocationText} numberOfLines={1}>
                      {profile.location}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </GestureDetector>

          {/* Status chip + activity status */}
          {(statusMeta || (!!activityStatus && activityStatus !== 'HIDDEN' && activityStatus !== 'OFFLINE')) && (
            <View style={styles.belowHeroRow}>
              {statusMeta && (
                <View style={[styles.statusChip, { backgroundColor: statusMeta.chipBg }]}>
                  <Ionicons name={statusMeta.icon} size={13} color={statusMeta.chipColor} />
                  <Text style={[styles.statusChipText, { color: statusMeta.chipColor }]}>{statusMeta.label}</Text>
                </View>
              )}
              {!!activityStatus && activityStatus !== 'HIDDEN' && activityStatus !== 'OFFLINE' && (
                <ActivityStatusIndicator
                  status={activityStatus}
                  showLabel
                  size={9}
                  labelColor={isDark ? '#9CA3AF' : '#7C6EA0'}
                />
              )}
            </View>
          )}

          {/* Profile details */}
          {cardDto && (
            <>
              <ProfileDetailsSection card={cardDto} />
              <MorePhotosSection photos={cardDto.photos} />
            </>
          )}
        </ScrollView>

        {/* Fixed floating action buttons */}
        {actionMeta && (
          <View style={[styles.fixedActionButtonsRow, { bottom: safeBottom + 72 }]}>
            {profile?.status === 'matched' ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.actionTextButton,
                    { backgroundColor: colors.primary, opacity: isSwiping ? 0.6 : 1 },
                  ]}
                  onPress={() => {
                    if (resolvedMatchId) {
                      router.push({
                        pathname: '/(app)/chat' as any,
                        params: {
                          matchId: resolvedMatchId,
                          displayName: profile?.name ?? '',
                          avatarUrl: profile?.images?.[0] ?? '',
                          isVerified: profile?.verified ? '1' : '0',
                        },
                      });
                    }
                  }}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel="Chat"
                >
                  <Ionicons name="chatbubble-ellipses" size={15} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionTextButtonLabel}>Chat</Text>
                </TouchableOpacity>
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
              </>
            ) : profile?.status === 'like_sent' ? (
              <TouchableOpacity
                style={[
                  styles.actionTextButton,
                  { opacity: isSwiping ? 0.6 : 1 },
                ]}
                onPress={handlePass}
                disabled={isSwiping}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Cancel Like"
              >
                {isSwiping ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="heart-dislike" size={15} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.actionTextButtonLabel}>Cancel Like</Text>
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
      </View>
      </GestureHandlerRootView>

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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // ── Error / loading states ──
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Header ──
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Hero ──
  heroWrap: {
    width: SCREEN_W,
    height: HERO_H,
    position: 'relative',
    overflow: 'hidden',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLavender,
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroDotsWrap: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    gap: 4,
    zIndex: 4,
  },
  heroDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  heroDotActive: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },
  heroDotInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  heroVerified: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 3,
  },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 18,
    paddingBottom: 14,
    zIndex: 2,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroAge: {
    fontSize: 20,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  heroLocationText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },

  // ── Below hero ──
  belowHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Action buttons ──
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
  actionTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 28,
    backgroundColor: colors.danger,
  },
  actionTextButtonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Dropdown menu ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  dropdownCard: {
    position: 'absolute',
    right: 16,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 180,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownDivider: {
    height: StyleSheet.hairlineWidth,
  },

  // ── Report modal ──
  reportKAV: {
    flex: 1,
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
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  reportHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 12,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 14,
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
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reportOptionLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  reportCharCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },
  reportSubmitBtn: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  reportSubmitLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
