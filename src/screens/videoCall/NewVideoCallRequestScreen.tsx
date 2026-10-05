/**
 * NewVideoCallRequestScreen — Confirmation before creating a video call request.
 *
 * POST /api/v1/video-call-requests
 * Endpoint is idempotent — returns existing live request if one already exists.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { themedError } from '@/components/common/ThemedAlert';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreateVideoCallRequest } from '@/hooks/videoCall/useVideoCallRequests';

export default function NewVideoCallRequestScreen() {
  const router = useRouter();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const { matchId, displayName, avatarUrl, age, city, callType } = useLocalSearchParams<{
    matchId: string;
    displayName: string;
    avatarUrl?: string;
    age?: string;
    city?: string;
    callType?: string;
  }>();

  const isAudio = callType === 'AUDIO';
  const typeIcon: React.ComponentProps<typeof Ionicons>['name'] = isAudio ? 'call' : 'videocam';
  const typeColor = isAudio ? colors.verifiedBlue : colors.success;

  const [avatarFailed, setAvatarFailed] = useState(false);

  const createMutation = useCreateVideoCallRequest(matchId ?? '');

  const handleSend = () => {
    createMutation.mutate(
      { match_id: matchId ?? '', call_type: isAudio ? 'AUDIO' : 'VIDEO' },
      {
        onSuccess: (request) => {
          // Navigate to the detail screen which shows the pending state
          router.replace({
            pathname: '/(app)/video-call-detail' as never,
            params: {
              matchId,
              requestId: request.id,
              displayName,
              avatarUrl: avatarUrl ?? '',
              callType: request.call_type,
            },
          });
        },
        onError: (err: any) => {
          const status = err?.response?.status;
          const raw = err?.response?.data?.error;
          const code = typeof raw === 'string' ? raw : raw?.code;
          if (status === 402 || String(code).toUpperCase().includes('CREDIT')) {
            themedError('Insufficient Credits', 'You need more credits to send a video call request.');
          } else {
            themedError('Could Not Send', 'Something went wrong. Please try again.');
          }
        },
      },
    );
  };

  const handleCancel = () => router.back();

  const subtitle = [age, city].filter(Boolean).join(' · ');

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: th.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleCancel} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={th.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Ionicons name={typeIcon} size={24} color={typeColor} />
          <Text style={[styles.headerTitle, { color: th.text }]}>{isAudio ? 'Audio Call' : 'Video Call'}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero avatar with ring + camera badge */}
        <View style={styles.heroSection}>
          <View style={[styles.avatarRing, { borderColor: colors.primaryLight + '55', shadowColor: colors.primary }]}>
            <View style={[styles.avatarRingInner, { borderColor: colors.primary + '30' }]}>
              {avatarUrl && !avatarFailed ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#3A2A5C' : colors.backgroundLavender }]}>
                  <Ionicons name="person" size={48} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={[styles.camBadge, { borderColor: th.background, backgroundColor: typeColor }]}>
              <Ionicons name={typeIcon} size={19} color="#FFF" />
            </View>
          </View>

          <Text style={[styles.partnerName, { color: th.text }]}>{displayName}</Text>
          {!!subtitle && (
            <Text style={[styles.partnerSub, { color: th.textSecondary }]}>{subtitle}</Text>
          )}
        </View>

        {/* Prompt */}
        <View style={styles.promptSection}>
          <Text style={[styles.prompt, { color: th.text }]}>
            {isAudio ? 'Send an audio call request?' : 'Send a video call request?'}
          </Text>
          <Text style={[styles.description, { color: th.textSecondary }]}>
            {displayName} will be notified and can accept or decline.
          </Text>
        </View>

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? th.surface : '#FAF7FF', borderColor: th.border }]}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.infoText, { color: th.textSecondary }]}>
              Expires in ~48 hours if unanswered
            </Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: th.border }]} />
          <View style={styles.infoRow}>
            <View style={[styles.infoIcon, { backgroundColor: colors.success + '15' }]}>
              <Ionicons name="wallet-outline" size={16} color={colors.success} />
            </View>
            <Text style={[styles.infoText, { color: th.textSecondary }]}>
              You're only charged when the call connects
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSend}
          activeOpacity={0.85}
          disabled={createMutation.isPending}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.sendBtn, createMutation.isPending && { opacity: 0.7 }]}
          >
            {createMutation.isPending
              ? <ActivityIndicator color="#FFF" />
              : (
                <>
                  <Ionicons name={typeIcon} size={22} color="#FFF" />
                  <Text style={styles.sendBtnText}>Send Request</Text>
                </>
              )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          activeOpacity={0.7}
          disabled={createMutation.isPending}
        >
          <Text style={[styles.cancelText, { color: th.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },

  // ── Hero avatar ─────────────────────────────────────────────────────────
  heroSection: { alignItems: 'center', gap: spacing.sm },
  avatarRing: {
    padding: 6,
    borderRadius: 76,
    borderWidth: 1.5,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: spacing.sm,
  },
  avatarRingInner: {
    padding: 4,
    borderRadius: 66,
    borderWidth: 1,
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  camBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  partnerName: { fontSize: 22, fontWeight: '800' },
  partnerSub: { fontSize: 14 },

  // ── Prompt ──────────────────────────────────────────────────────────────
  promptSection: { alignItems: 'center', gap: 6 },
  prompt: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 20, textAlign: 'center' },

  // ── Info card ───────────────────────────────────────────────────────────
  infoCard: {
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    width: '100%',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  infoDivider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.xl,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sendBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 15, fontWeight: '500' },
});
