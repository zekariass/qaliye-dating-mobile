/**
 * VideoCallStatusBanner — slim banner under the chat header showing the live
 * video-call request state for this match.
 *
 * Mirrors the inbox badge semantics:
 *   can_accept → "Accept video call"        (primary / actionable)
 *   can_join   → "Video call in progress"   (success)
 *   pending outgoing → "Video call request sent" (info blue)
 *
 * Tapping opens the video-call hub for the match. Hidden when no live
 * request exists.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';
import { useLiveVideoCallRequest } from '@/hooks/videoCall/useVideoCallRequests';

const BANNER_STATE = {
  respond: {
    icon: (audio: boolean) => (audio ? 'call' : 'videocam'),
    label: (audio: boolean) => (audio ? 'Accept audio call' : 'Accept video call'),
    sub: 'Tap to respond',
    bg: colors.primary,
  },
  join: {
    icon: (audio: boolean) => (audio ? 'call' : 'videocam'),
    label: (audio: boolean) => (audio ? 'Audio call in progress' : 'Video call in progress'),
    sub: 'Tap to join',
    bg: colors.success,
  },
  waiting: {
    icon: (audio: boolean) => (audio ? 'call-outline' : 'videocam-outline'),
    label: (audio: boolean) => (audio ? 'Audio call request sent' : 'Video call request sent'),
    sub: 'Waiting for response',
    bg: colors.verifiedBlue,
  },
} as const;

type Props = {
  matchId: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export function VideoCallStatusBanner({ matchId, displayName, avatarUrl }: Props) {
  const router = useRouter();
  const { liveRequest } = useLiveVideoCallRequest(matchId);

  if (!liveRequest) return null;

  const state = liveRequest.can_accept
    ? 'respond'
    : liveRequest.can_join
      ? 'join'
      : 'waiting';
  const isAudio = liveRequest.call_type === 'AUDIO';
  const meta = BANNER_STATE[state];
  const icon = meta.icon(isAudio);
  const label = meta.label(isAudio);

  const handlePress = () => {
    router.push({
      pathname: '/(app)/video-call' as never,
      params: {
        matchId,
        displayName: displayName ?? '',
        avatarUrl: avatarUrl ?? '',
        requestId: liveRequest.id,
      },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.banner, { backgroundColor: meta.bg }]}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${meta.sub}`}
    >
      <Ionicons name={icon} size={22} color="#FFF" />
      <View style={styles.textWrap}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.sub} numberOfLines={1}>{meta.sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  textWrap: { flex: 1 },
  label: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
});
