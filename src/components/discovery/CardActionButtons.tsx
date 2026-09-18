import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { rs, useTabletScale } from '@/utils/responsive';

interface Props {
  onRewind: () => void;
  onPass: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  onSuperMessage: () => void;
  disabled?: boolean;
}

const BTN = 40;

export default function CardActionButtons({ onRewind, onPass, onLike, onSuperLike, onSuperMessage, disabled }: Props) {
  const { colors: th } = useTheme();
  const scale = useTabletScale();
  const btnSize = rs(BTN, scale);
  const btnStyle = { width: btnSize, height: btnSize, borderRadius: btnSize / 2 };
  return (
    <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
      <View style={styles.container}>
        {/* Rewind */}
        <TouchableOpacity
          style={[styles.button, btnStyle, { backgroundColor: th.surface }]}
          onPress={onRewind}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Rewind profile"
        >
          <Text style={[styles.icon, styles.rewindIcon, { fontSize: rs(24, scale), transform: [{ rotate: '-90deg' }] }]}>↺</Text>
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity
          style={[styles.button, btnStyle, styles.likeButton, { backgroundColor: th.backgroundSelected }]}
          onPress={onLike}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Like profile"
        >
          <Text style={[styles.emojiIcon, { fontSize: rs(22, scale), transform: [{ rotate: '15deg' }] }]}>🌹</Text>
        </TouchableOpacity>

        {/* SuperLike */}
        <TouchableOpacity
          style={[styles.button, btnStyle, { backgroundColor: th.backgroundSelected }]}
          onPress={onSuperLike}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Super like profile"
        >
          <Text style={[styles.emojiIcon, { fontSize: rs(22, scale) }]}>💍</Text>
        </TouchableOpacity>

        {/* Super Message */}
        <TouchableOpacity
          style={[styles.button, btnStyle, { backgroundColor: th.surface }]}
          onPress={onSuperMessage}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Send super message"
        >
          <Text style={[styles.emojiIcon, { fontSize: rs(22, scale) }]}>💌</Text>
        </TouchableOpacity>

        {/* Pass */}
        <TouchableOpacity
          style={[styles.button, btnStyle, { backgroundColor: th.surface }]}
          onPress={onPass}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Pass profile"
        >
          <Text style={[styles.icon, styles.passIcon, { fontSize: rs(20, scale) }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    padding: 8,
    borderRadius: 22,
    alignSelf: 'center',
  },
  container: {
    gap: 12,
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
    fontSize: 24,
    fontWeight: '700',
  },
  emojiIcon: {
    includeFontPadding: false,
    textAlign: 'center',
  },
  rewindIcon: {
    color: '#F97316',
    fontSize: 28,
  },
  passIcon: {
    color: colors.danger,
    fontSize: 24,
  },

});
