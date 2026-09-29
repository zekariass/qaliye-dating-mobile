import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { memo, useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Pressable,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ImageCropModal, type CropRegion } from '@/components/common/ImageCropModal';
import PhotoSourceModal, { type PhotoSource } from '@/components/common/PhotoSourceModal';
import { themedAlert, themedError } from '@/components/common/ThemedAlert';
import { type SemanticTheme } from '@/constants/semantic-colors';
import { supabase } from '@/lib/supabase';
import type { ProfilePhotoDto } from '@/types/profile';
import { extractApiError, getApiErrorMessage, getApiErrorTitle } from '@/utils/apiError';
import { processWithCrop } from '@/utils/imageProcessor';
import type { ImagePickerAsset } from 'expo-image-picker';
import { AccountStatusCard } from './AccountStatusCard';
import { SectionCard, SectionTitle } from './FormComponents';

const { width: W } = Dimensions.get('window');
const MAX_PHOTOS = 7;
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
  onReorderPhotos: (items: { id: string; photo_order: number; is_primary: boolean }[]) => Promise<void>;
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
  const { t } = useTranslation();
  const [actionSheetTarget, setActionSheetTarget] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [cropAsset, setCropAsset] = useState<ImagePickerAsset | null>(null);
  const [cropIsPrimary, setCropIsPrimary] = useState(false);
  const [cropProcessing, setCropProcessing] = useState(false);
  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  const isBusy = isUploading || localLoading;
  const primaryPhoto = photos.find((p) => p.is_primary) ?? photos[0];
  const secondaryPhotos = photos.filter((p) => p.id !== primaryPhoto?.id);
  const canAdd = photos.length < MAX_PHOTOS;

  const pickAndUpload = useCallback(() => {
    setSourceModalOpen(true);
  }, []);

  const handleSourceSelect = useCallback(async (source: PhotoSource) => {
    setSourceModalOpen(false);

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        themedError(t('common.permissionRequired'), t('profile.photos.cameraPermissionDenied'));
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        themedError(t('common.permissionRequired'), t('profile.photos.permissionDenied'));
        return;
      }
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });

    if (result.canceled || !result.assets[0]) {
      console.warn('[pickAndUpload] Picker returned canceled or empty', { canceled: result.canceled, assetCount: result.assets?.length });
      return;
    }

    setCropIsPrimary(photos.length === 0);
    setCropAsset(result.assets[0]);
  }, [photos.length, t]);

  const handleCropConfirm = useCallback(async (crop: CropRegion) => {
    if (!cropAsset) return;
    setCropProcessing(true);
    try {
      setLocalLoading(true);
      const fileName = `profile_photo_${Date.now()}.webp`;
      const processed = await processWithCrop(cropAsset, crop, 1080, fileName);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error(t('profile.photos.notAuthenticated'));

      const userId = session.user.id;
      const storagePath = `${userId}/${processed.fileName}`;
      const storageBucket = 'profile-photos';

      const response = await fetch(processed.uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from(storageBucket)
        .upload(storagePath, arrayBuffer, { contentType: processed.mimeType, upsert: false });

      if (uploadError) throw uploadError;

      const nextOrder = photos.length;
      const isPrimary = photos.length === 0;
      await onRegisterPhoto(storageBucket, storagePath, nextOrder, isPrimary);
    } catch (err: unknown) {
      const detail = extractApiError(err);
      themedError(getApiErrorTitle(detail.code), getApiErrorMessage(detail));
    } finally {
      setLocalLoading(false);
      setCropProcessing(false);
      setCropAsset(null);
    }
  }, [cropAsset, photos.length, onRegisterPhoto, t]);

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
    } catch (err: unknown) {
      const detail = extractApiError(err);
      themedError(getApiErrorTitle(detail.code), getApiErrorMessage(detail));
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
    } catch (err: unknown) {
      const detail = extractApiError(err);
      themedError(getApiErrorTitle(detail.code), getApiErrorMessage(detail));
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
    } catch (err: unknown) {
      const detail = extractApiError(err);
      themedError(getApiErrorTitle(detail.code), getApiErrorMessage(detail));
    } finally {
      setLocalLoading(false);
    }
  }, [photos, onReorderPhotos]);

  const handleRemovePhoto = useCallback((id: string) => {
    themedAlert({
      title: t('profile.photos.removeConfirmTitle'),
      message: t('profile.photos.removeConfirmBody'),
      icon: 'trash-outline',
      iconColor: '#EF4444',
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            setActionSheetTarget(null);
            try {
              setLocalLoading(true);
              await onDeletePhoto(id);
            } catch (err: unknown) {
              const detail = extractApiError(err);
              themedError(getApiErrorTitle(detail.code), getApiErrorMessage(detail));
            } finally {
              setLocalLoading(false);
            }
          },
        },
      ],
    });
  }, [onDeletePhoto, t]);

  const addSlotCount = Math.min(MAX_PHOTOS - photos.length, 2);

  return (
    <View>
      <SectionCard sem={sem}>
        <View className="flex-row items-center justify-between mb-1">
          <SectionTitle title={t('profile.photos.manage')} sem={sem} />
          {isBusy && <ActivityIndicator size="small" color={sem.accent} />}
        </View>
        <Text className="text-sm mb-4" style={{ color: sem.textSecondary }}>
          {t('profile.photos.manageHint', { max: MAX_PHOTOS })}
        </Text>

        {/* Photo Grid */}
        {photos.length > 0 ? (
          <View className="flex-row gap-2 mb-3">
            {primaryPhoto && (
              <View>
                <Pressable
                  onPress={() => !isBusy && setActionSheetTarget(primaryPhoto.id)}
                  accessibilityLabel={t('profile.photos.editPrimary')}
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
                      <Text className="text-sm font-bold text-white ml-1">{t('profile.photos.primary')}</Text>
                    </View>
                    {primaryPhoto.moderation_status === 'PENDING' && (
                      <View
                        className="absolute inset-0 items-center justify-center"
                        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                      >
                        <ActivityIndicator size="small" color="#fff" />
                        <Text className="text-xs font-semibold text-white mt-1">{t('profile.photos.processing')}</Text>
                      </View>
                    )}
                    {primaryPhoto.moderation_status === 'MANUAL_REVIEW' && (
                      <View
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#6366F1' }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{t('profile.photos.underReview')}</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
                <Text className="text-sm mt-2" style={{ color: sem.textMuted, width: PRIMARY_W }}>
                  {t('profile.photos.primaryFirst')}
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
            <Text className="text-sm mt-3" style={{ color: sem.textMuted }}>
              {t('profile.photos.addFirst')}
            </Text>
          </View>
        )}

        {photos.length >= MAX_PHOTOS && (
          <Text className="text-sm text-center mb-3" style={{ color: sem.textMuted }}>
            {t('profile.photos.maxReached', { count: photos.length, max: MAX_PHOTOS })}
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
          <Text className="text-base font-bold mb-0.5" style={{ color: sem.textPrimary }}>
            {t('profile.photos.tips')}
          </Text>
          <Text className="text-sm leading-4" style={{ color: sem.textSecondary }}>
            {t('profile.photos.tipsBody')}
          </Text>
        </View>
      </View>

      <AccountStatusCard sem={sem} isOnboarded={isOnboarded} isVerified={isVerified} />

      <ImageCropModal
        visible={cropAsset !== null}
        imageUri={cropAsset?.uri ?? ''}
        imageWidth={cropAsset?.width ?? 1}
        imageHeight={cropAsset?.height ?? 1}
        aspectRatio={cropIsPrimary ? 4 / 5 : 3 / 4}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropAsset(null)}
        processing={cropProcessing}
      />

      <PhotoSourceModal
        visible={sourceModalOpen}
        onSelect={handleSourceSelect}
        onCancel={() => setSourceModalOpen(false)}
      />

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
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onAction}
      className="rounded-xl overflow-hidden"
      style={{ width, height }}
      accessibilityLabel={t('profile.photos.photoOptions')}
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
          className="absolute inset-0 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <ActivityIndicator size="small" color="#fff" />
        </View>
      )}
      {photo.moderation_status === 'MANUAL_REVIEW' && (
        <View
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#6366F1' }}
        >
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#fff' }}>{t('profile.photos.underReview')}</Text>
        </View>
      )}
      <View
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full items-center justify-center"
        style={{ backgroundColor: '#FFFFFFEE' }}
      >
        <Ionicons name="pencil" size={13} color={sem.accent} />
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
  const { t } = useTranslation();
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
      accessibilityLabel={t('profile.photos.addPhoto')}
      accessibilityRole="button"
      disabled={!onPress}
    >
      {({ pressed }) => (
        <View className="items-center" style={{ opacity: pressed ? 0.6 : 1 }}>
          <Ionicons name="add" size={24} color={sem.accent} />
          <Text className="text-sm font-medium mt-1" style={{ color: sem.accent }}>
            {t('profile.photos.addPhoto')}
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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  if (!targetId) return null;

  const actions = [
    ...(!isPrimary ? [{ label: t('profile.photos.makePrimary'), icon: 'star-outline' as const, action: () => onMakePrimary(targetId) }] : []),
    ...(!isPrimary ? [{ label: t('profile.photos.moveEarlier'), icon: 'arrow-up-outline' as const, action: () => onMoveUp(targetId) }] : []),
    ...(!isPrimary ? [{ label: t('profile.photos.moveLater'), icon: 'arrow-down-outline' as const, action: () => onMoveDown(targetId) }] : []),
    { label: t('profile.photos.removePhoto'), icon: 'trash-outline' as const, action: () => onRemove(targetId), destructive: true },
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
            className="rounded-t-3xl px-5 pt-5"
            style={{ backgroundColor: sem.surface, paddingBottom: Math.max(insets.bottom, 24) }}
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
                  className="text-base font-medium ml-3"
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
