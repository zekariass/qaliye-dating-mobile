import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SupportAttachment } from '@/types/support';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function isImageAttachment(att: SupportAttachment): boolean {
  if (att.attachment_kind === 'IMAGE') return true;
  return att.content_type.startsWith('image/');
}

// ---------------------------------------------------------------------------
// Image attachment thumbnail (inline in chat bubble)
// ---------------------------------------------------------------------------

export function SupportImageAttachment({
  attachment,
  isOutgoing,
}: {
  attachment: SupportAttachment;
  isOutgoing: boolean;
}) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [modalVisible, setModalVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const uri = attachment.signed_url || attachment.download_url;
  if (!uri) return null;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        activeOpacity={0.9}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Image: ${attachment.file_name}`}
      >
        <View style={[styles.thumbnailWrap, { borderColor: isOutgoing ? 'rgba(255,255,255,0.2)' : isDark ? th.border : '#E4D9F7' }]}>
          {!loaded && !error && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={isOutgoing ? '#FFF' : colors.primary} />
            </View>
          )}
          {error ? (
            <View style={styles.errorOverlay}>
              <Text style={[styles.errorText, { color: isOutgoing ? '#FFD0D0' : colors.danger }]}>
                Failed to load image
              </Text>
            </View>
          ) : (
            <Image
              source={uri}
              style={styles.thumbnail}
              contentFit="cover"
              transition={150}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Full-screen modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setModalVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Close image"
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Image
            source={uri}
            style={styles.fullImage}
            contentFit="contain"
            transition={150}
          />
        </View>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  thumbnailWrap: {
    width: 200,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginTop: 6,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  modalCloseText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
