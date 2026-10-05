/**
 * Screen 10 — It's a Match!
 *
 * Shown when both parties submitted INTERESTED. The backend creates a normal
 * dating match record. This screen celebrates the match and routes into the
 * existing dating/chat experience via match_id.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';

import { colors, radius, spacing } from '@/constants/theme';
import { useIntroduction } from '@/hooks/matchmaking/useMatchmakingIntroduction';
import { useTheme } from '@/hooks/use-theme';

const HERO = require('@/assets/images/loader/loader-icon-male-and-female.webp');

export default function MatchmakingMutualInterestScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { introductionId, matchId } = useLocalSearchParams<{
    introductionId?: string;
    matchId?: string;
  }>();

  const { data: intro } = useIntroduction(introductionId ?? null);

  // The match_id comes either from route params (set at decision time) or from the fetched intro
  const resolvedMatchId = matchId || intro?.match_id || null;
  const partnerName = intro?.partner?.display_name ?? null;

  const handleStartConversation = () => {
    if (resolvedMatchId) {
      router.replace({
        pathname: '/(app)/chat' as never,
        params: { matchId: resolvedMatchId },
      });
    } else {
      // Fallback to matches list if matchId not available
      router.replace('/(app)/(tabs)/matches' as never);
    }
  };

  const handleViewProfile = () => {
    if (introductionId) {
      router.push({
        pathname: '/(app)/shimgilina-introduction-detail' as never,
        params: { introductionId },
      });
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={[styles.inner, { paddingBottom: spacing.md }]}>
        {/* Hero */}
        <View style={[styles.heroWrap, { backgroundColor: isDark ? th.surface : colors.backgroundLavender }]}>
          <LinearGradient
            colors={[colors.primary + '22', colors.primaryLight + '11']}
            style={StyleSheet.absoluteFill}
          />
          {/* Heart rings */}
          <View style={[styles.heartRing, { borderColor: colors.primary + '40' }]}>
            <View style={[styles.heartRingInner, { borderColor: colors.primary + '60' }]}>
              <Ionicons name="heart" size={52} color={colors.primary} />
            </View>
          </View>
          <Image source={HERO} style={styles.heroImg} contentFit="contain" />
        </View>

        {/* Title */}
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MUTUAL INTEREST</Text>
        <Text style={[styles.title, { color: th.text }]}>It's a Match!</Text>
        <Text style={[styles.subtitle, { color: th.textSecondary }]}>
          {partnerName
            ? `You and ${partnerName} are interested in each other.`
            : 'You and your match are both interested in each other.'}
        </Text>

        {/* CTAs */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStartConversation}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryGrad}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
            <Text style={styles.primaryText}>Start Conversation</Text>
          </LinearGradient>
        </TouchableOpacity>

        {introductionId && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: th.border }]}
            onPress={handleViewProfile}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryText, { color: th.textSecondary }]}>View Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
    <MatchmakingTabBar activeTab="introductions" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  inner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  heroWrap: {
    width: '100%',
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heartRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartRingInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImg: { width: 120, height: 120 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  primaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 18,
  },
  primaryText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  secondaryText: { fontSize: 16, fontWeight: '600' },
});
