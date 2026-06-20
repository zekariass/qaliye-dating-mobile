import { useTranslation } from 'react-i18next';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------
const { width: W } = Dimensions.get('window');
const H_PAD = spacing.md * 2;
const PHOTO_W = W - H_PAD;
const PHOTO_H = Math.round(PHOTO_W * 1.25); // 4:5 portrait

// ---------------------------------------------------------------------------

interface Props {
  photos: { image_url: string }[];
}

export default function MorePhotosSection({ photos }: Props) {
  const { t } = useTranslation();
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';

  if (photos.length <= 1) return null;

  const cardBg = isDark ? th.backgroundElement : th.surface;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: th.text }]}>{t('discovery.morePhotos')}</Text>
      <View style={styles.stack}>
        {photos.map((photo, idx) => (
          <View
            key={idx}
            style={[
              styles.photoCard,
              { backgroundColor: cardBg, borderColor: th.border },
            ]}
          >
            <Image
              source={{ uri: photo.image_url }}
              style={styles.photo}
              resizeMode="cover"
              accessibilityLabel={`Photo ${idx + 1}`}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: spacing.xl,
    gap: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  stack: {
    gap: 10,
  },
  photoCard: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
});
