import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MAX_CHARS = 500;

export interface SuperMessageTarget {
  userId: string;
  displayName: string;
  photoUrl?: string | null;
}

interface Props {
  visible: boolean;
  target: SuperMessageTarget | null;
  isSending: boolean;
  onSend: (targetUserId: string, message: string) => void;
  onClose: () => void;
}

export default function SuperMessageModal({
  visible,
  target,
  isSending,
  onSend,
  onClose,
}: Props) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const inputRef = useRef<TextInput>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible) {
      setMessage('');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible]);

  const handleSend = useCallback(() => {
    if (!target || !message.trim() || isSending) return;
    onSend(target.userId, message.trim());
  }, [target, message, isSending, onSend]);

  const remaining = MAX_CHARS - message.length;
  const overLimit = remaining < 0;
  const canSend = message.trim().length > 0 && !overLimit && !isSending;

  if (!target) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { backgroundColor: isDark ? th.surface : '#FFFFFF' }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? '#4B3B7A' : '#DDD5F5' }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.targetInfo}>
              {target.photoUrl ? (
                <Image
                  source={{ uri: target.photoUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: isDark ? '#3D2A6E' : '#EDE0FF' }]}>
                  <Ionicons name="person" size={22} color={colors.primary} />
                </View>
              )}
              <View style={styles.targetText}>
                <View style={styles.titleRow}>
                  <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#1A1A2E' }]}>
                    Before Match Message
                  </Text>
                </View>
                <Text style={[styles.targetName, { color: th.textSecondary }]} numberOfLines={1}>
                  to {target.displayName}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={th.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Info pill */}
          <View style={[styles.infoPill, { backgroundColor: isDark ? '#2E1A5A' : '#F3EEFF' }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              You can send one message to a user before matching.
            </Text>
          </View>

          {/* Text input */}
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1E1438' : '#F8F3FF',
                color: isDark ? '#FFFFFF' : '#1A1A2E',
                borderColor: overLimit
                  ? colors.danger
                  : isDark
                  ? '#4B3B7A'
                  : '#E0D4FB',
              },
            ]}
            placeholder={`Write a heartfelt message to ${target.displayName}…`}
            placeholderTextColor={isDark ? '#7C6EA0' : '#A89AC8'}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={MAX_CHARS + 20}
            textAlignVertical="top"
            returnKeyType="default"
            editable={!isSending}
          />

          {/* Footer: char count + send */}
          <View style={styles.footer}>
            <Text
              style={[
                styles.charCount,
                { color: overLimit ? colors.danger : isDark ? '#7C6EA0' : '#A89AC8' },
              ]}
            >
              {remaining}
            </Text>
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: canSend ? colors.primary : isDark ? '#3D2A6E' : '#D4C3F7' },
              ]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.8}
              accessibilityLabel="Send super message"
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="star" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.sendText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
    }),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  targetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  targetName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginTop: 1,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSize.sm,
    lineHeight: 21,
    minHeight: 110,
    maxHeight: 180,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
