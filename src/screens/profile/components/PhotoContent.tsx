import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProfilePhoto } from '../mockCurrentUserProfile';

const SCREEN_W = Dimensions.get('window').width;
const CARD_PADDING = 20;
const CARD_GAP = 12;
const PHOTO_W = Math.round((SCREEN_W - 32 - CARD_PADDING * 2 - CARD_GAP) / 2.1);
const PHOTO_H = Math.round(PHOTO_W * 1.4);

const PhotoCard = memo(function PhotoCard({
  photo,
  onRemove,
}: {
  photo: ProfilePhoto;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={styles.photoCard}>
      <Image
        source={{ uri: photo.uri }}
        style={styles.photoImage}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <Pressable
        style={styles.removeBtn}
        onPress={() => onRemove(photo.id)}
        accessibilityLabel="Remove photo"
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
});

function AddPhotoTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.addTile}
      onPress={onPress}
      accessibilityLabel="Add Photo"
      accessibilityRole="button"
    >
      <View style={styles.addIconCircle}>
        <Ionicons name="add-outline" size={28} color={colors.primary} />
      </View>
      <Text style={styles.addLabel}>Add Photo</Text>
    </Pressable>
  );
}

interface PhotoContentProps {
  photos: ProfilePhoto[];
}

export default function PhotoContent({ photos }: PhotoContentProps) {
  const { colors: th } = useTheme();

  const handleRemove = (id: string) => {
    console.log('Remove photo:', id);
  };

  const handleAdd = () => {
    console.log('Add photo');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: th.surface, borderColor: th.border }]}>
        <Text style={[styles.heading, { color: th.text }]}>My Photos</Text>
        <Text style={[styles.subtext, { color: th.textSecondary }]}>
          Add up to 6 photos. Clear, friendly photos get more attention.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          bounces={false}
        >
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} onRemove={handleRemove} />
          ))}
        </ScrollView>

        <AddPhotoTile onPress={handleAdd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9DDF8',
    padding: CARD_PADDING,
  },
  heading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B1340',
    marginBottom: 4,
  },
  subtext: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  carousel: {
    gap: CARD_GAP,
    paddingRight: 4,
  },
  photoCard: {
    width: PHOTO_W,
    height: PHOTO_H,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: PHOTO_W,
    height: PHOTO_H * 0.65,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1C4E9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
