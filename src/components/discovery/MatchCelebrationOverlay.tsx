import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    Keyframe,
} from 'react-native-reanimated';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  name: string;
  photoUrl?: string;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

const enterKeyframe = new Keyframe({
  0:   { opacity: 0, scale: 0.7, translateY: 40 },
  100: { opacity: 1, scale: 1,   translateY: 0 },
});

const heartPopKeyframe = new Keyframe({
  0:   { opacity: 0, scale: 0.3 },
  30:  { opacity: 1, scale: 1.3 },
  60:  { opacity: 1, scale: 1 },
  100: { opacity: 1, scale: 1 },
});

const photoPopKeyframe = new Keyframe({
  0:   { opacity: 0, scale: 0.5, rotate: '-10deg' },
  60:  { opacity: 1, scale: 1.1, rotate: '3deg' },
  100: { opacity: 1, scale: 1,   rotate: '0deg' },
});

export default function MatchCelebrationOverlay({ visible, name, photoUrl, onSendMessage, onKeepSwiping }: Props) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View
          entering={enterKeyframe.duration(500)}
          style={styles.cardWrap}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Decorative hearts */}
            <Animated.View
              entering={heartPopKeyframe.delay(200).duration(600)}
              style={styles.heartTopLeft}
            >
              <Ionicons name="heart" size={28} color="rgba(255,255,255,0.3)" />
            </Animated.View>
            <Animated.View
              entering={heartPopKeyframe.delay(350).duration(600)}
              style={styles.heartTopRight}
            >
              <Ionicons name="heart" size={20} color="rgba(255,255,255,0.25)" />
            </Animated.View>
            <Animated.View
              entering={heartPopKeyframe.delay(500).duration(600)}
              style={styles.heartBottomLeft}
            >
              <Ionicons name="heart" size={16} color="rgba(255,255,255,0.2)" />
            </Animated.View>

            {/* Match badge */}
            <Animated.View
              entering={heartPopKeyframe.delay(100).duration(500)}
              style={styles.matchBadge}
            >
              <Ionicons name="heart" size={14} color="#FFF" />
              <Text style={styles.matchBadgeText}>{t('discovery.itsAMatch', 'It\'s a Match!')}</Text>
            </Animated.View>

            {/* Profile photo */}
            <Animated.View
              entering={photoPopKeyframe.delay(200).duration(700)}
              style={styles.photoRing}
            >
              <View style={styles.photoInner}>
                {photoUrl ? (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.photo}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Ionicons name="person" size={40} color="rgba(255,255,255,0.5)" />
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Name */}
            <Text style={styles.nameText} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.subtitle}>
              {t('discovery.matchSubtitle', { defaultValue: 'You and {{name}} liked each other!', name })}
            </Text>

            {/* Buttons */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={onSendMessage}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>{t('discovery.sendMessage', 'Send Message')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onKeepSwiping}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>{t('discovery.keepSwiping', 'Keep Swiping')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    width: SCREEN_W * 0.82,
    borderRadius: radius.lg + 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 16 },
    }),
  },
  card: {
    borderRadius: radius.lg + 4,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  heartTopLeft: {
    position: 'absolute',
    top: 16,
    left: 18,
  },
  heartTopRight: {
    position: 'absolute',
    top: 28,
    right: 22,
  },
  heartBottomLeft: {
    position: 'absolute',
    bottom: 90,
    left: 30,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  matchBadgeText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  photoRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  photoInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  photo: {
    width: 104,
    height: 104,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    marginTop: spacing.xs,
  },
  primaryBtnText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
