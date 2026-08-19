import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useCountrySettings } from '@/hooks/billing/useCountrySettings';
import { PROFILE_ME_QUERY_KEY, useCurrentProfile } from '@/hooks/profile/useCurrentProfile';
import { useTheme } from '@/hooks/use-theme';

import IdentityVerificationStep from '../onboarding/steps/IdentityVerificationStep';

export default function VerifyIdentityScreen() {
  const router = useRouter();
  const { colors: th } = useTheme();
  const queryClient = useQueryClient();
  const { data: dto, isLoading } = useCurrentProfile();
  const { identity_verification_required } = useCountrySettings();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleComplete = async () => {
    await queryClient.invalidateQueries({ queryKey: PROFILE_ME_QUERY_KEY });
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleGoBackToPhoto = () => {
    router.push('/(app)/edit-profile' as any);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: th.backgroundElement }]}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={th.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: th.text }]}>Verify Identity</Text>
        <View style={styles.headerRight} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          <IdentityVerificationStep
            onComplete={handleComplete}
            isCompleted={dto?.is_verified ?? false}
            identity_verification_required={identity_verification_required}
            onGoBackToPhoto={handleGoBackToPhoto}
            verificationStatus={dto?.verification_status}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
