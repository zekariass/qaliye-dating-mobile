import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontSize } from '@/constants/theme';
import type { VoicePlayerDownloadUrlFetcher } from '@/hooks/support/useVoicePlayer';
import { useVoicePlayer } from '@/hooks/support/useVoicePlayer';
import { useTheme } from '@/hooks/use-theme';
import type { SupportAttachment } from '@/types/support';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function isVoiceAttachment(att: SupportAttachment): boolean {
  if (att.attachment_kind === 'VOICE') return true;
  return att.content_type.startsWith('audio/');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SupportVoiceMessage({
  attachment,
  isOutgoing,
  isActive,
  activeVoiceId,
  onStopAllOthers,
  downloadUrlFetcher,
}: {
  attachment: SupportAttachment;
  isOutgoing: boolean;
  isActive: boolean;
  activeVoiceId: string | null;
  onStopAllOthers: (id: string) => void;
  downloadUrlFetcher?: VoicePlayerDownloadUrlFetcher;
}) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  const isCurrentlyActive = activeVoiceId === attachment.id;
  const player = useVoicePlayer(
    attachment,
    isActive && isCurrentlyActive,
    onStopAllOthers,
    downloadUrlFetcher,
  );

  const accentColor = isOutgoing ? '#FFFFFF' : colors.primary;
  const mutedColor = isOutgoing ? 'rgba(255,255,255,0.7)' : th.textMuted;

  const handlePress = () => {
    if (player.isPlaying) {
      player.pause();
    } else if (player.isPaused) {
      player.resume();
    } else {
      player.play();
    }
  };

  const a11yLabel = [
    t('support.voiceMessage'),
    player.isPlaying ? t('support.playingVoice') : t('support.playVoiceMessage'),
    formatDuration(player.duration),
  ].join('. ');

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={player.isLoading}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled: player.isLoading }}
        style={styles.playBtn}
      >
        {player.isLoading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <Ionicons
            name={player.isPlaying ? 'pause' : 'play'}
            size={20}
            color={accentColor}
          />
        )}
      </TouchableOpacity>

      <View style={styles.rightSection}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={Math.max(player.duration, 0.1)}
          value={player.currentTime}
          onSlidingComplete={player.seekTo}
          minimumTrackTintColor={accentColor}
          maximumTrackTintColor={isOutgoing ? 'rgba(255,255,255,0.5)' : isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'}
          thumbTintColor={accentColor}
          accessibilityLabel={t('support.seekVoice')}
        />
        <Text style={[styles.duration, { color: mutedColor }]}>
          {formatDuration(player.currentTime)} / {formatDuration(player.duration)}
        </Text>
      </View>

      {player.error && (
        <Text style={[styles.errorText, { color: isOutgoing ? '#FFD0D0' : colors.danger }]}>
          {player.error.message}
        </Text>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: 180,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rightSection: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  slider: {
    width: '100%',
    height: 24,
  },
  duration: {
    fontSize: fontSize.xs - 1,
    textAlign: 'right',
  },
  errorText: {
    fontSize: fontSize.xs - 1,
    marginTop: 2,
    flex: 1,
  },
});

export { isVoiceAttachment };

