import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { memo, useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Pressable,
    Text,
    View,
} from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { supabase } from '@/lib/supabase';
import type { ProfilePhotoDto } from '@/types/profile';
import { AccountStatusCard } from './AccountStatusCard';
import { SectionCard, SectionTitle } from './FormComponents';

const { width: W } = Dimensions.get('window');
const MAX_PHOTOS = 6;
const CARD_PADDING = 20;
const GAP = 8;
const GRID_WIDTH = W - 32 - CARD_PADDING * 2;
const PRIMARY_W = Math.round(GRID_WIDTH * 0.46);
const PRIMARY_H = Math.round(PRIMARY_W * 1.5);
const SECONDARY_W = Math.round((GRID_WIDTH - PRIMARY_W - GAP) / 2);
const SECONDARY_H = Math.round(SECONDARY_W * 1.2);

type Props = {
  photos: ProfilePhotoDto[];
  isOnboarded: boolean;
  isVerified: boolean;
  sem: SemanticTheme;
  onRegisterPhoto: (storageBucket: string, storagePath: string, photoOrder: number, isPrimary: boolean) => Promise<void>;
  onReorderPhotos: (items: Array<{ id: string; photo_order: number; is_primary: boolean }>) => Promise<void>;
  onDeletePhoto: (photoId: string) => Promise<void>;
  isUploading?: boolean;
};

export const PhotosTabReal = memo(function PhotosTabReal({
  photos,
  isOnboarded,
  isVerified,
  sem,
  onRegisterPhoto,
  onReorderPhotos,
  onDeletePhoto,
  isUploading = false,
}: Props) {
  const [actionSheetTarget, setActionSheetTarget] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const isBusy = isUploading || localLoading;
  const primaryPhoto = photos.find((p) => p.is_primary) ?? photos[0];
  const secondaryPhotos = photos.filter((p) => p.id !== primaryPhoto?.id);
  const canAdd = photos.length < MAX_PHOTOS;

  const pickAndUpload = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${Date.now()}.${ext}`;

    try {
      setLocalLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const userId = session.user.id;
      const storagePath = `${userId}/${fileName}`;
      const storageBucket = 'profile-photos';

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(storagePath, blob, { contentType: `image/${ext}`, upsert: false });

      if (uploadError) throw uploadError;

      const nextOrder = photos.length;
      const isPrimary = photos.length === 0;
      await onRegisterPhoto(storageBucket, storagePath, nextOrder, isPrimary);
    } catch (err: unknown) {
      Alert.alert('Upload failed', (err as Error)?.message ?? 'Could not upload photo.');
    } finally {
      setLocalLoading(false);
    }
  }, [photos, onRegisterPhoto]);

  const handleMakePrimary = useCallback(async (id: string) => {
    setActionSheetTarget(null);
    const reordered = photos
      .map((p, i) => ({
        id: p.id,
        photo_order: p.id === id ? 0 : i + 1,
        is_primary: p.id === id,
      }))
      .sort((a, b) => a.photo_order - b.photo_order)
      .map((p, i) => ({ ...p, photo_order: i }));
    try {
      setLocalLoading(true);
      await onReorderPhotos(reordered);
    } finally {
      setLocalLoading(false);
    }
  }, [photos, onReorderPhotos]);

  const handleMoveUp = useCallback(async (id: string) => {
    setActionSheetTarget(null);
    const idx = photos.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const updated = [...photos];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    const reordered = updated.map((p, i) => ({
      id: p.id,
      photo_order: i,
      is_primary: i === 0,
    }));
    try {
      setLocalLoading(true);
      await onReorderPhotos(reordered);
    } finally {
      setLocalLoading(false);
    }
  }, [photos, onReorderPhotos]);

  const handleMoveDown = useCallback(async (id: string) => {
    setActionSheetTarget(null);
    const idx = photos.findIndex((p) => p.id === id);
    if (idx < 0 || idx >= photos.length - 1) return;
    const updated = [...photos];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    const reordered = updated.map((p, i) => ({
      id: p.id,
      photo_order: i,
      is_primary: i === 0,
    }));
    try {
      setLocalLoading(true);
      await onReorderPhotos(reordered);
    } finally {
      setLocalLoading(false);
    }
  }, [photos, onReorderPhotos]);

  const handleRemovePhoto = useCallback((id: string) => {
    Alert.alert(
      'Remove photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionSheetTarget(null);
            try {
              setLocalLoading(true);
              await onDeletePhoto(id);
            } catch (err: unknown) {
              Alert.alert('Error', (err as Error)?.message ?? 'Could not remove photo.');
            } finally {
              setLocalLoading(false);
            }
          },
        },
      ],
    );
  }, [onDeletePhoto]);

  const addSlotCount = Math.min(MAX_PHOTOS - photos.length, 2);

  return (
    <View>
      <SectionCard sem={sem}>
        <View className="flex-row items-center justify-between mb-1">
          <SectionTitle title="Manage Photos" sem={sem} />
          {isBusy && <ActivityIndicator size="small" color={sem.accent} />}
        </View>
        <Text className="text-xs mb-4" style={{ color: sem.textSecondary }}>
          Add up to {MAX_PHOTOS} photos. Your primary photo appears first on your profile.
        </Text>

        {/* Photo Grid */}
        {photos.length > 0 ? (
          <View className="flex-row gap-2 mb-3">
            {primaryPhoto && (
              <View>
                <Pressable
                  onPress={() => !isBusy && setActionSheetTarget(primaryPhoto.id)}
                  accessibilityLabel="Primary photo, tap to edit"
                  accessibilityRole="button"
                  disabled={isBusy}
                >
                  <View className="rounded-2xl overflow-hidden" style={{ width: PRIMARY_W, height: PRIMARY_H }}>
                    <Image
                      source={{ uri: primaryPhoto.signed_url }}
                      style={{ width: PRIMARY_W, height: PRIMARY_H }}
                      contentFit="cover"
                      transition={200}
                    />
                    <View
                      className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: '#FFFFFFEE' }}
                    >
                      <Ionicons name="pencil" size={14} color={sem.accent} />
                    </View>
                    <View
                      className="absolute bottom-3 left-3 flex-row items-center px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: sem.accent }}
                    >
                      <Ionicons name="star" size={10} color="#fff" />
                      <Text className="text-xs font-bold text-white ml-1">Primary</Text>
                    </View>
                    {primaryPhoto.moderation_status === 'PENDING' && (
                      <View
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F59E0B' }}
                      >
                        <Text className="text-xs font-bold text-white">Pending</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
                <Text className="text-xs mt-2" style={{ color: sem.textMuted, width: PRIMARY_W }}>
                  Primary photo shown first on your profile.
                </Text>
              </View>
            )}

            {/* Right column */}
            <View className="flex-1 gap-2">
              {buildSecondaryGrid(secondaryPhotos, addSlotCount).map((row, rowIdx) => (
                <View key={rowIdx} className="flex-row gap-2">
                  {row.map((item) => {
                    if (item.type === 'photo') {
                      return (
                        <SecondaryPhotoTile
                          key={item.photo!.id}
                          photo={item.photo!}
                          sem={sem}
                          onAction={() => !isBusy && setActionSheetTarget(item.photo!.id)}
                          width={SECONDARY_W}
                          height={SECONDARY_H}
                        />
                      );
                    }
                    return (
                      <AddPhotoTile
                        key={`add-${rowIdx}-${item.idx}`}
                        sem={sem}
                        onPress={canAdd && !isBusy ? pickAndUpload : undefined}
                        width={SECONDARY_W}
                        height={SECONDARY_H}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="items-center py-8">
            <AddPhotoTile
              sem={sem}
              onPress={!isBusy ? pickAndUpload : undefined}
              width={PRIMARY_W}
              height={PRIMARY_H}
            />
            <Text className="text-xs mt-3" style={{ color: sem.textMuted }}>
              Add your first photo
            </Text>
          </View>
        )}

        {photos.length >= MAX_PHOTOS && (
          <Text className="text-xs text-center mb-3" style={{ color: sem.textMuted }}>
            {MAX_PHOTOS} of {MAX_PHOTOS} photos added
          </Text>
        )}
      </SectionCard>

      {/* Photo Tips */}
      <View
        className="rounded-2xl px-5 py-4 mb-4 flex-row items-center gap-3"
        style={{ backgroundColor: sem.accentSoft }}
      >
        <Ionicons name="bulb-outline" size={22} color={sem.accent} />
        <View className="flex-1">
          <Text className="text-sm font-bold mb-0.5" style={{ color: sem.textPrimary }}>
            Photo tips
          </Text>
          <Text className="text-xs leading-4" style={{ color: sem.textSecondary }}>
            Use clear, well-lit photos that show your face. Avoid group photos as your primary photo.
          </Text>
        </View>
      </View>

      <AccountStatusCard sem={sem} isOnboarded={isOnboarded} isVerified={isVerified} />

      {/* Action Sheet Modal */}
      <ActionSheetModal
        visible={actionSheetTarget !== null}
        onClose={() => setActionSheetTarget(null)}
        targetId={actionSheetTarget}
        isPrimary={actionSheetTarget === primaryPhoto?.id}
        sem={sem}
        onMakePrimary={handleMakePrimary}
        onRemove={handleRemovePhoto}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />
    </View>
  );
});

// ─── Secondary Photo Tile ───────────────────────────────────────────────────────

type SecondaryPhotoTileProps = {
  photo: ProfilePhotoDto;
  sem: SemanticTheme;
  onAction: () => void;
  width: number;
  height: number;
};

const SecondaryPhotoTile = memo(function SecondaryPhotoTile({
  photo, sem, onAction, width, height,
}: SecondaryPhotoTileProps) {
  return (
    <Pressable
      onPress={onAction}
      className="rounded-xl overflow-hidden"
      style={{ width, height }}
      accessibilityLabel="Photo, tap for options"
      accessibilityRole="button"
    >
      <Image
        source={{ uri: photo.signed_url }}
        style={{ width, height }}
        contentFit="cover"
        transition={200}
      />
      {photo.moderation_status === 'PENDING' && (
        <View
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#F59E0B' }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>Pending</Text>
        </View>
      )}
      <View
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full items-center justify-center"
        style={{ backgroundColor: '#FFFFFFEE' }}
      >
        <Ionicons name="ellipsis-vertical" size={13} color={sem.textPrimary} />
      </View>
    </Pressable>
  );
});

// ─── Add Photo Tile ─────────────────────────────────────────────────────────────

type AddPhotoTileProps = {
  sem: SemanticTheme;
  onPress?: () => void;
  width: number;
  height: number;
};

function AddPhotoTile({ sem, onPress, width, height }: AddPhotoTileProps) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-xl items-center justify-center border-2 border-dashed"
      style={{
        width,
        height,
        borderColor: onPress ? sem.accent : sem.border,
        backgroundColor: onPress ? sem.accentSoft : sem.surfaceMuted,
        opacity: onPress ? 1 : 0.5,
      }}
      accessibilityLabel="Add photo"
      accessibilityRole="button"
      disabled={!onPress}
    >
      {({ pressed }) => (
        <View className="items-center" style={{ opacity: pressed ? 0.6 : 1 }}>
          <Ionicons name="add" size={24} color={sem.accent} />
          <Text className="text-xs font-medium mt-1" style={{ color: sem.accent }}>
            Add photo
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Action Sheet Modal ─────────────────────────────────────────────────────────

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  targetId: string | null;
  isPrimary: boolean;
  sem: SemanticTheme;
  onMakePrimary: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
};

function ActionSheetModal({
  visible, onClose, targetId, isPrimary, sem,
  onMakePrimary, onRemove, onMoveUp, onMoveDown,
}: ActionSheetProps) {
  if (!targetId) return null;

  const actions = [
    ...(!isPrimary ? [{ label: 'Make primary', icon: 'star-outline' as const, action: () => onMakePrimary(targetId) }] : []),
    { label: 'Move earlier', icon: 'arrow-up-outline' as const, action: () => onMoveUp(targetId) },
    { label: 'Move later', icon: 'arrow-down-outline' as const, action: () => onMoveDown(targetId) },
    { label: 'Remove photo', icon: 'trash-outline' as const, action: () => onRemove(targetId), destructive: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            className="rounded-t-3xl px-5 pt-5 pb-10"
            style={{ backgroundColor: sem.surface }}
          >
            <View className="w-10 h-1 rounded-full self-center mb-4" style={{ backgroundColor: sem.border }} />
            {actions.map((a) => (
              <Pressable
                key={a.label}
                onPress={a.action}
                className="flex-row items-center py-3.5 px-3 rounded-xl mb-1"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? sem.surfaceMuted : 'transparent',
                })}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <Ionicons
                  name={a.icon}
                  size={20}
                  color={(a as { destructive?: boolean }).destructive ? sem.danger : sem.textPrimary}
                />
                <Text
                  className="text-sm font-medium ml-3"
                  style={{ color: (a as { destructive?: boolean }).destructive ? sem.danger : sem.textPrimary }}
                >
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Grid Helper ────────────────────────────────────────────────────────────────

type GridItem =
  | { type: 'photo'; photo: ProfilePhotoDto; idx?: number }
  | { type: 'add'; idx: number; photo?: undefined };

function buildSecondaryGrid(
  secondaryPhotos: ProfilePhotoDto[],
  addSlotCount: number,
): GridItem[][] {
  const items: GridItem[] = [
    ...secondaryPhotos.map((p): GridItem => ({ type: 'photo', photo: p })),
    ...Array.from({ length: addSlotCount }, (_, i): GridItem => ({ type: 'add', idx: i })),
  ];
  const rows: GridItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}
