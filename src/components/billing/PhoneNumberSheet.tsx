import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { getCachedPaymentPhone, isValidEthiopianPhone, sanitizePhone } from '@/utils/paymentPhone';

type Props = {
  visible: boolean;
  onConfirm: (phone: string) => void;
  onDismiss: () => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  secondaryColor: string;
  backgroundColor: string;
};

export function PhoneNumberSheet({
  visible,
  onConfirm,
  onDismiss,
  isSubmitting = false,
  errorMessage = null,
  surfaceColor,
  borderColor,
  textColor,
  secondaryColor,
  backgroundColor,
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const [phone, setPhone] = useState('0');
  const [touched, setTouched] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setTouched(false);
    getCachedPaymentPhone().then((cached) => {
      setPhone(cached && isValidEthiopianPhone(cached) ? cached : '0');
    });
  }, [visible]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const showSubAndroid = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    const hideSubAndroid = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      showSubAndroid.remove();
      hideSub.remove();
      hideSubAndroid.remove();
    };
  }, []);

  const sanitized = sanitizePhone(phone);
  const isValid = isValidEthiopianPhone(sanitized);
  const showError = touched && !isValid && !isSubmitting;
  const canSubmit = isValid && !isSubmitting;

  const handleContinue = () => {
    if (!canSubmit) return;
    onConfirm(sanitized);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss} />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: surfaceColor,
            paddingBottom: bottom + 16,
            transform: [{ translateY: -keyboardHeight }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: borderColor }]} />

        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.title, { color: textColor }]}>Phone Number</Text>
            <Text style={[styles.subtitle, { color: secondaryColor }]}>
              Enter your phone number to receive a payment prompt
            </Text>
          </View>
          <Pressable
            style={[styles.closeBtn, { backgroundColor }]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={18} color={textColor} />
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <View style={[styles.inputContainer, { borderColor: showError || errorMessage ? colors.danger : borderColor, backgroundColor }]}>
            <Ionicons name="call-outline" size={20} color={secondaryColor} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textColor }]}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder="09XXXXXXXXX"
              placeholderTextColor={secondaryColor}
              keyboardType="numeric"
              maxLength={13}
              editable={!isSubmitting}
              accessibilityLabel="Phone number"
            />
          </View>

          {(showError || errorMessage) && (
            <Text style={styles.helperText}>
              {errorMessage ?? 'Please enter a valid Ethiopian phone number starting with 09'}
            </Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.cancelBtn, { borderColor, backgroundColor }]}
            onPress={onDismiss}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Text style={[styles.cancelBtnText, { color: textColor }]}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.continueBtn, !canSubmit && styles.continueBtnDisabled]}
            onPress={handleContinue}
            disabled={!canSubmit}
            accessibilityRole="button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.continueBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  title: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  inputWrap: { marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 56,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  helperText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  continueBtn: {
    flex: 1.5,
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnDisabled: { opacity: 0.4 },
  continueBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
