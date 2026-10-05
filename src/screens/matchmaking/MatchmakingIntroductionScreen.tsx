/**
 * Screen 8 — Introduction Proposal
 *
 * Entered from an INTRODUCTION_PROPOSED notification (deep-link).
 * Shows partner profile card, compatibility scores, matchmaker's reason,
 * decision expiry countdown, and the final INTERESTED / NOT_INTERESTED CTA.
 *
 * Decision is one-time and cannot be changed.
 * After mutual interest → routes to existing chat/matches.
 */
import MatchmakingTabBar from '@/components/matchmaking/MatchmakingTabBar';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themedAlert } from '@/components/common/ThemedAlert';
import { colors, radius, spacing } from '@/constants/theme';
import { useIntroduction, useIntroductionDecision } from '@/hooks/matchmaking/useMatchmakingIntroduction';
import { useTheme } from '@/hooks/use-theme';
import type { MatchDetail } from '@/types/matchmaking';
import { extractApiError, getApiErrorMessage } from '@/utils/apiError';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeRemaining(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.ceil(ms / 60_000)}m remaining`;
  if (hours < 24) return `${hours}h remaining`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}d ${remainHours}h remaining` : `${days}d remaining`;
}

function parseMatchDetails(raw: string | null | undefined): MatchDetail[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as MatchDetail[]; } catch { return []; }
}

function CompatibilityBar({ value, label }: { value: number; label: string }) {
  const { colors: th } = useTheme();
  return (
    <View style={styles.compatItem}>
      <Text style={[styles.compatPct, { color: colors.primary }]}>{value}%</Text>
      <Text style={[styles.compatLabel, { color: th.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function MatchmakingIntroductionScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { introductionId } = useLocalSearchParams<{ introductionId?: string }>();
  const { data: intro, isLoading, refetch } = useIntroduction(introductionId ?? null);
  const decisionMutation = useIntroductionDecision(introductionId ?? '');
  const [decidedLocally, setDecidedLocally] = useState<'INTERESTED' | 'NOT_INTERESTED' | null>(null);

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const handleDecision = useCallback((d: 'INTERESTED' | 'NOT_INTERESTED') => {
    const isInterested = d === 'INTERESTED';
    themedAlert({
      title: 'Are you interested?',
      message: 'Your decision will be shared with the matchmaker and the other person. This decision is final and cannot be changed.',
      icon: isInterested ? 'heart' : 'close-circle',
      iconColor: isInterested ? colors.primary : colors.danger,
      buttons: [
        {
          text: isInterested ? "Yes, I'm Interested" : 'No, Not Interested',
          style: isInterested ? 'default' : 'destructive',
          onPress: () => {
            setDecidedLocally(d);
            decisionMutation.mutate({ decision: d }, {
              onSuccess: (updated) => {
                if (updated.status === 'MATCHED' && updated.match_id) {
                  // Both interested → navigate to the existing match/chat
                  router.replace({
                    pathname: '/(app)/shimgilina-mutual-interest' as never,
                    params: { introductionId: updated.id, matchId: updated.match_id },
                  });
                }
                // Otherwise stay on screen — it will show the decided/waiting state
              },
              onError: (err) => {
                setDecidedLocally(null);
                const detail = extractApiError(err);
                themedAlert({
                  title: 'Could not submit decision',
                  message: getApiErrorMessage(detail),
                  icon: 'alert-circle',
                  iconColor: colors.danger,
                });
              },
            });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }, [decisionMutation, router]);

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

  if (!intro) {
    return (
      <View style={[styles.root, { backgroundColor: th.background }]}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: th.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={th.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: th.text }]}>Introduction</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.errorState}>
            <Ionicons name="hourglass-outline" size={48} color={colors.primary} />
            <Text style={[styles.errorTitle, { color: th.text }]}>Introduction not found</Text>
            <Text style={[styles.errorSub, { color: th.textSecondary }]}>
              This introduction may have expired or been cancelled.
            </Text>
          </View>
        </SafeAreaView>
        <MatchmakingTabBar activeTab="introductions" />
      </View>
    );
  }

  const partner = intro.partner;
  const myDecision = decidedLocally ?? (
    (intro.your_decision === 'INTERESTED' || intro.your_decision === 'NOT_INTERESTED')
      ? intro.your_decision
      : null
  );
  const alreadyDecided = !!myDecision;
  const isProposed = intro.status === 'PROPOSED';
  const isMatched = intro.status === 'MATCHED';
  const isDeclined = ['DECLINED', 'CANCELLED', 'EXPIRED'].includes(intro.status);
  const matchDetails = parseMatchDetails(intro.match_details);
  const isWaiting = alreadyDecided && myDecision === 'INTERESTED' && intro.partner_decision === 'PENDING';

  return (
    <View style={[styles.root, { backgroundColor: th.background }]}>
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: th.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: th.text }]}>Introduction</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Matchmaker badge */}
        <View style={[styles.matchmakerBadge, { backgroundColor: colors.primary + '14' }]}>
          <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
          <Text style={[styles.matchmakerText, { color: colors.primary }]}>
            Reviewed by our matchmakers
          </Text>
        </View>

        {/* Deadline badge */}
        {intro.decision_expires_at && !alreadyDecided && (
          <View style={[styles.deadlineBadge, { borderColor: colors.warning + '80', backgroundColor: colors.warning + '14' }]}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <Text style={[styles.deadlineText, { color: colors.warning }]}>
              {timeRemaining(intro.decision_expires_at)}
            </Text>
          </View>
        )}

        {/* Profile card */}
        <View style={[styles.profileCard, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border }]}>
          {partner?.primary_photo_url ? (
            <Image
              source={{ uri: partner.primary_photo_url }}
              style={styles.profilePhoto}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.profilePhotoPlaceholder, { backgroundColor: isDark ? th.backgroundElement : colors.backgroundLavender }]}>
              <Ionicons name="person" size={60} color={colors.primary + '50'} />
            </View>
          )}

          {partner && (
            <View style={styles.profileInfo}>
              {/* Name + verified */}
              <View style={styles.nameRow}>
                <Text style={[styles.profileName, { color: th.text }]}>
                  {partner.display_name}{partner.age != null ? `, ${partner.age}` : ''}
                </Text>
                {partner.is_verified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: colors.verifiedBlue + '18' }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.verifiedBlue} />
                    <Text style={[styles.verifiedText, { color: colors.verifiedBlue }]}>Verified</Text>
                  </View>
                )}
              </View>

              {/* Location */}
              {(partner.address?.city || partner.address?.country_name) && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color={th.textSecondary} />
                  <Text style={[styles.infoText, { color: th.textSecondary }]}>
                    {[partner.address?.city, partner.address?.country_name].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}

              {/* Occupation */}
              {partner.occupation && (
                <View style={styles.infoRow}>
                  <Ionicons name="briefcase-outline" size={14} color={th.textSecondary} />
                  <Text style={[styles.infoText, { color: th.textSecondary }]}>{partner.occupation}</Text>
                </View>
              )}

              {/* Religion */}
              {partner.religion && (
                <View style={styles.infoRow}>
                  <Ionicons name="leaf-outline" size={14} color={th.textSecondary} />
                  <Text style={[styles.infoText, { color: th.textSecondary }]}>{partner.religion}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Compatibility */}
        <View style={[styles.compatCard, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border }]}>
          <Text style={[styles.compatTitle, { color: th.textSecondary }]}>Compatibility</Text>
          <View style={styles.compatRow}>
            <CompatibilityBar value={intro.forward_percentage ?? 0} label="You → Match" />
            <View style={[styles.compatDivider, { backgroundColor: th.border }]} />
            <CompatibilityBar value={intro.reverse_percentage ?? 0} label="Match → You" />
            <View style={[styles.compatDivider, { backgroundColor: th.border }]} />
            <CompatibilityBar value={intro.overall_percentage ?? 0} label="Overall" />
          </View>
        </View>

        {/* Matchmaker's reason */}
        {(intro.reason || matchDetails.length > 0) && (
          <View style={[styles.reasonCard, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border }]}>
            <Text style={[styles.reasonTitle, { color: th.text }]}>Why this introduction?</Text>
            {intro.reason && (
              <Text style={[styles.reasonText, { color: th.textSecondary }]}>{intro.reason}</Text>
            )}
            {matchDetails.length > 0 && (
              <View style={styles.matchDetailsList}>
                {matchDetails.filter((d) => d.matched).map((d, i) => (
                  <View key={i} style={styles.matchDetailRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={[styles.matchDetailText, { color: th.text }]}>{d.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* View full profile */}
        {partner && (
          <TouchableOpacity
            style={[styles.viewFullBtn, { borderColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/(app)/shimgilina-introduction-detail' as never,
              params: { introductionId: intro.id },
            })}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewFullText, { color: colors.primary }]}>View Full Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Decided state — show waiting or result */}
        {alreadyDecided && (
          <View style={[styles.decidedCard, { backgroundColor: isDark ? th.surface : '#FFF', borderColor: th.border }]}>
            {myDecision === 'INTERESTED' ? (
              <>
                <View style={[styles.decidedIcon, { backgroundColor: colors.primary + '14' }]}>
                  <Ionicons name="heart" size={24} color={colors.primary} />
                </View>
                <View style={styles.decidedText}>
                  <Text style={[styles.decidedTitle, { color: th.text }]}>You expressed interest</Text>
                  {isWaiting && (
                    <Text style={[styles.decidedSub, { color: th.textSecondary }]}>
                      Waiting for their response...
                    </Text>
                  )}
                  {isMatched && (
                    <Text style={[styles.decidedSub, { color: colors.success }]}>
                      It's a match!
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <View style={[styles.decidedIcon, { backgroundColor: colors.danger + '14' }]}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </View>
                <View style={styles.decidedText}>
                  <Text style={[styles.decidedTitle, { color: th.text }]}>You declined</Text>
                  <Text style={[styles.decidedSub, { color: th.textSecondary }]}>
                    This introduction has ended.
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Matched — open chat */}
        {isMatched && intro.match_id && (
          <TouchableOpacity
            style={[styles.chatBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/(app)/chat' as never,
              params: { matchId: intro.match_id! },
            })}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#FFF" />
            <Text style={styles.chatBtnText}>Start Conversation</Text>
          </TouchableOpacity>
        )}

        {/* Terminal state */}
        {isDeclined && (
          <View style={[styles.terminalCard, { backgroundColor: colors.danger + '08', borderColor: colors.danger + '30' }]}>
            <Ionicons name="close-circle" size={24} color={colors.danger} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.terminalTitle, { color: th.text }]}>Introduction ended</Text>
              <Text style={[styles.terminalSub, { color: th.textSecondary }]}>
                This introduction has been declined, cancelled, or expired.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Decision buttons — only visible for PROPOSED + undecided */}
      {isProposed && !alreadyDecided && (
        <View style={[styles.decisionFooter, { backgroundColor: th.background, borderTopColor: th.border }]}>
          {decisionMutation.isPending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.notInterestedBtn, { borderColor: th.border }]}
                onPress={() => handleDecision('NOT_INTERESTED')}
                activeOpacity={0.7}
              >
                <Text style={[styles.notInterestedText, { color: th.textSecondary }]}>Not Interested</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.interestedBtn}
                onPress={() => handleDecision('INTERESTED')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.interestedGrad}
                >
                  <Ionicons name="heart" size={18} color="#FFF" />
                  <Text style={styles.interestedText}>Interested</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
    <MatchmakingTabBar activeTab="introductions" />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  errorTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  errorSub: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl + 80, gap: spacing.md },
  matchmakerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    gap: 5,
  },
  matchmakerText: { fontSize: 12, fontWeight: '700' },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 5,
  },
  deadlineText: { fontSize: 12, fontWeight: '600' },
  profileCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  profilePhoto: { width: '100%', height: 320 },
  profilePhotoPlaceholder: { width: '100%', height: 200, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { padding: spacing.lg, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  profileName: { fontSize: 22, fontWeight: '800' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  verifiedText: { fontSize: 11, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { fontSize: 14 },
  compatCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  compatTitle: { fontSize: 13, fontWeight: '700' },
  compatRow: { flexDirection: 'row', alignItems: 'center' },
  compatItem: { flex: 1, alignItems: 'center', gap: 2 },
  compatPct: { fontSize: 22, fontWeight: '900' },
  compatLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  compatDivider: { width: StyleSheet.hairlineWidth, height: 40, marginHorizontal: 4 },
  reasonCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  reasonTitle: { fontSize: 15, fontWeight: '700' },
  reasonText: { fontSize: 14, lineHeight: 21 },
  matchDetailsList: { gap: 8 },
  matchDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchDetailText: { fontSize: 14 },
  viewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  viewFullText: { fontSize: 15, fontWeight: '600' },
  decidedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  decidedIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  decidedText: { flex: 1 },
  decidedTitle: { fontSize: 14, fontWeight: '700' },
  decidedSub: { fontSize: 12, marginTop: 2 },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    paddingVertical: 16,
  },
  chatBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  terminalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  terminalTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  terminalSub: { fontSize: 12, lineHeight: 17 },
  decisionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  notInterestedBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  notInterestedText: { fontSize: 15, fontWeight: '600' },
  interestedBtn: { flex: 2, borderRadius: radius.xl, overflow: 'hidden' },
  interestedGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  interestedText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
