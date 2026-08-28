// import { Ionicons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useTranslation } from 'react-i18next';
// import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';

// import { colors } from '@/constants/theme';
// import { useTheme } from '@/hooks/use-theme';

// export type PhotoSource = 'camera' | 'gallery';

// type Props = {
//   visible: boolean;
//   onSelect: (source: PhotoSource) => void;
//   onCancel: () => void;
// };

// export default function PhotoSourceModal({ visible, onSelect, onCancel }: Props) {
//   const { t } = useTranslation();
//   const { colors: th } = useTheme();
//   const { bottom: safeBottom } = useSafeAreaInsets();

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="slide"
//       statusBarTranslucent
//       onRequestClose={onCancel}
//     >
//       <Pressable style={styles.backdrop} onPress={onCancel}>
//         <Pressable
//           style={[
//             styles.sheet,
//             {
//               backgroundColor: th.surface,
//               paddingBottom: safeBottom + 16,
//             },
//           ]}
//           onPress={(e) => e.stopPropagation()}
//         >
//           {/* Grabber */}
//           <View style={styles.grabber} />

//           {/* Title */}
//           <Text style={[styles.title, { color: th.text }]}>
//             {t('photoSource.title', 'Add Photo')}
//           </Text>
//           <Text style={[styles.subtitle, { color: th.textSecondary }]}>
//             {t('photoSource.subtitle', 'Choose how you want to add your photo')}
//           </Text>

//           {/* Options — each button takes half the width, content centered */}
//           <View style={styles.optionsRow}>
//             {/* Take Photo */}
//             <Pressable
//               style={({ pressed }) => [
//                 styles.optionCard,
//                 { borderColor: th.border, opacity: pressed ? 0.7 : 1 },
//               ]}
//               onPress={() => onSelect('camera')}
//               accessibilityRole="button"
//               accessibilityLabel={t('photoSource.takePhoto', 'Take Photo')}
//             >
//               <LinearGradient
//                 colors={[colors.primary, colors.primaryDark]}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={styles.optionIconWrap}
//               >
//                 <Ionicons name="camera" size={28} color="#FFFFFF" />
//               </LinearGradient>
//               <Text style={[styles.optionTitle, { color: th.text }]}>
//                 {t('photoSource.takePhoto', 'Take Photo')}
//               </Text>
//               <Text style={[styles.optionDesc, { color: th.textSecondary }]}>
//                 {t('photoSource.takePhotoDesc', 'Use the camera')}
//               </Text>
//             </Pressable>

//             {/* Choose from Gallery */}
//             <Pressable
//               style={({ pressed }) => [
//                 styles.optionCard,
//                 { borderColor: th.border, opacity: pressed ? 0.7 : 1 },
//               ]}
//               onPress={() => onSelect('gallery')}
//               accessibilityRole="button"
//               accessibilityLabel={t('photoSource.chooseGallery', 'Choose from Gallery')}
//             >
//               <View style={[styles.optionIconWrap, { backgroundColor: colors.secondary + '18' }]}>
//                 <Ionicons name="images" size={28} color={colors.secondary} />
//               </View>
//               <Text style={[styles.optionTitle, { color: th.text }]}>
//                 {t('photoSource.chooseGallery', 'Gallery')}
//               </Text>
//               <Text style={[styles.optionDesc, { color: th.textSecondary }]}>
//                 {t('photoSource.chooseGalleryDesc', 'Pick from device')}
//               </Text>
//             </Pressable>
//           </View>

//           {/* Cancel — centered, red text */}
//           <Pressable
//             style={({ pressed }) => [
//               styles.cancelBtn,
//               { opacity: pressed ? 0.6 : 1 },
//             ]}
//             onPress={onCancel}
//             accessibilityRole="button"
//             accessibilityLabel={t('common.cancel', 'Cancel')}
//           >
//             <Text style={styles.cancelText}>
//               {t('common.cancel', 'Cancel')}
//             </Text>
//           </Pressable>
//         </Pressable>
//       </Pressable>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   backdrop: {
//     flex: 1,
//     backgroundColor: 'rgba(26, 6, 51, 0.55)',
//     justifyContent: 'flex-end',
//   },
//   sheet: {
//     borderTopLeftRadius: 28,
//     borderTopRightRadius: 28,
//     paddingTop: 12,
//     paddingHorizontal: 20,
//     shadowColor: '#000',
//     shadowOpacity: 0.22,
//     shadowRadius: 30,
//     shadowOffset: { width: 0, height: -8 },
//     elevation: 16,
//   },
//   grabber: {
//     width: 40,
//     height: 4,
//     borderRadius: 2,
//     backgroundColor: 'rgba(150, 150, 150, 0.3)',
//     alignSelf: 'center',
//     marginBottom: 16,
//   },
//   title: {
//     fontSize: 20,
//     fontWeight: '700',
//     textAlign: 'center',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 14,
//     textAlign: 'center',
//     marginBottom: 24,
//   },
//   optionsRow: {
//     flexDirection: 'row',
//     marginBottom: 24,
//   },
//   optionCard: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 28,
//     borderRadius: 20,
//     borderWidth: 1.5,
//     gap: 12,
//   },
//   optionIconWrap: {
//     width: 60,
//     height: 60,
//     borderRadius: 30,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   optionTitle: {
//     fontSize: 15,
//     fontWeight: '700',
//     textAlign: 'center',
//   },
//   optionDesc: {
//     fontSize: 13,
//     textAlign: 'center',
//   },
//   cancelBtn: {
//     paddingVertical: 14,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   cancelText: {
//     fontSize: 17,
//     fontWeight: '600',
//     color: colors.danger,
//   },
// });

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PhotoSource = 'camera' | 'gallery';

type Props = {
  visible: boolean;
  onSelect: (source: PhotoSource) => void;
  onCancel: () => void;
};

export default function PhotoSourceModal({
  visible,
  onSelect,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const { colors: th } = useTheme();
  const { bottom: safeBottom } = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: th.surface,
              paddingBottom: safeBottom + 16,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close button - top right of sheet */}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              {
                opacity: pressed ? 0.6 : 1,
              },
            ]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', 'Close')}
            hitSlop={8}
          >
            <Ionicons
              name="close"
              size={24}
              color={colors.danger}
            />
          </Pressable>

          {/* Grabber */}
          <View style={styles.grabber} />

          {/* Title */}
          <Text style={[styles.title, { color: th.text }]}>
            {t('photoSource.title', 'Add Photo')}
          </Text>

          {/* Options */}
          <View style={styles.optionsRow}>
            {/* Take Photo */}
            <View style={styles.optionHalf}>
              <Pressable
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    borderColor: th.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => onSelect('camera')}
                accessibilityRole="button"
                accessibilityLabel={t(
                  'photoSource.takePhoto',
                  'Take Photo',
                )}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionIconWrap}
                >
                  <Ionicons
                    name="camera"
                    size={28}
                    color="#FFFFFF"
                  />
                </LinearGradient>

                <Text
                  style={[
                    styles.optionTitle,
                    { color: th.text },
                  ]}
                >
                  {t('photoSource.takePhoto', 'Take Photo')}
                </Text>
              </Pressable>
            </View>

            {/* Gallery */}
            <View style={styles.optionHalf}>
              <Pressable
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    borderColor: th.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => onSelect('gallery')}
                accessibilityRole="button"
                accessibilityLabel={t(
                  'photoSource.chooseGallery',
                  'Choose from Gallery',
                )}
              >
                <View
                  style={[
                    styles.optionIconWrap,
                    {
                      backgroundColor:
                        colors.secondary + '18',
                    },
                  ]}
                >
                  <Ionicons
                    name="images"
                    size={28}
                    color={colors.secondary}
                  />
                </View>

                <Text
                  style={[
                    styles.optionTitle,
                    { color: th.text },
                  ]}
                >
                  {t('photoSource.chooseGallery', 'Gallery')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 6, 51, 0.55)',
    justifyContent: 'flex-end',
  },

  sheet: {
    position: 'relative',
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    elevation: 16,
  },

  closeButton: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 10,
  },

  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    alignSelf: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },

  optionsRow: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 4,
  },

  optionHalf: {
    width: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionCard: {
    width: '94%',
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRadius: 20,
    borderWidth: 1.5,
  },

  optionIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});