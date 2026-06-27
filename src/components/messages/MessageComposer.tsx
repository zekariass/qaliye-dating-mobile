import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Platform-safe shadows declared at module level to avoid TS overload mismatch
const inputShadow = Platform.select({
  ios: {
    shadowColor: '#8A2CFF' as const,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  default: {},
}) ?? {};

const sendBtnShadow = Platform.select({
  ios: {
    shadowColor: '#8A2CFF' as const,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  default: {},
}) ?? {};


// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MessageComposerProps {
  onSend: (text: string) => void;
  /** Bottom inset from useSafeAreaInsets; applied as padding below composer */
  bottomInset: number;
  /** Called on each text change — used for typing indicators */
  onTextChange?: (text: string) => void;
  /** Disable composer when thread is ended or access lost */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageComposer({
  onSend,
  bottomInset,
  onTextChange,
  disabled = false,
}: MessageComposerProps) {
  const { colors: th, mode } = useTheme();
  const isDark = mode === 'dark';
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const canSend = text.trim().length > 0 && !disabled;

  const handleTextChange = (value: string) => {
    setText(value);
    onTextChange?.(value);
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
    onTextChange?.('');
  };

  const inputBg = isDark ? th.surface : '#FFFFFF';
  const inputBorder = isDark ? th.border : '#E4D9F7';
  const placeholderColor = isDark ? '#6B6080' : '#B0A0CC';
  const textColor = th.text;
  const actionBorder = isDark ? '#5A3FA0' : '#C4AEF0';

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: isDark ? th.background : '#FAFAFA',
          paddingBottom: Math.max(bottomInset, spacing.sm),
          borderTopColor: isDark ? th.border : '#EEE6FF',
        },
      ]}
    >
      {/* Attachment button (left, outside input container) */}
      <TouchableOpacity
        style={[styles.circleBtn, { borderColor: actionBorder }]}
        onPress={() => console.log('Attachment pressed')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Add attachment"
      >
        <Ionicons name="add" size={22} color={colors.primary} />
      </TouchableOpacity>

      {/* Input row container */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBg,
            borderColor: inputBorder,
            ...(Platform.OS === 'android' ? { elevation: 2 } : inputShadow),
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: textColor }]}
          value={text}
          onChangeText={handleTextChange}
          editable={!disabled}
          placeholder="Type a message..."
          placeholderTextColor={placeholderColor}
          multiline
          maxLength={2000}
          returnKeyType="default"
          blurOnSubmit={false}
          accessibilityLabel="Message input"
          accessibilityHint="Type your message here"
        />

        {/* Emoji button (inside input container, right) */}
        <TouchableOpacity
          style={[styles.emojiBtn, { borderColor: actionBorder }]}
          onPress={() => console.log('Emoji picker pressed')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open emoji picker"
        >
          <Ionicons name="happy-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Send button (right, outside input container) */}
      <TouchableOpacity
        style={[
          styles.sendBtn,
          {
            backgroundColor: canSend ? colors.primary : (isDark ? '#3A2060' : '#DDD0F8'),
            ...(canSend
              ? Platform.OS === 'android'
                ? { elevation: 6 }
                : sendBtnShadow
              : {}),
          },
        ]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        accessibilityState={{ disabled: !canSend }}
      >
        <Ionicons
          name="send"
          size={18}
          color={canSend ? '#FFFFFF' : (isDark ? '#7A60A0' : '#B8A0E0')}
        />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CIRCLE_BTN_SIZE = 42;

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  circleBtn: {
    width: CIRCLE_BTN_SIZE,
    height: CIRCLE_BTN_SIZE,
    borderRadius: CIRCLE_BTN_SIZE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1.5,
    borderRadius: radius.xl,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 44,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    paddingTop: Platform.OS === 'ios' ? 4 : 2,
    paddingBottom: Platform.OS === 'ios' ? 4 : 2,
    maxHeight: 108,
  },
  emojiBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 1,
    flexShrink: 0,
  },
  sendBtn: {
    width: CIRCLE_BTN_SIZE,
    height: CIRCLE_BTN_SIZE,
    borderRadius: CIRCLE_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
