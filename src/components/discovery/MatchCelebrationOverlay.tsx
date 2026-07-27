import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
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
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { colors, fontSize, radius, spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  name: string;
  photoUrl?: string;
  myPhotoUrl?: string;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

const PHOTO_SIZE = 88;
const PHOTO_RING = PHOTO_SIZE + 8;

const enterKeyframe = new Keyframe({
  0:   { opacity: 0, scale: 0.72, translateY: 48 },
  70:  { opacity: 1, scale: 1.03, translateY: -4 },
  100: { opacity: 1, scale: 1,    translateY: 0 },
});

const popKeyframe = new Keyframe({
  0:   { opacity: 0, scale: 0.3 },
  45:  { opacity: 1, scale: 1.28 },
  70:  { opacity: 1, scale: 0.96 },
  100: { opacity: 1, scale: 1 },
});

const photoKeyframe = new Keyframe({
  0:   { opacity: 0, scale: 0.5 },
  65:  { opacity: 1, scale: 1.06 },
  100: { opacity: 1, scale: 1 },
});

const slideUpKeyframe = new Keyframe({
  0:   { opacity: 0, translateY: 20 },
  100: { opacity: 1, translateY: 0 },
});

export default function MatchCelebrationOverlay({ visible, name, photoUrl, myPhotoUrl, onSendMessage, onKeepSwiping }: Props) {
  const { t } = useTranslation();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      pulse.value = withDelay(
        700,
        withRepeat(
          withSequence(
            withTiming(1.22, { duration: 500 }),
            withTiming(1, { duration: 500 }),
          ),
          -1,
          false,
        ),
      );
    } else {
      pulse.value = 1;
    }
  }, [visible, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Animated.View entering={enterKeyframe.duration(550)} style={styles.cardWrap}>
          <LinearGradient
            colors={['#5B0BD6', '#8B1FE8', '#BF5FFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Decorative scattered hearts */}
            <Animated.View entering={popKeyframe.delay(500).duration(600)} style={styles.floatTL}>
              <Ionicons name="heart" size={22} color="rgba(255,255,255,0.18)" />
            </Animated.View>
            <Animated.View entering={popKeyframe.delay(650).duration(600)} style={styles.floatTR}>
              <Ionicons name="heart" size={14} color="rgba(255,255,255,0.13)" />
            </Animated.View>
            <Animated.View entering={popKeyframe.delay(800).duration(600)} style={styles.floatBL}>
              <Ionicons name="heart" size={18} color="rgba(255,255,255,0.12)" />
            </Animated.View>
            <Animated.View entering={popKeyframe.delay(720).duration(600)} style={styles.floatBR}>
              <Ionicons name="heart" size={11} color="rgba(255,255,255,0.1)" />
            </Animated.View>

            {/* Badge pill */}
            <Animated.View entering={popKeyframe.delay(100).duration(500)} style={styles.badge}>
              <Ionicons name="heart-circle" size={14} color="#FFD06B" />
              <Text style={styles.badgeText}>{t('discovery.newMatch', 'New Match')}</Text>
            </Animated.View>

            {/* Two photos with interlinked hearts between them */}
            <View style={styles.photosRow}>
              <Animated.View entering={photoKeyframe.delay(250).duration(650)} style={styles.photoRing}>
                <View style={styles.photoInner}>
                  {myPhotoUrl ? (
                    <Image source={{ uri: myPhotoUrl }} style={styles.photo} contentFit="cover" />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                      <Ionicons name="person" size={30} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                </View>
              </Animated.View>

              {/* Interlinked hearts — pink left, purple right, overlapping */}
              <Animated.View style={[styles.linkedHearts, pulseStyle]}>
                <View style={styles.heartLeft}>
                  <Ionicons name="heart" size={30} color="#FF4B8B" />
                </View>
                <View style={styles.heartRight}>
                  <Ionicons name="heart" size={30} color={colors.primary} />
                </View>
              </Animated.View>

              <Animated.View entering={photoKeyframe.delay(400).duration(650)} style={styles.photoRing}>
                <View style={styles.photoInner}>
                  {photoUrl ? (
                    <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" transition={200} />
                  ) : (
                    <View style={[styles.photo, styles.photoPlaceholder]}>
                      <Ionicons name="person" size={30} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                </View>
              </Animated.View>
            </View>

            {/* Title and subtitle */}
            <Animated.View entering={slideUpKeyframe.delay(450).duration(500)} style={styles.textBlock}>
              <Text style={styles.title}>
                {t('discovery.youHaveAMatch', 'You have a match!')}
              </Text>
              <Text style={styles.subtitle}>
                {t('discovery.matchSubtitle', { defaultValue: 'You and {{name}} liked each other!', name })}
              </Text>
            </Animated.View>

            {/* Buttons */}
            <TouchableOpacity style={styles.primaryBtn} onPress={onSendMessage} activeOpacity={0.85}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>{t('discovery.sendMessage', 'Send Message')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={onKeepSwiping} activeOpacity={0.85}>
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
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrap: {
    width: SCREEN_W * 0.84,
    borderRadius: radius.lg + 6,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOpacity: 0.5,
        shadowRadius: 34,
        shadowOffset: { width: 0, height: 14 },
      },
      android: { elevation: 20 },
    }),
  },
  card: {
    borderRadius: radius.lg + 6,
    paddingVertical: spacing.xl + 4,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  floatTL: { position: 'absolute', top: 16, left: 18 },
  floatTR: { position: 'absolute', top: 28, right: 22 },
  floatBL: { position: 'absolute', bottom: 100, left: 28 },
  floatBR: { position: 'absolute', bottom: 64, right: 18 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginBottom: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: fontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  photoRing: {
    width: PHOTO_RING,
    height: PHOTO_RING,
    borderRadius: PHOTO_RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  photoInner: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedHearts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartLeft: {
    marginRight: -11,
    zIndex: 1,
  },
  heartRight: {
    marginLeft: -11,
    marginTop: 7,
  },
  textBlock: {
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: fontSize.xl,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  primaryBtnText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
