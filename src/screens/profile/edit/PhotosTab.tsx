import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { memo, useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';

import { type SemanticTheme } from '@/constants/semantic-colors';
import { type EditableProfilePhoto, EXTRA_MOCK_IMAGES } from '../mockEditProfile';
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
  photos: EditableProfilePhoto[];
  onPhotosChange: (photos: EditableProfilePhoto[]) => void;
  sem: SemanticTheme;
};

export const PhotosTab = memo(function PhotosTab({ photos, onPhotosChange, sem }: Props) {
  const [actionSheetTarget, setActionSheetTarget] = useState<string | null>(null);
  const [addPickerVisible, setAddPickerVisible] = useState(false);

  const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];
  const secondaryPhotos = photos.filter((p) => p.id !== primaryPhoto?.id);
  const canAdd = photos.length < MAX_PHOTOS;

  // Get unused mock images that aren't already in the photo list
  const getAvailableMockImages = useCallback(() => {
    const usedUris = photos.map((p) => p.uri);
    return EXTRA_MOCK_IMAGES.filter((uri) => !usedUris.includes(uri));
  }, [photos]);

  const handleMakePrimary = useCallback((id: string) => {
    const updated = photos.map((p) => ({
      ...p,
      isPrimary: p.id === id,
    }));
    // Reorder: new primary first
    const newPrimary = updated.find((p) => p.id === id)!;
    const rest = updated.filter((p) => p.id !== id);
    const reordered = [newPrimary, ...rest].map((p, i) => ({ ...p, order: i }));
    onPhotosChange(reordered);
    setActionSheetTarget(null);
  }, [photos, onPhotosChange]);

  const handleReplacePhoto = useCallback((id: string) => {
    const available = getAvailableMockImages();
    if (available.length === 0) {
      Alert.alert('No images available', 'All mock images are already in use.');
      return;
    }
    const newUri = available[0];
    const updated = photos.map((p) =>
      p.id === id ? { ...p, uri: newUri } : p
    );
    onPhotosChange(updated);
    setActionSheetTarget(null);
  }, [photos, onPhotosChange, getAvailableMockImages]);

  const handleRemovePhoto = useCallback((id: string) => {
    Alert.alert(
      'Remove photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            let updated = photos.filter((p) => p.id !== id);
            // If removed photo was primary, promote next
            if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
              updated[0] = { ...updated[0], isPrimary: true };
            }
            updated = updated.map((p, i) => ({ ...p, order: i }));
            onPhotosChange(updated);
            setActionSheetTarget(null);
          },
        },
      ],
    );
  }, [photos, onPhotosChange]);

  const handleAddPhoto = useCallback((uri: string) => {
    const newPhoto: EditableProfilePhoto = {
      id: `ph-${Date.now()}`,
      uri,
      order: photos.length,
      isPrimary: photos.length === 0,
    };
    onPhotosChange([...photos, newPhoto]);
    setAddPickerVisible(false);
  }, [photos, onPhotosChange]);

  const handleMoveUp = useCallback((id: string) => {
    const idx = photos.findIndex((p) => p.id === id);
    if (idx <= 0) return;
    const updated = [...photos];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    const reordered = updated.map((p, i) => ({
      ...p,
      order: i,
      isPrimary: i === 0,
    }));
    onPhotosChange(reordered);
    setActionSheetTarget(null);
  }, [photos, onPhotosChange]);

  const handleMoveDown = useCallback((id: string) => {
    const idx = photos.findIndex((p) => p.id === id);
    if (idx < 0 || idx >= photos.length - 1) return;
    const updated = [...photos];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    const reordered = updated.map((p, i) => ({
      ...p,
      order: i,
      isPrimary: i === 0,
    }));
    onPhotosChange(reordered);
    setActionSheetTarget(null);
  }, [photos, onPhotosChange]);

  // How many add-photo slots to show
  const addSlotCount = Math.min(MAX_PHOTOS - photos.length, 2);

  return (
    <View>
      <SectionCard sem={sem}>
        <View className="flex-row items-center justify-between mb-1">
          <SectionTitle title="Manage Photos" sem={sem} />
          <View
            className="flex-row items-center px-3 py-1.5 rounded-full border"
            style={{ borderColor: sem.border, backgroundColor: sem.surfaceMuted }}
          >
            <Ionicons name="information-circle-outline" size={13} color={sem.textMuted} />
            <Text className="text-xs ml-1" style={{ color: sem.textMuted }}>
              Drag to reorder
            </Text>
          </View>
        </View>
        <Text className="text-xs mb-4" style={{ color: sem.textSecondary }}>
          Reorder your photos by dragging and choose a primary photo.
        </Text>

        {/* ─── Photo Grid ─── */}
        {photos.length > 0 ? (
          <View className="flex-row gap-2 mb-3">
            {/* Primary photo - large left column */}
            {primaryPhoto && (
              <View>
                <Pressable
                  onPress={() => setActionSheetTarget(primaryPhoto.id)}
                  accessibilityLabel="Primary photo, tap to edit"
                  accessibilityRole="button"
                >
                  <View className="rounded-2xl overflow-hidden" style={{ width: PRIMARY_W, height: PRIMARY_H }}>
                    <Image
                      source={{ uri: primaryPhoto.uri }}
                      style={{ width: PRIMARY_W, height: PRIMARY_H }}
                      contentFit="cover"
                      transition={200}
                    />
                    {/* Edit button */}
                    <View
                      className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
                      style={{ backgroundColor: '#FFFFFFEE' }}
                    >
                      <Ionicons name="pencil" size={14} color={sem.accent} />
                    </View>
                    {/* Primary badge */}
                    <View
                      className="absolute bottom-3 left-3 flex-row items-center px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: sem.accent }}
                    >
                      <Ionicons name="star" size={10} color="#fff" />
                      <Text className="text-xs font-bold text-white ml-1">Primary</Text>
                    </View>
                  </View>
                </Pressable>
                <Text className="text-xs mt-2 w-[150px]" style={{ color: sem.textMuted }}>
                  This is your primary photo. It will be shown first on your profile.
                </Text>
              </View>
            )}

            {/* Right column - secondary photos + add slots */}
            <View className="flex-1 gap-2">
              {/* Row pairs of secondary photos */}
              {buildSecondaryGrid(secondaryPhotos, addSlotCount).map((row, rowIdx) => (
                <View key={rowIdx} className="flex-row gap-2">
                  {row.map((item) => {
                    if (item.type === 'photo') {
                      return (
                        <SecondaryPhotoTile
                          key={item.photo!.id}
                          photo={item.photo!}
                          sem={sem}
                          onAction={() => setActionSheetTarget(item.photo!.id)}
                          width={SECONDARY_W}
                          height={SECONDARY_H}
                        />
                      );
                    }
                    return (
                      <AddPhotoTile
                        key={`add-${rowIdx}-${item.idx}`}
                        sem={sem}
                        onPress={() => setAddPickerVisible(true)}
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
          /* Empty state */
          <View className="items-center py-8">
            <AddPhotoTile
              sem={sem}
              onPress={() => setAddPickerVisible(true)}
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

      {/* ─── Photo Tips ─── */}
      <View
        className="rounded-2xl px-5 py-4 mb-4 mx-0 flex-row items-center gap-3"
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

      {/* ─── Account Status ─── */}
      <AccountStatusCard sem={sem} />

      {/* ─── Action Sheet Modal ─── */}
      <ActionSheetModal
        visible={actionSheetTarget !== null}
        onClose={() => setActionSheetTarget(null)}
        targetId={actionSheetTarget}
        isPrimary={actionSheetTarget === primaryPhoto?.id}
        sem={sem}
        onMakePrimary={handleMakePrimary}
        onReplace={handleReplacePhoto}
        onRemove={handleRemovePhoto}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />

      {/* ─── Add Photo Picker Modal ─── */}
      <AddPhotoPickerModal
        visible={addPickerVisible}
        onClose={() => setAddPickerVisible(false)}
        availableImages={getAvailableMockImages()}
        onSelect={handleAddPhoto}
        sem={sem}
      />
    </View>
  );
});

// ─── Secondary Photo Tile ───────────────────────────────────────────────────────

type SecondaryPhotoTileProps = {
  photo: EditableProfilePhoto;
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
        source={{ uri: photo.uri }}
        style={{ width, height }}
        contentFit="cover"
        transition={200}
      />
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
  onPress: () => void;
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
        borderColor: sem.accent,
        backgroundColor: sem.accentSoft,
      }}
      accessibilityLabel="Add photo"
      accessibilityRole="button"
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
  onReplace: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
};

function ActionSheetModal({
  visible, onClose, targetId, isPrimary, sem,
  onMakePrimary, onReplace, onRemove, onMoveUp, onMoveDown,
}: ActionSheetProps) {
  if (!targetId) return null;

  const actions = [
    ...(!isPrimary ? [{ label: 'Make primary', icon: 'star-outline' as const, action: () => onMakePrimary(targetId) }] : []),
    { label: 'Replace photo', icon: 'swap-horizontal-outline' as const, action: () => onReplace(targetId) },
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
                  color={(a as any).destructive ? sem.danger : sem.textPrimary}
                />
                <Text
                  className="text-sm font-medium ml-3"
                  style={{ color: (a as any).destructive ? sem.danger : sem.textPrimary }}
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

// ─── Add Photo Picker Modal ─────────────────────────────────────────────────────

type AddPhotoPickerProps = {
  visible: boolean;
  onClose: () => void;
  availableImages: string[];
  onSelect: (uri: string) => void;
  sem: SemanticTheme;
};

function AddPhotoPickerModal({ visible, onClose, availableImages, onSelect, sem }: AddPhotoPickerProps) {
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
            <Text className="text-base font-bold mb-4" style={{ color: sem.textPrimary }}>
              Choose a photo
            </Text>
            {availableImages.length === 0 ? (
              <Text className="text-sm py-4 text-center" style={{ color: sem.textMuted }}>
                No more mock images available.
              </Text>
            ) : (
              <View className="flex-row gap-3 flex-wrap">
                {availableImages.map((uri) => (
                  <Pressable
                    key={uri}
                    onPress={() => onSelect(uri)}
                    className="rounded-xl overflow-hidden"
                    accessibilityLabel="Select photo"
                    accessibilityRole="button"
                  >
                    {({ pressed }) => (
                      <Image
                        source={{ uri }}
                        style={{ width: 80, height: 100, opacity: pressed ? 0.6 : 1 }}
                        contentFit="cover"
                        transition={200}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Grid Helper ────────────────────────────────────────────────────────────────

type GridItem = { type: 'photo'; photo: EditableProfilePhoto; idx?: number } | { type: 'add'; idx: number; photo?: undefined };

function buildSecondaryGrid(secondaryPhotos: EditableProfilePhoto[], addSlotCount: number): GridItem[][] {
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
