import * as ImageManipulator from 'expo-image-manipulator';
import type { ImagePickerAsset } from 'expo-image-picker';

export type ProcessedImage = {
  uri: string;
  fileName: string;
  mimeType: 'image/webp';
};

const QUALITY = 0.85;

const MIN_PRIMARY_W = 512;
const MIN_PRIMARY_H = 512;
const OUT_PRIMARY_W = 1024;
const OUT_PRIMARY_H = 1024;

const MIN_CARD_W = 720;
const MIN_CARD_H = 1080;
const OUT_CARD_W = 1080;
const OUT_CARD_H = 1620;

export async function processPrimaryPhoto(asset: ImagePickerAsset): Promise<ProcessedImage> {
  if (asset.width < MIN_PRIMARY_W || asset.height < MIN_PRIMARY_H) {
    throw new Error(
      `Image too small. Upload at least ${MIN_PRIMARY_W} × ${MIN_PRIMARY_H} px for your profile avatar.`,
    );
  }
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: OUT_PRIMARY_W, height: OUT_PRIMARY_H } }],
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
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: OUT_CARD_W, height: OUT_CARD_H } }],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.WEBP },
  );
  return {
    uri: result.uri,
    fileName: `swipe_photo_${slotIndex + 1}.webp`,
    mimeType: 'image/webp',
  };
}
