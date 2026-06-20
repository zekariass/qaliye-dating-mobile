import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  onRewind: () => void;
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
}

const BTN = 58;

export default function CardActionButtons({ onRewind, onPass, onLike, disabled }: Props) {
  const { colors: th } = useTheme();
  return (
    <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.20)' }]}>
      <View style={styles.container}>
        {/* Rewind */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: th.surface }]}
          onPress={onRewind}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Rewind profile"
        >
          <Text style={[styles.icon, styles.rewindIcon]}>↺</Text>
        </TouchableOpacity>

        {/* Pass */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: th.surface }]}
          onPress={onPass}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Pass profile"
        >
          <Text style={[styles.icon, styles.passIcon]}>✕</Text>
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity
          style={[styles.button, styles.likeButton, { backgroundColor: th.backgroundSelected }]}
          onPress={onLike}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Like profile"
        >
          <Text style={[styles.icon, styles.likeIcon]}>♥</Text>
          <Text style={styles.sparkle}>✦</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    padding: 10,
    borderRadius: 18,
    alignSelf: 'center',
  },
  container: {
    gap: 14,
    alignItems: 'center',
  },
  button: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  likeButton: {
    backgroundColor: '#F5EEFF',
  },
  icon: {
    fontSize: 22,
    fontWeight: '700',
  },
  rewindIcon: {
    color: '#F97316',
    fontSize: 24,
  },
  passIcon: {
    color: colors.danger,
    fontSize: 22,
  },
  likeIcon: {
    color: colors.primary,
    fontSize: 22,
  },
  sparkle: {
    position: 'absolute',
    top: 8,
    right: 10,
    fontSize: 9,
    color: colors.primary,
  },
});
