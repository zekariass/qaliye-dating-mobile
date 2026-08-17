import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useEntitlements } from '@/hooks/billing/useEntitlements';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';
import { mapProfileMeDtoToCurrentUserProfile } from '@/utils/profileMappers';

import BioContent from './components/BioContent';
import DetailsContent from './components/DetailsContent';
import LifestyleContent from './components/LifestyleContent';
import PhotoContent from './components/PhotoContent';
import PreferencesContent from './components/PreferencesContent';
import ProfileHeader from './components/ProfileHeader';
import ProfileTabBar, { PROFILE_TABS, type ProfileTab } from './components/ProfileTabBar';
import StatusContent from './components/StatusContent';

const SCREEN_W = Dimensions.get('window').width;
const PAGE_COUNT = PROFILE_TABS.length;

export default function CurrentUserProfileScreen() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('Details');
  const { colors: th } = useTheme();
  const router = useRouter();

  const { data: dto, isLoading, isError, error } = useCurrentProfile();
  const { entitlements } = useEntitlements();

  // ─── Pager animation ────────────────────────────────────────────────────────
  const currentIndex = useSharedValue(0);
  const pageOffset   = useSharedValue(0);

  const goToTab = useCallback((tab: ProfileTab) => {
    const newIndex = PROFILE_TABS.indexOf(tab);
    if (newIndex < 0 || newIndex === currentIndex.value) return;
    pageOffset.value = withTiming(-(newIndex * SCREEN_W), {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    currentIndex.value = newIndex;
    setActiveTab(tab);
  }, [pageOffset, currentIndex]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      'worklet';
      const base = -(currentIndex.value * SCREEN_W);
      const raw  = base + e.translationX;
      // Rubber-band at edges
      if (raw > 0) {
        pageOffset.value = raw * 0.2;
      } else if (raw < -(SCREEN_W * (PAGE_COUNT - 1))) {
        pageOffset.value = -(SCREEN_W * (PAGE_COUNT - 1)) + (raw + SCREEN_W * (PAGE_COUNT - 1)) * 0.2;
      } else {
        pageOffset.value = raw;
      }
    })
    .onEnd((e) => {
      'worklet';
      const base      = -(currentIndex.value * SCREEN_W);
      const projected = base + e.translationX + e.velocityX * 0.15;
      const newPage   = Math.max(0, Math.min(PAGE_COUNT - 1, Math.round(-projected / SCREEN_W)));
      pageOffset.value = withTiming(-(newPage * SCREEN_W), {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      currentIndex.value = newPage;
      runOnJS(setActiveTab)(PROFILE_TABS[newPage]);
    });

  const pagerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pageOffset.value }],
  }));

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !dto) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: th.background }]}>
        <Text style={[styles.errorText, { color: th.textSecondary }]}>
          {(error as Error)?.message ?? 'Failed to load profile. Please try again.'}
        </Text>
      </View>
    );
  }

  const profile = mapProfileMeDtoToCurrentUserProfile(dto);

  // Render the content for a single tab, wrapped in its own ScrollView
  const renderTabContent = (tab: ProfileTab) => {
    let content: React.ReactNode = null;
    switch (tab) {
      case 'Bio':
        content = <BioContent bio={profile.bio} onAddBio={() => router.push('/(app)/edit-profile' as any)} />;
        break;
      case 'Details':
        content = <DetailsContent profile={profile} />;
        break;
      case 'Photo':
        content = <PhotoContent photos={profile.photos} />;
        break;
      case 'Lifestyle':
        content = <LifestyleContent profile={profile} />;
        break;
      case 'Status':
        content = <StatusContent profile={profile} />;
        break;
      case 'Preferences':
        content = <PreferencesContent profile={profile} />;
        break;
    }
    return (
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {content}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <ProfileHeader
        avatarUri={profile.avatarUri}
        displayName={profile.displayName}
        age={profile.age}
        isVerified={profile.isVerified}
        isIncognito={dto.discovery_mode === 'INCOGNITO'}
        plan={entitlements?.plan ?? null}
        countrySettings={entitlements?.country_settings ?? null}
      />

      <ProfileTabBar activeTab={activeTab} onTabChange={goToTab} />

      {/* ── Pager: all tabs rendered side-by-side; track slides as a unit ────── */}
      <GestureDetector gesture={panGesture}>
        <View style={styles.pagerClip}>
          <Animated.View style={[styles.pagerTrack, pagerStyle]}>
            {PROFILE_TABS.map((tab) => (
              <View key={tab} style={styles.page}>
                {renderTabContent(tab)}
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pager
  pagerClip: {
    flex: 1,
    overflow: 'hidden',
  },
  pagerTrack: {
    flex: 1,
    flexDirection: 'row',
    width: SCREEN_W * PAGE_COUNT,
  },
  page: {
    width: SCREEN_W,
    overflow: 'hidden',
  },
  pageScroll: {
    flex: 1,
  },
  pageContent: {
    paddingBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
