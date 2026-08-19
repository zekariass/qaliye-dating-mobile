import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

interface Props {
  /** Circle dot variant size (default). */
  size?: number;
  /** When true renders a full pill badge: icon + "Verified" label. */
  pill?: boolean;
  /**
   * Used together with `pill`.
   * false (default) — light background, blue text (profile headers, light surfaces).
   * true            — solid blue background, white text (dark photo overlays).
   */
  dark?: boolean;
}

export default function VerifiedBadge({ size = 14, pill = false, dark = false }: Props) {
  if (pill) {
    return (
      <View style={[styles.pill, dark && styles.pillDark]}>
        <Ionicons
          name="shield-checkmark"
          size={12}
          color={dark ? '#FFFFFF' : colors.verifiedBlue}
        />
        <Text style={[styles.pillText, dark && styles.pillTextDark]}>Verified</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.check, { fontSize: size * 0.65 }]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Circle dot (original) ────────────────────────────────────── */
  badge: {
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 14,
  },

  /* ── Pill variant ─────────────────────────────────────────────── */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 128, 237, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(47, 128, 237, 0.28)',
  },
  pillDark: {
    backgroundColor: 'rgba(47, 128, 237, 0.88)',
    borderColor: 'rgba(47, 128, 237, 0.5)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.verifiedBlue,
    letterSpacing: 0.1,
  },
  pillTextDark: {
    color: '#FFFFFF',
  },
});
