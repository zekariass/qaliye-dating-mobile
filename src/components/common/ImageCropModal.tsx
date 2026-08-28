import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';

export type CropRegion = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

type Props = {
  visible: boolean;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  aspectRatio: number;
  onConfirm: (crop: CropRegion) => void;
  onCancel: () => void;
  title?: string;
  processing?: boolean;
};

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

export function ImageCropModal({
  visible,
  imageUri,
  imageWidth,
  imageHeight,
  aspectRatio,
  onConfirm,
  onCancel,
  title = 'Crop Photo',
  processing = false,
}: Props) {
  const insets = useSafeAreaInsets();

  // Canvas area (between top bar and bottom bar)
  const topBarH = (insets.top || 12) + 44;
  const bottomBarH = (insets.bottom || 12) + 60;
  const canvasTop = topBarH;
  const canvasH = SCREEN_H - topBarH - bottomBarH;

  // Image display: fit inside canvas
  const imgScale = Math.min(SCREEN_W / imageWidth, canvasH / imageHeight);
  const imgW = imageWidth * imgScale;
  const imgH = imageHeight * imgScale;
  const imgLeft = (SCREEN_W - imgW) / 2;
  const imgTop = canvasTop + (canvasH - imgH) / 2;

  // Crop frame: starts as large as possible within image, maintaining aspect ratio
  const maxCropW = imgW;
  const maxCropH = imgH;
  let initFrameW = maxCropW;
  let initFrameH = initFrameW / aspectRatio;
  if (initFrameH > maxCropH) {
    initFrameH = maxCropH;
    initFrameW = initFrameH * aspectRatio;
  }
  const initFrameLeft = imgLeft + (imgW - initFrameW) / 2;
  const initFrameTop = imgTop + (imgH - initFrameH) / 2;

  // Crop frame position (draggable)
  const cropXRef = useRef(initFrameLeft);
  const cropYRef = useRef(initFrameTop);
  const cropWRef = useRef(initFrameW);
  const cropHRef = useRef(initFrameH);

  const cropX = useRef(new Animated.Value(initFrameLeft)).current;
  const cropY = useRef(new Animated.Value(initFrameTop)).current;
  const cropW = useRef(new Animated.Value(initFrameW)).current;
  const cropH = useRef(new Animated.Value(initFrameH)).current;

  // Min crop size (10% of image)
  const minCropW = imgW * 0.1;

  // Refs for image bounds (avoids stale closures in PanResponder)
  const imgBoundsRef = useRef({ imgLeft, imgTop, imgW, imgH, aspectRatio, minCropW });
  imgBoundsRef.current = { imgLeft, imgTop, imgW, imgH, aspectRatio, minCropW };

  // Derived animated values for dark overlay rectangles
  const cropRight = useRef(Animated.add(cropX, cropW)).current;
  const cropBottom = useRef(Animated.add(cropY, cropH)).current;
  const overlayRightW = useRef(Animated.subtract(Animated.subtract(SCREEN_W, cropX), cropW)).current;
  const overlayBottomH = useRef(Animated.subtract(Animated.subtract(canvasTop + canvasH, cropY), cropH)).current;

  const gestureRef = useRef({
    mode: 'move' as 'move' | 'resize',
    startCropX: 0,
    startCropY: 0,
    startCropW: 0,
    startCropH: 0,
    startDist: 0,
  });

  const resetCrop = useCallback(() => {
    cropX.setValue(initFrameLeft);
    cropY.setValue(initFrameTop);
    cropW.setValue(initFrameW);
    cropH.setValue(initFrameH);
    cropXRef.current = initFrameLeft;
    cropYRef.current = initFrameTop;
    cropWRef.current = initFrameW;
    cropHRef.current = initFrameH;
  }, [cropX, cropY, cropW, cropH, initFrameLeft, initFrameTop, initFrameW, initFrameH]);

  useEffect(() => {
    if (visible) {
      resetCrop();
    }
  }, [visible, resetCrop]);

  const getDistance = (touches: { pageX: number; pageY: number }[]) => {
    const dx = touches[1].pageX - touches[0].pageX;
    const dy = touches[1].pageY - touches[0].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length >= 2) {
          gestureRef.current.mode = 'resize';
          gestureRef.current.startDist = getDistance(touches);
          gestureRef.current.startCropW = cropWRef.current;
          gestureRef.current.startCropH = cropHRef.current;
          gestureRef.current.startCropX = cropXRef.current;
          gestureRef.current.startCropY = cropYRef.current;
        } else {
          gestureRef.current.mode = 'move';
          gestureRef.current.startCropX = cropXRef.current;
          gestureRef.current.startCropY = cropYRef.current;
        }
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        const b = imgBoundsRef.current;

        if (touches.length >= 2) {
          // Transition move→resize: capture starting pinch state
          if (gestureRef.current.mode !== 'resize') {
            gestureRef.current.mode = 'resize';
            gestureRef.current.startDist = getDistance(touches);
            gestureRef.current.startCropW = cropWRef.current;
            gestureRef.current.startCropH = cropHRef.current;
            gestureRef.current.startCropX = cropXRef.current;
            gestureRef.current.startCropY = cropYRef.current;
          }
          const dist = getDistance(touches);
          const ratio = dist / gestureRef.current.startDist;
          let newW = Math.max(b.minCropW, Math.min(b.imgW, gestureRef.current.startCropW * ratio));
          let newH = newW / b.aspectRatio;
          if (newH > b.imgH) {
            newH = b.imgH;
            newW = newH * b.aspectRatio;
          }
          // Keep center fixed
          const centerX = gestureRef.current.startCropX + gestureRef.current.startCropW / 2;
          const centerY = gestureRef.current.startCropY + gestureRef.current.startCropH / 2;
          let newX = centerX - newW / 2;
          let newY = centerY - newH / 2;
          // Clamp within image
          newX = Math.max(b.imgLeft, Math.min(b.imgLeft + b.imgW - newW, newX));
          newY = Math.max(b.imgTop, Math.min(b.imgTop + b.imgH - newH, newY));
          cropX.setValue(newX);
          cropY.setValue(newY);
          cropW.setValue(newW);
          cropH.setValue(newH);
          cropXRef.current = newX;
          cropYRef.current = newY;
          cropWRef.current = newW;
          cropHRef.current = newH;
        } else {
          // Transition resize→move: adjust start positions to prevent jump
          if (gestureRef.current.mode !== 'move') {
            gestureRef.current.mode = 'move';
            gestureRef.current.startCropX = cropXRef.current - gs.dx;
            gestureRef.current.startCropY = cropYRef.current - gs.dy;
          }
          const newX = gestureRef.current.startCropX + gs.dx;
          const newY = gestureRef.current.startCropY + gs.dy;
          const minX = b.imgLeft;
          const minY = b.imgTop;
          const maxX = b.imgLeft + b.imgW - cropWRef.current;
          const maxY = b.imgTop + b.imgH - cropHRef.current;
          const cx = Math.max(minX, Math.min(maxX, newX));
          const cy = Math.max(minY, Math.min(maxY, newY));
          cropX.setValue(cx);
          cropY.setValue(cy);
          cropXRef.current = cx;
          cropYRef.current = cy;
        }
      },
    }),
  ).current;

  const handleConfirm = useCallback(() => {
    const cx = cropXRef.current;
    const cy = cropYRef.current;
    const cw = cropWRef.current;
    const ch = cropHRef.current;

    // Convert screen coords to image pixel coords
    const originX = Math.round(((cx - imgLeft) / imgW) * imageWidth);
    const originY = Math.round(((cy - imgTop) / imgH) * imageHeight);
    const w = Math.round((cw / imgW) * imageWidth);
    const h = Math.round((ch / imgH) * imageHeight);

    onConfirm({
      originX: Math.max(0, originX),
      originY: Math.max(0, originY),
      width: Math.min(w, imageWidth - originX),
      height: Math.min(h, imageHeight - originY),
    });
  }, [imgLeft, imgTop, imgW, imgH, imageWidth, imageHeight, onConfirm]);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={[styles.topBar, { paddingTop: insets.top || 12 }]}>
          <TouchableOpacity onPress={onCancel} disabled={processing} style={styles.topBtn}>
            <Text style={styles.topBtnTextCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{title}</Text>
          <TouchableOpacity onPress={handleConfirm} disabled={processing} style={styles.topBtn}>
            {processing ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={styles.topBtnTextDone}>Done</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.canvas}>
          {/* Static image */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: imgLeft,
              top: imgTop,
              width: imgW,
              height: imgH,
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: imgW, height: imgH }}
              resizeMode="contain"
            />
          </View>

          {/* Dark overlay rectangles (top, bottom, left, right) */}
          <Animated.View pointerEvents="none" style={[styles.dim, { left: 0, top: 0, width: SCREEN_W, height: cropY }]} />
          <Animated.View pointerEvents="none" style={[styles.dim, { left: 0, top: cropY, width: cropX, height: cropH }]} />
          <Animated.View pointerEvents="none" style={[styles.dim, { left: cropRight, top: cropY, width: overlayRightW, height: cropH }]} />
          <Animated.View pointerEvents="none" style={[styles.dim, { left: 0, top: cropBottom, width: SCREEN_W, height: overlayBottomH }]} />

          {/* Crop frame border */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cropFrame,
              {
                left: cropX,
                top: cropY,
                width: cropW,
                height: cropH,
              },
            ]}
          >
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={[styles.gridLine, styles.gridLineV1]} />
            <View style={[styles.gridLine, styles.gridLineV2]} />
            <View style={[styles.gridLine, styles.gridLineH1]} />
            <View style={[styles.gridLine, styles.gridLineH2]} />
          </Animated.View>

          {/* Transparent gesture capture layer on top */}
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
        </View>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 12 }]}>
          <Text style={styles.hintText}>Drag to move • Pinch to resize</Text>
          <TouchableOpacity
            onPress={resetCrop}
            disabled={processing}
            style={styles.resetBtn}
          >
            <Ionicons name="refresh-outline" size={22} color="#FFF" />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#000',
  },
  topBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  topBtnTextCancel: {
    color: '#FFF',
    fontSize: 16,
  },
  topBtnTextDone: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  topTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFF',
    borderWidth: 4,
  },
  cornerTL: {
    top: -4,
    left: -4,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -4,
    right: -4,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -4,
    left: -4,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -4,
    right: -4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 4,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  gridLineV1: {
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
  },
  gridLineV2: {
    top: 0,
    bottom: 0,
    left: '66.66%',
    width: 1,
  },
  gridLineH1: {
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
  },
  gridLineH2: {
    left: 0,
    right: 0,
    top: '66.66%',
    height: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 8,
    backgroundColor: '#000',
  },
  hintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  resetText: {
    color: '#FFF',
    fontSize: 14,
  },
});
