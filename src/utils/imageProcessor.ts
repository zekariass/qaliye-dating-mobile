import * as ImageManipulator from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

export type ProcessedImage = {
  uri: string;
  fileName: string;
  mimeType: 'image/webp';
};

const QUALITY = 0.85;

const MIN_PRIMARY_W = 720;
const MIN_PRIMARY_H = 900;
const OUT_PRIMARY_W = 1080;
const OUT_PRIMARY_H = 1350;

const MIN_CARD_W = 720;
const MIN_CARD_H = 960;
const OUT_CARD_W = 1080;
const OUT_CARD_H = 1440;

const getAssetMimeType = (asset: ImagePickerAsset): string | undefined =>
  (asset as { mimeType?: string | null }).mimeType?.toLowerCase();

const isWebpAsset = (asset: ImagePickerAsset): boolean => {
  const uriExt = asset.uri.split('.').pop()?.toLowerCase();
  const mimeType = getAssetMimeType(asset);
  return uriExt === 'webp' || mimeType === 'image/webp';
};

export async function processPrimaryPhoto(asset: ImagePickerAsset): Promise<ProcessedImage> {
  if (asset.width < MIN_PRIMARY_W || asset.height < MIN_PRIMARY_H) {
    throw new Error(
      `Image too small. Upload at least ${MIN_PRIMARY_W} × ${MIN_PRIMARY_H} px for your profile avatar.`,
    );
  }
  if (isWebpAsset(asset)) {
    return { uri: asset.uri, fileName: 'profile_avatar.webp', mimeType: 'image/webp' };
  }
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: OUT_PRIMARY_W } }],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.WEBP },
  );
  return { uri: result.uri, fileName: 'profile_avatar.webp', mimeType: 'image/webp' };
}

export async function processCardPhoto(
  asset: ImagePickerAsset,
  slotIndex: number,
): Promise<ProcessedImage> {
  if (asset.width < MIN_CARD_W || asset.height < MIN_CARD_H) {
    throw new Error(
      `Image too small. Upload at least ${MIN_CARD_W} × ${MIN_CARD_H} px for card photos.`,
    );
  }
  if (isWebpAsset(asset)) {
    return {
      uri: asset.uri,
      fileName: `swipe_photo_${slotIndex + 1}.webp`,
      mimeType: 'image/webp',
    };
  }
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: OUT_CARD_W } }],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.WEBP },
  );
  return {
    uri: result.uri,
    fileName: `swipe_photo_${slotIndex + 1}.webp`,
    mimeType: 'image/webp',
  };
}

export async function processProfileEditPhoto(asset: ImagePickerAsset): Promise<ProcessedImage> {
  const fileName = `profile_photo_${Date.now()}.webp`;

  if (isWebpAsset(asset)) {
    return { uri: asset.uri, fileName, mimeType: 'image/webp' };
  }

  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.WEBP },
  );

  return { uri: result.uri, fileName, mimeType: 'image/webp' };
}

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp']);

export function isImageMimeType(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false;
  return IMAGE_MIME_TYPES.has(mimeType.toLowerCase());
}

const CHAT_MAX_DIMENSION = 1280;

export async function processChatImage(
  asset: ImagePickerAsset,
  maxDimension: number = CHAT_MAX_DIMENSION,
): Promise<ProcessedImage> {
  const fileName = `chat_image_${Date.now()}.webp`;

  if (isWebpAsset(asset) && asset.width <= maxDimension && asset.height <= maxDimension) {
    return { uri: asset.uri, fileName, mimeType: 'image/webp' };
  }

  const longest = Math.max(asset.width, asset.height);
  const actions: ImageManipulator.Action[] =
    longest > maxDimension
      ? [{ resize: { width: Math.round(asset.width * maxDimension / longest) } }]
      : [];

  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    actions,
    { compress: QUALITY, format: ImageManipulator.SaveFormat.WEBP },
  );

  return { uri: result.uri, fileName, mimeType: 'image/webp' };
}
