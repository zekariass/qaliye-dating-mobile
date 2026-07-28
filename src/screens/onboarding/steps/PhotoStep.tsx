import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { batchRegisterProfilePhotos, deleteProfilePhoto, fetchProfilePhotos } from '@/api/profile/profileApi';
import { ImageCropModal, type CropRegion } from '@/components/common/ImageCropModal';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { ProfilePhotoDto } from '@/types/profile';
import { extractApiError } from '@/utils/apiError';
import { ProcessedImage, processWithCrop } from '@/utils/imageProcessor';
import type { ImagePickerAsset } from 'expo-image-picker';

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = { onComplete: () => Promise<void>; isCompleted: boolean };

type CardSlot =
  | { kind: 'local'; photo: ProcessedImage }
  | { kind: 'server'; url: string; id: string }
  | null;

const MAX_CARDS = 6;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requestLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
}

function moderationLabel(status: ProfilePhotoDto['moderation_status']): string {
  switch (status) {
    case 'APPROVED': return 'Approved';
    case 'PENDING':  return 'Under review';
    case 'REJECTED': return 'Rejected';
    default:         return 'Under review';
  }
}

function moderationColor(status: ProfilePhotoDto['moderation_status']): string {
  switch (status) {
    case 'APPROVED': return '#22C55E';
    case 'PENDING':  return '#F59E0B';
    case 'REJECTED': return '#EF4444';
    default:         return '#F59E0B';
  }
}

const STORAGE_BUCKET = 'profile-photos';

async function uploadOneToSupabase(
  userId: string,
  uri: string,
  fileName: string,
  photoOrder: number,
): Promise<{ storageBucket: string; storagePath: string; photoOrder: number }> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'webp';
  const storagePath = `${userId}/${Date.now()}_${photoOrder}.${ext}`;

  const fileResponse = await fetch(uri);
  const arrayBuffer = await fileResponse.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: `image/${ext}`, upsert: false });

  if (uploadError) throw uploadError;

  return { storageBucket: STORAGE_BUCKET, storagePath, photoOrder };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoStep({ onComplete, isCompleted }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const screenW = Dimensions.get('window').width;

  // Primary photo
  const [existingPrimary, setExistingPrimary] = useState<ProfilePhotoDto | null>(null);
  const [newPrimary, setNewPrimary] = useState<ProcessedImage | null>(null);
  const [primaryProcessing, setPrimaryProcessing] = useState(false);

  // Card photos — 6 fixed slots
  const [cardSlots, setCardSlots] = useState<CardSlot[]>(Array(MAX_CARDS).fill(null));
  const [processingCardIdx, setProcessingCardIdx] = useState<number | null>(null);

  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Deletion loading states
  const [isDeletingPrimary, setIsDeletingPrimary] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Crop modal state
  const [cropState, setCropState] = useState<{
    asset: ImagePickerAsset;
    mode: 'primary' | 'card';
    cardIdx?: number;
  } | null>(null);
  const [cropProcessing, setCropProcessing] = useState(false);

  // Load existing photos on mount
  useEffect(() => {
    fetchProfilePhotos()
      .then(({ photos }) => {
        const primary = photos.find((p) => p.is_primary);
        if (primary) setExistingPrimary(primary);
        const cards = photos
          .filter((p) => !p.is_primary)
          .sort((a, b) => a.photo_order - b.photo_order);
        if (cards.length > 0) {
          setCardSlots((prev) => {
            const next = [...prev];
            cards.slice(0, MAX_CARDS).forEach((c, i) => {
              next[i] = { kind: 'server', url: c.signed_url, id: c.id };
            });
            return next;
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingExisting(false));
  }, []);

  // ─── Pickers ───────────────────────────────────────────────────────────────

  const pickPrimary = useCallback(async () => {
    setError(null);
    if (!(await requestLibraryPermission())) {
      setError('Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (asset.width < 720 || asset.height < 900) {
      setError('Image too small. Upload at least 720 × 900 px for your profile avatar.');
      return;
    }
    setCropState({ asset, mode: 'primary' });
  }, []);

  const pickCard = useCallback(async (slotIdx: number) => {
    setError(null);
    if (!(await requestLibraryPermission())) {
      setError('Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || result.assets.length === 0) {
      console.warn('[pickCard] Picker returned canceled or empty', { canceled: result.canceled, assetCount: result.assets?.length });
      return;
    }
    const asset = result.assets[0];
    if (asset.width < 720 || asset.height < 960) {
      setError('Image too small. Upload at least 720 × 960 px for card photos.');
      return;
    }
    setCropState({ asset, mode: 'card', cardIdx: slotIdx });
  }, []);

  const handleCropConfirm = useCallback(async (crop: CropRegion) => {
    if (!cropState) return;
    setCropProcessing(true);
    try {
      if (cropState.mode === 'primary') {
        setPrimaryProcessing(true);
        const processed = await processWithCrop(
          cropState.asset, crop, 1080, 'profile_avatar.webp',
        );
        setNewPrimary(processed);
      } else if (cropState.mode === 'card' && cropState.cardIdx != null) {
        setProcessingCardIdx(cropState.cardIdx);
        const processed = await processWithCrop(
          cropState.asset, crop, 1080, `swipe_photo_${cropState.cardIdx + 1}.webp`,
        );
        setCardSlots((prev) => {
          const next = [...prev];
          next[cropState.cardIdx!] = { kind: 'local', photo: processed };
          return next;
        });
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setCropProcessing(false);
      setPrimaryProcessing(false);
      setProcessingCardIdx(null);
      setCropState(null);
    }
  }, [cropState]);

  // ─── Delete handlers ───────────────────────────────────────────────────────

  const handleDeletePrimary = useCallback(async () => {
    if (newPrimary) {
      // Local selection — just clear, no API call
      setNewPrimary(null);
      return;
    }
    if (!existingPrimary) return;
    setIsDeletingPrimary(true);
    setError(null);
    try {
      await deleteProfilePhoto(existingPrimary.id);
      setExistingPrimary(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to delete photo.');
    } finally {
      setIsDeletingPrimary(false);
    }
  }, [existingPrimary, newPrimary]);

  const handleDeleteCard = useCallback(async (slotIdx: number) => {
    const slot = cardSlots[slotIdx];
    if (!slot) return;
    if (slot.kind === 'local') {
      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = null;
        return next;
      });
      return;
    }
    setDeletingCardId(slot.id);
    setError(null);
    try {
      await deleteProfilePhoto(slot.id);
      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = null;
        return next;
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to delete photo.');
    } finally {
      setDeletingCardId(null);
    }
  }, [cardSlots]);

  // ─── Submit ────────────────────────────────────────────────────────────────

  const isRejected = existingPrimary?.moderation_status === 'REJECTED';

  const handleSubmit = useCallback(async () => {
    const hasPrimary = existingPrimary !== null || newPrimary !== null;
    const hasCard = cardSlots.some((s) => s !== null);
    if (!hasPrimary || !hasCard) {
      setError('One profile photo and at least one card photo are required.');
      return;
    }
    if (isRejected && !newPrimary) { setError('Your profile photo was rejected. Please upload a new one.'); return; }

    setError(null);
    setIsSubmitting(true);
    try {
      const localCards = cardSlots
        .map((slot, i) => ({ slot, i }))
        .filter((x): x is { slot: { kind: 'local'; photo: ProcessedImage }; i: number } =>
          x.slot?.kind === 'local',
        );

      const hasNewPhotos = newPrimary !== null || localCards.length > 0;

      if (hasNewPhotos) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');
        const userId = session.user.id;

        setUploadStatus('Uploading photos…');
        const uploadTasks: { uri: string; fileName: string; photoOrder: number }[] = [
          ...(newPrimary
            ? [{ uri: newPrimary.uri, fileName: newPrimary.fileName, photoOrder: 0 }]
            : []),
          ...localCards.map(({ slot, i }) => ({
              uri: slot.photo.uri,
              fileName: slot.photo.fileName,
              photoOrder: i + 1,
            })),
        ];
        const uploads: { storageBucket: string; storagePath: string; photoOrder: number }[] = [];
        for (let i = 0; i < uploadTasks.length; i++) {
          setUploadStatus(`Uploading photo ${i + 1} of ${uploadTasks.length}…`);
          const result = await uploadOneToSupabase(
            userId,
            uploadTasks[i].uri,
            uploadTasks[i].fileName,
            uploadTasks[i].photoOrder,
          );
          uploads.push(result);
        }

        setUploadStatus('Registering photos…');
        await batchRegisterProfilePhotos({
          photos: uploads.map((u) => ({
            storage_bucket: u.storageBucket,
            storage_path: u.storagePath,
            photo_order: u.photoOrder,
            is_primary: u.photoOrder === 0,
          })),
        });
      }

      await onComplete();
    } catch (e: unknown) {
      const detail = extractApiError(e);
      setError(detail.message);
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  }, [existingPrimary, newPrimary, cardSlots, isRejected, onComplete]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const primaryUri = newPrimary?.uri ?? existingPrimary?.signed_url ?? null;
  const hasPrimary = primaryUri != null;
  const filledCards = cardSlots.filter(Boolean).length;
  const canSubmit = !isSubmitting && (!isRejected || newPrimary !== null);

  const GAP = 8;
  const cardWidth = Math.floor((screenW - spacing.md * 2 - GAP * 2) / 3);
  const cardHeight = Math.floor(cardWidth * 4 / 3);

  if (isLoadingExisting) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: th.text }]}>{t('onboarding.photo.title')}</Text>
      <Text style={[styles.subtitle, { color: th.textSecondary }]}>
        {t('onboarding.photo.subtitle')}
      </Text>

      {/* ── Primary Avatar ─────────────────────────────────────────────────── */}
      <Text style={[styles.sectionLabel, { color: th.textMuted }]}>{t('onboarding.photo.profileAvatar')}</Text>
      <View style={[styles.primaryRow, { backgroundColor: th.surface, borderColor: th.border }]}>
        <TouchableOpacity
          onPress={pickPrimary}
          activeOpacity={0.8}
          style={[
            styles.primarySlot,
            { backgroundColor: th.backgroundElement, borderColor: hasPrimary ? colors.primary : th.border },
          ]}
        >
          {primaryProcessing ? (
            <ActivityIndicator color={colors.primary} />
          ) : primaryUri ? (
            <>
              <Image source={{ uri: primaryUri }} style={styles.fill} />
              <TouchableOpacity
                style={[styles.deleteBadge, isDeletingPrimary && { opacity: 0.7 }]}
                onPress={handleDeletePrimary}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              >
                {isDeletingPrimary ? (
                  <ActivityIndicator color="#FFF" size={10} />
                ) : (
                  <Ionicons name="close" size={11} color="#FFF" />
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.slotEmpty}>
              <Ionicons name="camera-outline" size={28} color={th.textMuted} />
              <Text style={[styles.slotEmptyText, { color: th.textMuted }]}>{t('onboarding.photo.add')}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.primaryInfo}>
          <Text style={[styles.primaryInfoTitle, { color: th.text }]}>{t('onboarding.photo.profilePhoto')}</Text>
          <Text style={[styles.primaryInfoSub, { color: th.textSecondary }]}>
            {t('onboarding.photo.profilePhotoDesc')}
          </Text>
          <Text style={[styles.primaryInfoMeta, { color: th.textMuted }]}>
            4:5 · min 720×900 px · WebP 1080×1350
          </Text>
          {/* Moderation status */}
          {existingPrimary != null && !newPrimary && (
            <View style={styles.moderationRow}>
              <View style={[styles.moderationDot, { backgroundColor: moderationColor(existingPrimary.moderation_status) }]} />
              <Text style={[styles.moderationStatus, { color: moderationColor(existingPrimary.moderation_status) }]}>
                {moderationLabel(existingPrimary.moderation_status)}
              </Text>
            </View>
          )}
          {existingPrimary?.moderation_status === 'REJECTED' && existingPrimary.rejection_reason && (
            <Text style={[styles.primaryInfoMeta, { color: '#EF4444' }]} numberOfLines={2}>
              {existingPrimary.rejection_reason}
            </Text>
          )}
        </View>
      </View>

      {/* ── Card Photos ────────────────────────────────────────────────────── */}
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionLabel, { color: th.textMuted }]}>{t('onboarding.photo.discoveryCards')}</Text>
        <Text style={[styles.sectionCount, { color: filledCards > 0 ? colors.primary : th.textMuted }]}>
          {filledCards} / {MAX_CARDS}
        </Text>
      </View>
      <Text style={[styles.cardHint, { color: th.textSecondary }]}>
        {t('onboarding.photo.cardHint')}
      </Text>

      <View style={[styles.cardGrid, { gap: GAP }]}>
        {cardSlots.map((slot, i) => {
          const isProcessing = processingCardIdx === i;
          const slotUri = slot?.kind === 'server' ? slot.url : slot?.kind === 'local' ? slot.photo.uri : null;
          const isLocal = slot?.kind === 'local';
          const isServer = slot?.kind === 'server';

          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                if (isProcessing || isServer) return;
                pickCard(i);
              }}
              activeOpacity={isServer ? 1 : 0.75}
              style={[
                styles.cardSlot,
                {
                  width: cardWidth,
                  height: cardHeight,
                  backgroundColor: th.surface,
                  borderColor: slotUri ? colors.primary : th.border,
                },
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.primary} />
              ) : slotUri ? (
                <>
                  <Image source={{ uri: slotUri }} style={styles.fill} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleDeleteCard(i)}
                    hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                  >
                    <View style={styles.removeBtnInner}>
                      {isServer && deletingCardId === slot?.id ? (
                        <ActivityIndicator color="#FFF" size={10} />
                      ) : (
                        <Ionicons name="close" size={12} color="#FFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.slotEmpty}>
                  <Ionicons name="add" size={26} color={th.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.cardMeta, { color: th.textMuted }]}>
        3:4 · min 720×960 px · WebP 1080×1440 · tap empty slot to add
      </Text>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.btn, !canSubmit && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <View style={styles.submitRow}>
            <ActivityIndicator color="#FFF" size="small" />
            <Text style={styles.btnText}>{uploadStatus || t('onboarding.photo.uploading')}</Text>
          </View>
        ) : (
          <Text style={styles.btnText}>
            {newPrimary || cardSlots.some((s) => s?.kind === 'local') ? t('onboarding.photo.uploadAndContinue') : t('onboarding.photo.continue')}
          </Text>
        )}
      </TouchableOpacity>

      <View style={[styles.reviewNote, { backgroundColor: th.surface, borderColor: th.border }]}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
        <Text style={[styles.reviewNoteText, { color: th.textSecondary }]}>
          {t('onboarding.photo.reviewNote')}
        </Text>
      </View>
      <ImageCropModal
        visible={cropState !== null}
        imageUri={cropState?.asset.uri ?? ''}
        imageWidth={cropState?.asset.width ?? 1}
        imageHeight={cropState?.asset.height ?? 1}
        aspectRatio={cropState?.mode === 'primary' ? 4 / 5 : 3 / 4}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropState(null)}
        processing={cropProcessing}
      />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxxl },

  title: { fontSize: 26, fontWeight: '800', marginBottom: 6, letterSpacing: -0.4, marginTop: spacing.xs },
  subtitle: { fontSize: 15, marginBottom: spacing.sm, lineHeight: 22 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionCount: { fontSize: 12, fontWeight: '700' },

  // Primary row
  primaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  primarySlot: {
    width: 108,
    height: 135,
    borderRadius: radius.md,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryInfo: { flex: 1, gap: 4, justifyContent: 'center' },
  primaryInfoTitle: { fontSize: 14, fontWeight: '700' },
  primaryInfoSub: { fontSize: 12, lineHeight: 17 },
  primaryInfoMeta: { fontSize: 10, letterSpacing: 0.2 },
  moderationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  moderationDot: { width: 8, height: 8, borderRadius: 4 },
  moderationStatus: { fontSize: 11, fontWeight: '700' },

  // Card grid
  cardHint: { fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cardSlot: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  fill: { width: '100%', height: '100%', resizeMode: 'cover' },
  slotEmpty: { alignItems: 'center', gap: 4 },
  slotEmptyText: { fontSize: 10, fontWeight: '600' },
  deleteBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,60,60,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: { position: 'absolute', top: 5, right: 5 },
  removeBtnInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,60,60,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: { fontSize: 10, letterSpacing: 0.2, marginTop: 2, marginBottom: spacing.md },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,80,80,0.08)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.25)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  errorText: { color: '#FF6B6B', fontSize: 13, flex: 1 },

  // Submit
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  submitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  // Review note
  reviewNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  reviewNoteText: { fontSize: 12, flex: 1, lineHeight: 18 },
});
