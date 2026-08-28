import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { deleteProfilePhoto, fetchProfilePhotos, registerProfilePhoto } from '@/api/profile/profileApi';
import { ImageCropModal, type CropRegion } from '@/components/common/ImageCropModal';
import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import type { ProfilePhotoDto } from '@/types/profile';
import { extractApiError, getApiErrorMessage } from '@/utils/apiError';
import type { ProcessedImage } from '@/utils/imageProcessor';
import { processWithCrop } from '@/utils/imageProcessor';
import { getModerationMessage, isModerationRejection } from '@/utils/photoModeration';
import type { ImagePickerAsset } from 'expo-image-picker';

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = { onComplete: () => Promise<void>; isCompleted: boolean };

type UploadStatus = 'idle' | 'queued' | 'uploading' | 'success' | 'error';

type PhotoSlot = {
  uri: string | null;
  serverId: string | null;
  status: UploadStatus;
  processed: ProcessedImage | null;
  errorMessage: string | null;
  /** True when the error is a content-moderation rejection (not retryable). */
  isModerationRejection?: boolean;
};

type CardSlot = PhotoSlot | null;

const MAX_CARDS = 6;
const MAX_CONCURRENT_UPLOADS = 2;
const SUCCESS_BORDER_DURATION = 3000;

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

function emptySlots(): CardSlot[] {
  return Array(MAX_CARDS).fill(null);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PhotoStep({ onComplete }: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const screenW = Dimensions.get('window').width;

  // Primary photo
  const [existingPrimary, setExistingPrimary] = useState<ProfilePhotoDto | null>(null);
  const [primarySlot, setPrimarySlot] = useState<PhotoSlot>({
    uri: null, serverId: null, status: 'idle', processed: null, errorMessage: null,
  });
  const [isDeletingPrimary, setIsDeletingPrimary] = useState(false);

  // Card photos
  const [cardSlots, setCardSlots] = useState<CardSlot[]>(emptySlots());
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const [isLoadingExisting, setIsLoadingExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<{
    slotKey: string;
    message: string;
    isPrimary: boolean;
    slotIdx: number;
    isModerationRejection: boolean;
  } | null>(null);

  // Crop modal state
  const [cropState, setCropState] = useState<{
    asset: ImagePickerAsset;
    mode: 'primary' | 'card';
    cardIdx?: number;
  } | null>(null);
  const [cropProcessing, setCropProcessing] = useState(false);

  // Upload queue management
  const uploadQueue = useRef<(() => Promise<void>)[]>([]);
  const activeUploads = useRef(0);
  const uploadCancelRefs = useRef<Record<string, boolean>>({});
  const successTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ─── Load existing photos on mount ──────────────────────────────────────────

  useEffect(() => {
    fetchProfilePhotos()
      .then(({ photos }) => {
        const primary = photos.find((p) => p.is_primary);
        if (primary) {
          setExistingPrimary(primary);
          setPrimarySlot({
            uri: primary.signed_url,
            serverId: primary.id,
            status: 'idle',
            processed: null,
            errorMessage: null,
          });
        }
        const cards = photos
          .filter((p) => !p.is_primary)
          .sort((a, b) => a.photo_order - b.photo_order);
        if (cards.length > 0) {
          setCardSlots((prev) => {
            const next = [...prev];
            cards.slice(0, MAX_CARDS).forEach((c, i) => {
              next[i] = {
                uri: c.signed_url,
                serverId: c.id,
                status: 'idle',
                processed: null,
                errorMessage: null,
              };
            });
            return next;
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingExisting(false));
  }, []);

  // ─── Cleanup timers on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      Object.values(successTimers.current).forEach(clearTimeout);
    };
  }, []);

  // ─── Upload queue processor ─────────────────────────────────────────────────

  const processQueue = useCallback(() => {
    while (activeUploads.current < MAX_CONCURRENT_UPLOADS && uploadQueue.current.length > 0) {
      const task = uploadQueue.current.shift()!;
      activeUploads.current++;
      task().finally(() => {
        activeUploads.current--;
        processQueue();
      });
    }
  }, []);

  const enqueueUpload = useCallback((task: () => Promise<void>) => {
    uploadQueue.current.push(task);
    processQueue();
  }, [processQueue]);

  // ─── Core upload logic ──────────────────────────────────────────────────────

  const doUpload = useCallback(async (
    slotKey: string,
    processed: ProcessedImage,
    photoOrder: number,
    isPrimary: boolean,
    onSlotUpdate: (updater: (prev: PhotoSlot) => PhotoSlot) => void,
  ) => {
    if (uploadCancelRefs.current[slotKey]) {
      delete uploadCancelRefs.current[slotKey];
      return;
    }

    onSlotUpdate((prev) => ({ ...prev, status: 'uploading' }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const userId = session.user.id;

      if (uploadCancelRefs.current[slotKey]) {
        delete uploadCancelRefs.current[slotKey];
        onSlotUpdate((prev) => ({ ...prev, status: 'idle', uri: null, processed: null, errorMessage: null }));
        return;
      }

      const uploaded = await uploadOneToSupabase(
        userId, processed.uri, processed.fileName, photoOrder,
      );

      if (uploadCancelRefs.current[slotKey]) {
        delete uploadCancelRefs.current[slotKey];
        onSlotUpdate((prev) => ({ ...prev, status: 'idle', uri: null, processed: null, errorMessage: null }));
        return;
      }

      const dto = await registerProfilePhoto({
        storage_bucket: uploaded.storageBucket,
        storage_path: uploaded.storagePath,
        photo_order: photoOrder,
        is_primary: isPrimary,
      });

      if (uploadCancelRefs.current[slotKey]) {
        delete uploadCancelRefs.current[slotKey];
        onSlotUpdate((prev) => ({ ...prev, status: 'idle', uri: null, processed: null, errorMessage: null }));
        return;
      }

      onSlotUpdate((prev) => ({
        ...prev,
        uri: dto.signed_url,
        serverId: dto.id,
        status: 'success',
      }));

      if (isPrimary) setExistingPrimary(dto);

      successTimers.current[slotKey] = setTimeout(() => {
        onSlotUpdate((prev) => (prev.status === 'success' ? { ...prev, status: 'idle' } : prev));
        delete successTimers.current[slotKey];
      }, SUCCESS_BORDER_DURATION);

    } catch (err) {
      if (uploadCancelRefs.current[slotKey]) {
        delete uploadCancelRefs.current[slotKey];
        onSlotUpdate((prev) => ({ ...prev, status: 'idle', uri: null, processed: null, errorMessage: null }));
        return;
      }
      const detail = extractApiError(err);
      const moderationRejection = isModerationRejection(detail);
      const msg = moderationRejection ? getModerationMessage() : getApiErrorMessage(detail);
      onSlotUpdate((prev) => ({ ...prev, status: 'error', errorMessage: msg, isModerationRejection: moderationRejection }));
      setErrorModal({ slotKey, message: msg, isPrimary, slotIdx: isPrimary ? 0 : photoOrder - 1, isModerationRejection: moderationRejection });
    }
  }, []);

  // ─── Pickers ───────────────────────────────────────────────────────────────

  const pickPrimary = useCallback(async () => {
    if (primarySlot.status === 'uploading' || primarySlot.status === 'queued') return;
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
  }, [primarySlot.status]);

  const pickCard = useCallback(async (slotIdx: number) => {
    const slot = cardSlots[slotIdx];
    if (slot && (slot.status === 'uploading' || slot.status === 'queued')) return;
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
    if (asset.width < 720 || asset.height < 960) {
      setError('Image too small. Upload at least 720 × 960 px for card photos.');
      return;
    }
    setCropState({ asset, mode: 'card', cardIdx: slotIdx });
  }, [cardSlots]);

  // ─── Crop confirm: process image, show preview, enqueue upload ──────────────

  const handleCropConfirm = useCallback(async (crop: CropRegion) => {
    if (!cropState) return;
    setCropProcessing(true);
    try {
      const processed = await processWithCrop(
        cropState.asset,
        crop,
        1080,
        cropState.mode === 'primary'
          ? 'profile_avatar.webp'
          : `swipe_photo_${(cropState.cardIdx ?? 0) + 1}.webp`,
      );

      if (cropState.mode === 'primary') {
        const slotKey = 'primary';
        setPrimarySlot({
          uri: processed.uri,
          serverId: null,
          status: 'queued',
          processed,
          errorMessage: null,
        });
        enqueueUpload(() =>
          doUpload(slotKey, processed, 0, true, (updater) =>
            setPrimarySlot((prev) => updater(prev)),
          ),
        );
      } else if (cropState.mode === 'card' && cropState.cardIdx != null) {
        const idx = cropState.cardIdx;
        const slotKey = `card_${idx}`;
        setCardSlots((prev) => {
          const next = [...prev];
          next[idx] = { uri: processed.uri, serverId: null, status: 'queued', processed, errorMessage: null };
          return next;
        });
        enqueueUpload(() =>
          doUpload(slotKey, processed, idx + 1, false, (updater) =>
            setCardSlots((prev) => {
              const next = [...prev];
              if (next[idx]) next[idx] = updater(next[idx]!);
              return next;
            }),
          ),
        );
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setCropProcessing(false);
      setCropState(null);
    }
  }, [cropState, enqueueUpload, doUpload]);

  // ─── Cancel / Delete handlers ───────────────────────────────────────────────

  const handleCancelPrimary = useCallback(() => {
    const slotKey = 'primary';
    if (primarySlot.status === 'uploading' || primarySlot.status === 'queued') {
      uploadCancelRefs.current[slotKey] = true;
      setPrimarySlot({ uri: null, serverId: null, status: 'idle', processed: null, errorMessage: null });
      if (successTimers.current[slotKey]) {
        clearTimeout(successTimers.current[slotKey]);
        delete successTimers.current[slotKey];
      }
      return;
    }
    if (primarySlot.status === 'error') {
      setPrimarySlot({ uri: null, serverId: null, status: 'idle', processed: null, errorMessage: null });
      return;
    }
    if (primarySlot.serverId && existingPrimary) {
      setIsDeletingPrimary(true);
      setError(null);
      deleteProfilePhoto(existingPrimary.id)
        .then(() => {
          setExistingPrimary(null);
          setPrimarySlot({ uri: null, serverId: null, status: 'idle', processed: null, errorMessage: null });
        })
        .catch(() => setError('Failed to delete photo.'))
        .finally(() => setIsDeletingPrimary(false));
    }
  }, [primarySlot, existingPrimary]);

  const handleCancelCard = useCallback((slotIdx: number) => {
    const slot = cardSlots[slotIdx];
    if (!slot) return;
    const slotKey = `card_${slotIdx}`;

    if (slot.status === 'uploading' || slot.status === 'queued') {
      uploadCancelRefs.current[slotKey] = true;
      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = null;
        return next;
      });
      if (successTimers.current[slotKey]) {
        clearTimeout(successTimers.current[slotKey]);
        delete successTimers.current[slotKey];
      }
      return;
    }

    if (slot.status === 'error') {
      setCardSlots((prev) => {
        const next = [...prev];
        next[slotIdx] = null;
        return next;
      });
      return;
    }

    if (slot.serverId) {
      setDeletingCardId(slot.serverId);
      setError(null);
      deleteProfilePhoto(slot.serverId)
        .then(() => {
          setCardSlots((prev) => {
            const next = [...prev];
            next[slotIdx] = null;
            return next;
          });
        })
        .catch(() => setError('Failed to delete photo.'))
        .finally(() => setDeletingCardId(null));
    }
  }, [cardSlots]);

  // ─── Retry handler ──────────────────────────────────────────────────────────

  const handleRetry = useCallback((slotIdx: number) => {
    const slot = cardSlots[slotIdx];
    if (!slot || !slot.processed) return;
    const slotKey = `card_${slotIdx}`;

    setCardSlots((prev) => {
      const next = [...prev];
      if (next[slotIdx]) next[slotIdx] = { ...next[slotIdx]!, status: 'queued', errorMessage: null };
      return next;
    });

    enqueueUpload(() =>
      doUpload(slotKey, slot.processed!, slotIdx + 1, false, (updater) =>
        setCardSlots((prev) => {
          const next = [...prev];
          if (next[slotIdx]) next[slotIdx] = updater(next[slotIdx]!);
          return next;
        }),
      ),
    );
  }, [cardSlots, enqueueUpload, doUpload]);

  const handleRetryPrimary = useCallback(() => {
    if (!primarySlot.processed) return;
    const slotKey = 'primary';

    setPrimarySlot((prev) => ({ ...prev, status: 'queued', errorMessage: null }));

    enqueueUpload(() =>
      doUpload(slotKey, primarySlot.processed!, 0, true, (updater) =>
        setPrimarySlot((prev) => updater(prev)),
      ),
    );
  }, [primarySlot, enqueueUpload, doUpload]);

  // ─── Choose Another Photo (for moderation rejections) ───────────────────────

  const handleChooseAnotherPrimary = useCallback(() => {
    // Clear the failed slot, then open the picker
    setPrimarySlot({ uri: null, serverId: null, status: 'idle', processed: null, errorMessage: null });
    setError(null);
    // Defer picker call so state updates flush first
    setTimeout(() => pickPrimary(), 0);
  }, [pickPrimary]);

  const handleChooseAnotherCard = useCallback((slotIdx: number) => {
    setCardSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setError(null);
    // Defer picker call so state updates flush first
    setTimeout(() => pickCard(slotIdx), 0);
  }, [pickCard]);

  // ─── Submit ────────────────────────────────────────────────────────────────

  const isRejected = existingPrimary?.moderation_status === 'REJECTED';

  const handleSubmit = useCallback(async () => {
    const primaryOk = primarySlot.uri != null && primarySlot.status !== 'error';
    if (!primaryOk) {
      setError('A profile photo is required.');
      return;
    }
    if (isRejected) {
      setError('Your profile photo was rejected. Please delete it and upload a new one.');
      return;
    }
    const cardOk = cardSlots.filter((s) => s != null && s.uri != null && s.status !== 'error').length >= 2;
    if (!cardOk) {
      setError('At least two discovery card photos are required.');
      return;
    }

    setError(null);
    try {
      await onComplete();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [primarySlot, cardSlots, isRejected, onComplete]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const primaryUri = primarySlot.uri;
  const hasPrimary = primaryUri != null;
  const filledCards = cardSlots.filter(Boolean).length;

  const primaryBusy = primarySlot.status === 'uploading' || primarySlot.status === 'queued';
  const anyCardBusy = cardSlots.some((s) => s && (s.status === 'uploading' || s.status === 'queued'));
  const anyCardError = cardSlots.some((s) => s && s.status === 'error');
  const primaryError = primarySlot.status === 'error';

  // At least two card photos that have a URI and are not in error state
  const validCardCount = cardSlots.filter((s) => s != null && s.uri != null && s.status !== 'error').length;
  const hasMinCards = validCardCount >= 2;

  const canSubmit = !primaryBusy && !anyCardBusy && !primaryError && !anyCardError && !isRejected && hasPrimary && hasMinCards;

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
      <View style={styles.sectionRow}>
        <Text style={[styles.sectionLabel, { color: th.textMuted, marginBottom: 0, marginTop: 0 }]}>{t('onboarding.photo.profileAvatar')}</Text>
        <View style={styles.requiredBadge}>
          <Text style={styles.requiredStarText}>*</Text>
          <Text style={[styles.requiredLabelText, { color: th.textMuted }]}>{t('onboarding.photo.required')}</Text>
        </View>
      </View>
      <View style={[styles.primaryRow, { backgroundColor: th.surface, borderColor: th.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (primarySlot.status === 'error') {
              setErrorModal({ slotKey: 'primary', message: primarySlot.errorMessage ?? 'Upload failed', isPrimary: true, slotIdx: 0, isModerationRejection: !!primarySlot.isModerationRejection });
            } else {
              pickPrimary();
            }
          }}
          activeOpacity={0.8}
          disabled={primaryBusy || isDeletingPrimary}
          style={[
            styles.primarySlot,
            {
              backgroundColor: th.backgroundElement,
              borderColor: getSlotBorderColor(primarySlot.status, hasPrimary),
            },
          ]}
        >
          {primaryUri ? (
            <>
              <Image source={{ uri: primaryUri }} style={styles.fill} />
              {(primaryBusy) && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.uploadingText}>Uploading…</Text>
                </View>
              )}
              {primarySlot.status === 'success' && (
                <View style={styles.successBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                </View>
              )}
              {primarySlot.status === 'error' && (
                <View style={styles.errorBadge}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                </View>
              )}
              <TouchableOpacity
                style={styles.deleteBadge}
                onPress={handleCancelPrimary}
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
          {existingPrimary != null && primarySlot.status !== 'error' && (
            <View style={styles.moderationRow}>
              <View style={[styles.moderationDot, { backgroundColor: moderationColor(existingPrimary.moderation_status) }]} />
              <Text style={[styles.moderationStatus, { color: moderationColor(existingPrimary.moderation_status) }]}>
                {moderationLabel(existingPrimary.moderation_status)}
              </Text>
            </View>
          )}
          {existingPrimary?.moderation_status === 'REJECTED' && existingPrimary.rejection_reason && (
            <Text style={[styles.primaryInfoMeta, { color: th.textSecondary }]} numberOfLines={2}>
              {existingPrimary.rejection_reason}
            </Text>
          )}
        </View>
      </View>

      {/* ── Card Photos ────────────────────────────────────────────────────── */}
      <View style={styles.sectionRow}>
        <View style={styles.sectionLeft}>
          <Text style={[styles.sectionLabel, { color: th.textMuted, marginBottom: 0, marginTop: 0 }]}>{t('onboarding.photo.discoveryCards')}</Text>
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredStarText}>*</Text>
            <Text style={[styles.requiredLabelText, { color: th.textMuted }]}>{t('onboarding.photo.required')}</Text>
          </View>
        </View>
        <Text style={[styles.sectionCount, { color: hasMinCards ? colors.primary : th.textMuted }]}>
          {filledCards} / {MAX_CARDS}
        </Text>
      </View>
      <Text style={[styles.cardHint, { color: th.textSecondary }]}>
        {t('onboarding.photo.cardHint')}
      </Text>
      {!hasMinCards && (
        <View style={styles.cardRequiredHint}>
          <Ionicons name="information-circle-outline" size={14} color="#F59E0B" />
          <Text style={styles.cardRequiredHintText}>At least 2 card photos are required to continue.</Text>
        </View>
      )}

      <View style={[styles.cardGrid, { gap: GAP }]}>
        {cardSlots.map((slot, i) => {
          const slotUri = slot?.uri ?? null;
          const isBusy = slot != null && (slot.status === 'uploading' || slot.status === 'queued');
          const isError = slot?.status === 'error';
          const isSuccess = slot?.status === 'success';
          const hasServer = slot?.serverId != null;

          return (
            <View key={i} style={styles.cardSlotWrapper}>
              <TouchableOpacity
                onPress={() => {
                  if (isError) {
                    setErrorModal({ slotKey: `card_${i}`, message: slot?.errorMessage ?? 'Upload failed', isPrimary: false, slotIdx: i, isModerationRejection: !!slot?.isModerationRejection });
                  } else if (!isBusy && !hasServer && !slotUri) {
                    pickCard(i);
                  }
                }}
                activeOpacity={slotUri ? 1 : 0.75}
                disabled={isBusy || hasServer || (!!slotUri && !isError)}
                style={[
                  styles.cardSlot,
                  {
                    width: cardWidth,
                    height: cardHeight,
                    backgroundColor: th.surface,
                    borderColor: i < 2 && !hasMinCards && !slotUri
                      ? '#F59E0B'
                      : getSlotBorderColor(slot?.status ?? 'idle', !!slotUri),
                    borderWidth: i < 2 && !hasMinCards && !slotUri ? 1 : 1.5,
                  },
                ]}
              >
                {slotUri ? (
                  <>
                    <Image source={{ uri: slotUri }} style={styles.fill} />
                    {isBusy && (
                      <View style={styles.uploadOverlay}>
                        <ActivityIndicator color="#FFF" size="small" />
                        <Text style={styles.uploadingText}>Uploading…</Text>
                      </View>
                    )}
                    {isSuccess && (
                      <View style={styles.successBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                      </View>
                    )}
                    {isError && (
                      <View style={styles.errorBadge}>
                        <Ionicons name="alert-circle" size={20} color="#EF4444" />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleCancelCard(i)}
                      hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                    >
                      <View style={styles.removeBtnInner}>
                        {hasServer && deletingCardId === slot?.serverId ? (
                          <ActivityIndicator color="#FFF" size={10} />
                        ) : (
                          <Ionicons name="close" size={12} color="#FFF" />
                        )}
                      </View>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.slotEmpty}>
                    <Ionicons name="add" size={26} color={i < 2 && !hasMinCards ? '#F59E0B' : th.textMuted} />
                    {i < 2 && !hasMinCards && (
                      <Text style={styles.slotRequiredLabel}>Required</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
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

      {(primaryError || anyCardError) && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>Some photos failed to upload. Tap the photo to retry, choose another, or remove it.</Text>
        </View>
      )}

      {/* ── Submit ─────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.btn, !canSubmit && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>
          {t('onboarding.photo.continue')}
        </Text>
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

      {/* ── Upload Error Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={errorModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal(null)}
      >
        <View style={styles.errorModalOverlay}>
          <View style={[styles.errorModalCard, { backgroundColor: th.surface }]}>
            <View style={styles.errorModalIcon}>
              <Ionicons
                name={errorModal?.isModerationRejection ? 'shield-outline' : 'alert-circle'}
                size={40}
                color="#EF4444"
              />
            </View>
            <Text style={[styles.errorModalTitle, { color: th.text }]}>
              {errorModal?.isModerationRejection ? 'Photo not approved' : 'Upload failed'}
            </Text>
            <Text style={[styles.errorModalMessage, { color: th.textSecondary }]}>
              {errorModal?.message}
            </Text>
            <View style={styles.errorModalActions}>
              {errorModal?.isModerationRejection ? (
                /* Moderation rejection: Choose Another Photo (no Retry) */
                <TouchableOpacity
                  style={[styles.errorModalBtn, styles.errorModalBtnPrimary]}
                  onPress={() => {
                    if (errorModal?.isPrimary) {
                      handleChooseAnotherPrimary();
                    } else if (errorModal) {
                      handleChooseAnotherCard(errorModal.slotIdx);
                    }
                    setErrorModal(null);
                  }}
                >
                  <Text style={styles.errorModalBtnTextPrimary}>
                    Choose Another Photo
                  </Text>
                </TouchableOpacity>
              ) : (
                /* Technical error: Retry */
                <TouchableOpacity
                  style={[styles.errorModalBtn, styles.errorModalBtnPrimary]}
                  onPress={() => {
                    if (errorModal?.isPrimary) {
                      handleRetryPrimary();
                    } else if (errorModal) {
                      handleRetry(errorModal.slotIdx);
                    }
                    setErrorModal(null);
                  }}
                >
                  <Text style={styles.errorModalBtnTextPrimary}>
                    Retry
                  </Text>
                </TouchableOpacity>
              )}
              {/* Secondary action: Remove Photo */}
              <TouchableOpacity
                style={[styles.errorModalBtn, styles.errorModalBtnSecondary, { borderColor: th.border }]}
                onPress={() => {
                  if (errorModal?.isPrimary) {
                    handleCancelPrimary();
                  } else if (errorModal) {
                    handleCancelCard(errorModal.slotIdx);
                  }
                  setErrorModal(null);
                }}
              >
                <Text style={[styles.errorModalBtnText, { color: th.textSecondary }]}>
                  Remove Photo
                </Text>
              </TouchableOpacity>
              {/* Tertiary action: Close */}
              <TouchableOpacity
                style={[styles.errorModalBtn, styles.errorModalBtnSecondary, { borderColor: th.border }]}
                onPress={() => setErrorModal(null)}
              >
                <Text style={[styles.errorModalBtnText, { color: th.textSecondary }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Slot border color helper ────────────────────────────────────────────────

function getSlotBorderColor(status: UploadStatus, hasUri: boolean): string {
  switch (status) {
    case 'uploading':
    case 'queued':
      return colors.primary;
    case 'success':
      return '#22C55E';
    case 'error':
      return '#EF4444';
    default:
      return hasUri ? colors.primary : 'transparent';
  }
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
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCount: { fontSize: 12, fontWeight: '700' },
  requiredBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  requiredStarText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
  requiredLabelText: { fontSize: 11, fontWeight: '700' },
  optionalText: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },

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
  cardSlotWrapper: { marginBottom: 8 },
  cardSlot: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fill: { width: '100%', height: '100%', resizeMode: 'cover' },
  slotEmpty: { alignItems: 'center', gap: 4 },
  slotEmptyText: { fontSize: 10, fontWeight: '600' },
  slotRequiredLabel: { fontSize: 9, fontWeight: '700', color: '#F59E0B', letterSpacing: 0.3 },

  cardRequiredHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.22)',
  },
  cardRequiredHintText: { fontSize: 12, color: '#D97706', fontWeight: '500', flex: 1 },

  // Upload overlay
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadingText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },

  // Success badge
  successBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 1,
  },

  // Error badge
  errorBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 1,
  },

  // Delete / cancel button
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

  // Global error
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

  // Error modal
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorModalIcon: {
    marginBottom: spacing.sm,
  },
  errorModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorModalMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  errorModalActions: {
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginBottom: spacing.sm,
  },
  errorModalBtn: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  errorModalBtnSecondary: {
    borderWidth: 1,
  },
  errorModalBtnPrimary: {
    backgroundColor: colors.primary,
  },
  errorModalBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorModalBtnTextPrimary: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
