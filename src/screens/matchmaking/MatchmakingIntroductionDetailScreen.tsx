/**
 * Screen 9 — Introduction Full Profile
 *
 * Full-screen profile view for the matched partner.
 * Photo carousel, bio, lifestyle details, compatibility matrix.
 * Read-only — decision happens on the Introduction screen.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
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
import type { MatchDetail } from '@/types/matchmaking';
import {
    EDUCATION_API_TO_LABEL,
    RELIGION_API_TO_LABEL,
} from '@/utils/profileMappers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function parseMatchDetails(raw: string | null | undefined): MatchDetail[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as MatchDetail[]; } catch { return []; }
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={th.textMuted} />
      <Text style={[styles.infoLabel, { color: th.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: th.text }]}>{value}</Text>
    </View>
  );
}

export default function MatchmakingIntroductionDetailScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { introductionId } = useLocalSearchParams<{ introductionId?: string }>();
  const { data: intro, isLoading } = useIntroduction(introductionId ?? null);
  const [photoIndex, setPhotoIndex] = useState(0);

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: th.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
        </SafeAreaView>
        <MatchmakingTabBar activeTab="introductions" />
      </View>
    );
  }

  if (!intro?.partner) {
    return (
      <View style={[styles.root, { backgroundColor: th.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={22} color={th.text} />
          </TouchableOpacity>
          <View style={styles.errorState}>
            <Text style={[styles.errorText, { color: th.textSecondary }]}>Profile unavailable</Text>
          </View>
        </SafeAreaView>
        <MatchmakingTabBar activeTab="introductions" />
      </View>
    );
  }

  const partner = intro.partner;
  const photos = partner.photos ?? [];
  const allPhotos = partner.primary_photo_url
    ? [partner.primary_photo_url, ...photos.filter((p) => p.signed_url !== partner.primary_photo_url).map((p) => p.signed_url)]
    : photos.map((p) => p.signed_url);

  const matchDetails = parseMatchDetails(intro.match_details);
  const matchedDetails = matchDetails.filter((d) => d.matched);

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Back button floating over photo */}
      <TouchableOpacity
        style={[styles.floatingBack, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color="#FFF" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={styles.photoContainer}>
          {allPhotos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setPhotoIndex(idx);
              }}
            >
              {allPhotos.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={[styles.photo, { width: SCREEN_WIDTH }]}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: isDark ? th.surface : colors.backgroundLavender }]}>
              <Ionicons name="person" size={72} color={colors.primary + '40'} />
            </View>
          )}

          {/* Photo dots */}
          {allPhotos.length > 1 && (
            <View style={styles.photoDots}>
              {allPhotos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.photoDot,
                    { backgroundColor: i === photoIndex ? '#FFF' : 'rgba(255,255,255,0.5)' },
                    i === photoIndex && styles.photoDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Name, age, verified */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.profileName, { color: th.text }]}>
                {partner.display_name}
                {partner.age != null ? ` · ${partner.age}` : ''}
              </Text>
              {partner.is_verified && (
                <Ionicons name="checkmark-circle" size={20} color={colors.verifiedBlue} />
              )}
            </View>

            {(partner.address?.city || partner.address?.country_name) && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={th.textSecondary} />
                <Text style={[styles.locationText, { color: th.textSecondary }]}>
                  {[partner.address?.city, partner.address?.country_name].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}

            {partner.occupation && (
              <Text style={[styles.occupationText, { color: th.textSecondary }]}>{partner.occupation}</Text>
            )}
          </View>

          {/* About */}
          {partner.bio && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: th.textMuted }]}>About</Text>
              <View style={[styles.sectionDivider, { backgroundColor: th.border }]} />
              <Text style={[styles.bioText, { color: th.text }]}>{partner.bio}</Text>
            </View>
          )}

          {/* Lifestyle */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: th.textMuted }]}>Lifestyle</Text>
            <View style={[styles.sectionDivider, { backgroundColor: th.border }]} />

            <View style={[styles.infoCard, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border }]}>
              {partner.religion && (
                <InfoRow icon="leaf-outline" label="Religion" value={RELIGION_API_TO_LABEL[partner.religion] ?? partner.religion} />
              )}
              {partner.education_level && (
                <InfoRow icon="school-outline" label="Education" value={EDUCATION_API_TO_LABEL[partner.education_level] ?? partner.education_level} />
              )}
              {partner.marital_status && (
                <InfoRow
                  icon="people-outline"
                  label="Marital status"
                  value={partner.marital_status.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                />
              )}
              {partner.has_children != null && (
                <InfoRow icon="people-outline" label="Children" value={partner.has_children ? 'Has children' : 'No children'} />
              )}
              {partner.languages && partner.languages.length > 0 && (
                <InfoRow
                  icon="chatbubble-outline"
                  label="Languages"
                  value={partner.languages.map((l) => l.name).join(', ')}
                />
              )}
              {partner.interests && partner.interests.length > 0 && (
                <InfoRow
                  icon="heart-outline"
                  label="Interests"
                  value={partner.interests.join(', ')}
                />
              )}
            </View>
          </View>

          {/* Compatibility */}
          {matchedDetails.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: th.textMuted }]}>Compatibility</Text>
              <View style={[styles.sectionDivider, { backgroundColor: th.border }]} />

              <View style={[styles.infoCard, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border }]}>
                {matchedDetails.map((d, i) => (
                  <View key={i} style={[styles.compatRow, i > 0 && { borderTopColor: th.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <Text style={[styles.compatLabel, { color: th.text }]}>{d.label}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    <MatchmakingTabBar activeTab="introductions" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  closeBtn: { padding: spacing.md },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15 },
  floatingBack: {
    position: 'absolute',
    top: 52,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  photoContainer: { position: 'relative' },
  photo: { height: 420 },
  photoPlaceholder: { height: 280, alignItems: 'center', justifyContent: 'center' },
  photoDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  photoDot: { width: 6, height: 6, borderRadius: 3 },
  photoDotActive: { width: 18 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.lg },
  nameSection: { gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  profileName: { fontSize: 24, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { fontSize: 14 },
  occupationText: { fontSize: 14 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  sectionDivider: { height: StyleSheet.hairlineWidth },
  bioText: { fontSize: 15, lineHeight: 23 },
  infoCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  infoLabel: { fontSize: 13, width: 100, flexShrink: 0 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '500' },
  compatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  compatLabel: { fontSize: 14 },
});
