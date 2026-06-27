import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';
import { mapProfileMeDtoToCurrentUserProfile } from '@/utils/profileMappers';

import BioContent from './components/BioContent';
import DetailsContent from './components/DetailsContent';
import LifestyleContent from './components/LifestyleContent';
import PhotoContent from './components/PhotoContent';
import PreferencesContent from './components/PreferencesContent';
import ProfileHeader from './components/ProfileHeader';
import ProfileTabBar, { type ProfileTab } from './components/ProfileTabBar';
import StatusContent from './components/StatusContent';

export default function CurrentUserProfileScreen() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('Details');
  const { colors: th } = useTheme();
  const router = useRouter();

  const { data: dto, isLoading, isError, error } = useCurrentProfile();

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

  return (
    <View style={[styles.screen, { backgroundColor: th.background }]}>
      <ProfileHeader
        avatarUri={profile.avatarUri}
        displayName={profile.displayName}
        age={profile.age}
        isVerified={profile.isVerified}
        location={profile.location}
      />

      <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {activeTab === 'Bio' && (
          <BioContent
            bio={profile.bio}
            onAddBio={() => router.push('/(app)/edit-profile' as any)}
          />
        )}
        {activeTab === 'Details' && <DetailsContent profile={profile} />}
        {activeTab === 'Photo' && <PhotoContent photos={profile.photos} />}
        {activeTab === 'Lifestyle' && <LifestyleContent profile={profile} />}
        {activeTab === 'Status' && <StatusContent profile={profile} />}
        {activeTab === 'Preferences' && <PreferencesContent profile={profile} />}
      </ScrollView>
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
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
