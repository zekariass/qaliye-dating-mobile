import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { rs, useTabletScale } from '@/utils/responsive';

interface Props {
  onPass: () => void;
  /** Omit to hide the rewind button. */
  onRewind?: () => void;
  onSuperMessage: () => void;
  disabled?: boolean;
  /** Disables only the rewind button (e.g. no rewind credits left). */
  rewindDisabled?: boolean;
  /** Omit to hide the boost button. Shown above rewind. */
  onBoost?: () => void;
  boostActive?: boolean;
  boostLoading?: boolean;
}

/**
 * Vector icon fonts have no weight axis — layer the glyph twice with a
 * sub-pixel offset for a faux-bold stroke.
 */
function BoldIcon({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={style}>
      {children}
      <View style={styles.boldClone} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

/**
 * Pass + rewind + super message — boxed icons in a vertical column, rendered
 * at the bottom-left of the swipe card photo just above the profile name.
 */
export default function TopLeftActionButtons({ onPass, onRewind, onSuperMessage, disabled, rewindDisabled, onBoost, boostActive, boostLoading }: Props) {
  const { t } = useTranslation();
  const scale = useTabletScale();

  const boostBtn = onBoost ? (
    <TouchableOpacity
      style={styles.hitArea}
      onPress={onBoost}
      disabled={disabled || boostLoading}
      activeOpacity={0.7}
      accessibilityLabel={boostActive ? t('discovery.boost.activeLabel') : t('discovery.boost.activateTitle')}
    >
      <View style={[styles.iconBox, boostActive && styles.iconBoxBoost]}>
        {boostLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <BoldIcon>
            <Ionicons
              name={boostActive ? 'rocket' : 'rocket-outline'}
              size={rs(24, scale)}
              color={boostActive ? '#C084FC' : '#FFFFFF'}
              style={styles.icon}
            />
          </BoldIcon>
        )}
      </View>
    </TouchableOpacity>
  ) : null;

  const rewindBtn = onRewind ? (
    <TouchableOpacity
      style={styles.hitArea}
      onPress={onRewind}
      disabled={disabled || rewindDisabled}
      activeOpacity={0.7}
      accessibilityLabel={t('discovery.rewindProfile')}
    >
      <View style={[styles.iconBox, styles.iconBoxAmber]}>
        <BoldIcon>
          <MaterialCommunityIcons
            name="undo"
            size={rs(24, scale)}
            color="#FBBF24"
            style={styles.icon}
          />
        </BoldIcon>
      </View>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      {/* Boost */}
      {boostBtn}

      {/* Rewind */}
      {rewindBtn}

      {/* Pass */}
      <TouchableOpacity
        style={styles.hitArea}
        onPress={onPass}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={t('discovery.passProfile')}
      >
        <View style={[styles.iconBox, styles.iconBoxDanger]}>
          <BoldIcon style={styles.glyphBleed}>
            <Ionicons
              name="close"
              size={rs(28, scale)}
              color={colors.danger}
              style={styles.icon}
            />
          </BoldIcon>
        </View>
      </TouchableOpacity>

      {/* Super Message */}
      <TouchableOpacity
        style={styles.hitArea}
        onPress={onSuperMessage}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityLabel={t('discovery.sendSuperMessage')}
      >
        <View style={styles.iconBox}>
          <BoldIcon>
            <Ionicons
              name="mail"
              size={rs(24, scale)}
              color="#FFFFFF"
              style={styles.icon}
            />
          </BoldIcon>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  hitArea: {
    padding: 4,
  },
  iconBox: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  iconBoxAmber: {
    borderColor: 'rgba(251,191,36,0.9)',
  },
  iconBoxBoost: {
    borderColor: 'rgba(192,132,252,0.9)',
  },
  iconBoxDanger: {
    borderColor: 'rgba(239,68,68,0.9)',
  },
  icon: {
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  boldClone: {
    position: 'absolute',
    left: 0.9,
    top: 0.4,
  },
  // Bleed past the box padding so a larger glyph doesn't grow the box.
  glyphBleed: {
    margin: -2,
  },
});
