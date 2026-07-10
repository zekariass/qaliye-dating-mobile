import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TOTAL_STARS = 12;
const STAR_RADIUS = 16; // distance from button center to star center

interface Props {
  onRewind: () => void;
  onPass: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  disabled?: boolean;
}

const BTN = 48;

export default function CardActionButtons({ onRewind, onPass, onLike, onSuperLike, disabled }: Props) {
  const { colors: th } = useTheme();
  return (
    <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.28)' }]}>
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
          <Ionicons name="heart" size={20} color="#FF2D55" />
        </TouchableOpacity>

        {/* SuperLike */}
        <TouchableOpacity
          style={[styles.button, styles.superLikeButton, { backgroundColor: th.surface }]}
          onPress={onSuperLike}
          disabled={disabled}
          activeOpacity={0.75}
          accessibilityLabel="Super like profile"
        >
          <Ionicons name="star" size={26} color="#FFFFFF" />
          {Array.from({ length: TOTAL_STARS }).map((_, i) => {
            const angle = (i / TOTAL_STARS) * 2 * Math.PI - Math.PI / 2;
            const x = Math.cos(angle) * STAR_RADIUS;
            const y = Math.sin(angle) * STAR_RADIUS;
            return (
              <Ionicons
                key={i}
                name="star"
                size={5}
                color={colors.primary}
                style={[
                  styles.star,
                  {
                    transform: [{ translateX: x }, { translateY: y }],
                  },
                ]}
              />
            );
          })}
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
  superLikeButton: {
    backgroundColor: '#EBF5FF',
  },
  icon: {
    fontSize: 18,
    fontWeight: '700',
  },
  rewindIcon: {
    color: '#F97316',
    fontSize: 20,
  },
  passIcon: {
    color: colors.danger,
    fontSize: 18,
  },
  star: {
    position: 'absolute',
  },
});
